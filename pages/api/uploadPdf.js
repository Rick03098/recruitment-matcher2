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
    '金融建模', '投资分析', 'Excel', 'PPT', 'Wind',
    'Figma', '产品原型', '信息架构', 'Tableau', 'R'
  ];
  
  return commonSkills.filter(skill => 
    text.toLowerCase().includes(skill.toLowerCase())
  );
}

// 提取职位名称
function extractTitle(text) {
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

// 解析简历内容
function parseResumeContent(text) {
  // 提取关键信息
  const skills = extractSkills(text);
  const title = extractTitle(text);
  const experience = extractExperience(text);
  const education = extractEducation(text);
  
  return {
    skills,
    title,
    experience,
    education,
    // 包含部分原始文本用于预览
    rawText: text.substring(0, 1000)
  };
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
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });
    
    // 解析表单
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });
    
    const uploadedFile = files.file;
    if (!uploadedFile) {
      return res.status(400).json({ success: false, message: '没有找到上传的文件' });
    }
    
    // 处理单个PDF文件
    const filePath = uploadedFile.filepath;
    const fileType = uploadedFile.mimetype;
    
    // 根据文件类型处理
    let resumeText = '';
    if (fileType === 'application/pdf') {
      resumeText = await extractTextFromPdf(filePath);
    } else if (fileType === 'text/plain') {
      resumeText = fs.readFileSync(filePath, 'utf8');
    } else {
      // 对于其他文件类型，返回错误
      fs.unlinkSync(filePath); // 删除临时文件
      return res.status(400).json({ success: false, message: '不支持的文件类型，仅支持PDF和TXT文件' });
    }
    
    // 解析简历内容
    const parsedData = parseResumeContent(resumeText);
    
    // 删除临时文件
    fs.unlinkSync(filePath);
    
    // 返回解析结果
    return res.status(200).json({
      success: true,
      message: '文件上传并解析成功',
      file: {
        name: uploadedFile.originalFilename,
        size: uploadedFile.size,
        type: fileType
      },
      parsedData
    });
  } catch (error) {
    console.error('处理上传文件错误:', error);
    return res.status(500).json({
      success: false,
      message: '文件处理失败: ' + error.message
    });
  }
}
