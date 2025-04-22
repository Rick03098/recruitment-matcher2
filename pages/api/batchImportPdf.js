import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

// 禁用默认的bodyParser，以便我们可以使用formidable解析form数据
export const config = {
  api: {
    bodyParser: false,
  },
};

// 解析简历内容 (简化版本，与uploadPdf.js中相同)
function parseResumeContent(text) {
  const skills = extractSkills(text);
  const title = extractJobTitle(text);
  const experience = extractExperience(text);
  const education = extractEducation(text);
  
  return {
    skills,
    title,
    experience,
    education
  };
}

// 从PDF中提取技能
function extractSkills(text) {
  const commonSkills = [
    'JavaScript', 'React', 'Vue', 'Angular', 'Node.js', 'TypeScript',
    'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Swift',
    'HTML', 'CSS', 'SASS', 'Bootstrap', 'Tailwind',
    'MongoDB', 'MySQL', 'PostgreSQL', 'SQL', 'NoSQL', 'Redis',
    'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git',
    'Linux', 'Windows', 'MacOS', 'Android', 'iOS',
    '前端', '后端', '全栈', '开发', '测试', 'UI', 'UX',
    '数据分析', '机器学习', '人工智能', 'AI', '算法', '数据结构',
    '市场营销', '用户增长', '内容运营', '社交媒体',
    'Figma', '产品原型', '信息架构', 'Tableau', 'R'
  ];
  
  return commonSkills.filter(skill => 
    text.toLowerCase().includes(skill.toLowerCase())
  );
}

// 提取职位名称
function extractJobTitle(text) {
  const commonTitles = [
    '前端开发工程师', '后端开发工程师', '全栈开发工程师',
    '软件工程师', '产品经理', 'UI设计师', 'UX设计师',
    '数据分析师', '人工智能工程师', '机器学习工程师',
    '测试工程师', '运维工程师', '项目经理',
    '内容运营', '市场营销', '用户研究', '产品设计'
  ];
  
  for (const title of commonTitles) {
    if (text.includes(title)) {
      return title;
    }
  }
  
  return '开发工程师';
}

// 提取经验年数
function extractExperience(text) {
  const expMatch = text.match(/(\d+)\s*年.*经验/);
  if (expMatch) {
    return `${expMatch[1]}年`;
  }
  return '未检测到';
}

// 提取教育信息
function extractEducation(text) {
  const eduLevels = ['博士', '硕士', '本科', '大专', '高中'];
  
  for (const level of eduLevels) {
    if (text.includes(level)) {
      return level;
    }
  }
  
  return '未检测到';
}

// 从PDF文件中提取内容
async function extractTextFromPdf(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF解析错误:', error);
    throw new Error('PDF解析失败');
  }
}

// 尝试从文件名中提取姓名
function extractNameFromFilename(filename) {
  // 移除扩展名
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  
  // 如果文件名像是"张三的简历"或"简历-李四"格式
  const nameMatch = nameWithoutExt.match(/(.*?)的?简历|简历[-_\s]+(.*)/);
  if (nameMatch) {
    return (nameMatch[1] || nameMatch[2]).trim();
  }
  
  // 否则直接返回文件名作为姓名
  return nameWithoutExt;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '只支持POST请求' });
  }

  try {
    // 创建临时目录（如果不存在）
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // 配置formidable解析上传文件
    const form = new formidable.IncomingForm({
      uploadDir: tempDir,
      keepExtensions: true,
      maxFileSize: 20 * 1024 * 1024, // 20MB
      multiples: true, // 允许多文件上传
    });
    
    // 解析表单
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });
    
    // 处理多个文件
    const uploadedFiles = files.files;
    if (!uploadedFiles) {
      return res.status(400).json({ success: false, message: '没有找到上传的文件' });
    }
    
    // 确保uploadedFiles是数组
    const filesArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    
    if (filesArray.length === 0) {
      return res.status(400).json({ success: false, message: '没有找到上传的文件' });
    }
    
    // 处理每个文件
    const results = [];
    const errors = [];
    
    for (const uploadedFile of filesArray) {
      try {
        const filePath = uploadedFile.filepath;
        const fileType = uploadedFile.mimetype;
        const fileName = uploadedFile.originalFilename;
        
        // 只处理PDF文件
        if (fileType !== 'application/pdf') {
          errors.push(`${fileName}: 不支持的文件类型，仅支持PDF`);
          // 删除非PDF文件
          fs.unlinkSync(filePath);
          continue;
        }
        
        // 从PDF中提取文本
        const resumeText = await extractTextFromPdf(filePath);
        
        // 解析简历内容
        const parsedData = parseResumeContent(resumeText);
        
        // 尝试从文件名中提取姓名
        const name = extractNameFromFilename(fileName);
        
        // 将解析结果添加到数组
        results.push({
          file: {
            name: fileName,
            size: uploadedFile.size,
            type: fileType
          },
          candidate: {
            name,
            ...parsedData
          }
        });
        
        // 删除临时文件
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error(`处理文件 ${uploadedFile.originalFilename} 时出错:`, error);
        errors.push(`${uploadedFile.originalFilename}: ${error.message}`);
        
        // 删除发生错误的文件
        if (fs.existsSync(uploadedFile.filepath)) {
          fs.unlinkSync(uploadedFile.filepath);
        }
      }
    }
    
    // 返回结果
    return res.status(200).json({
      success: true,
      message: `成功解析 ${results.length} 个简历文件${errors.length > 0 ? `，${errors.length} 个文件处理失败` : ''}`,
      results,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    console.error('批量处理简历文件错误:', error);
    return res.status(500).json({
      success: false,
      message: '批量文件处理失败: ' + error.message
    });
  }
}
