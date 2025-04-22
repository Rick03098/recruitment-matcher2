import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import Airtable from 'airtable';

// 禁用默认的bodyParser，以便使用formidable解析form数据
export const config = {
  api: {
    bodyParser: false,
  },
};

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
        if (!parsedData.name || parsedData.name === '未检测到') {
          parsedData.name = name;
        }
        
        // 保存到Airtable
        const airtableRecord = await saveToAirtable({
          ...parsedData,
          name: parsedData.name || name
        }, fileName);
        
        // 将解析结果添加到数组
        results.push({
          file: {
            name: fileName,
            size: uploadedFile.size,
            type: fileType
          },
          candidate: {
            name: parsedData.name || name,
            title: parsedData.title,
            skills: parsedData.skills,
            experience: parsedData.experience,
            education: parsedData.education,
            contact: parsedData.contact
          },
          airtableId: airtableRecord.id
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
      message: `成功解析并保存 ${results.length} 个简历文件${errors.length > 0 ? `，${errors.length} 个文件处理失败` : ''}`,
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

// 下面是相同的辅助函数，与上面定义的一致（注意：在实际使用中，你可能想把这些函数抽取到一个单独的工具模块中以避免代码重复）
async function extractTextFromPdf(filePath) {
  // 与上面的函数相同
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF解析错误:', error);
    throw new Error('PDF解析失败');
  }
}

function parseResumeContent(text) {
  // 提取关键信息
  const skills = extractSkills(text);
  const title = extractTitle(text);
  const experience = extractExperience(text);
  const education = extractEducation(text);
  const name = extractName(text);
  const contact = extractContact(text);
  
  return {
    name,
    title,
    skills,
    experience,
    education,
    contact,
    // 包含部分原始文本用于预览
    rawText: text.substring(0, 1000)
  };
}

// 其余辅助函数与上面相同...
function extractName(text) {
  // 简单的名字提取规则，可根据简历常见格式调整
  const nameMatch = text.match(/(姓\s*名|名\s*字)\s*[：:]\s*([^\n\r,，.。、]+)/);
  if (nameMatch && nameMatch[2]) {
    return nameMatch[2].trim();
  }
  
  // 尝试从文本开头提取名字
  const lines = text.split('\n');
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    if (line && line.length < 10 && !line.includes('简历') && !line.includes('个人')) {
      return line;
    }
  }
  
  return '未检测到';
}

function extractContact(text) {
  const contacts = [];
  
  // 提取手机号
  const phoneMatch = text.match(/(\d{11})|(\d{3}[-\s]?\d{4}[-\s]?\d{4})/);
  if (phoneMatch) {
    contacts.push('电话: ' + phoneMatch[0]);
  }
  
  // 提取邮箱
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch) {
    contacts.push('邮箱: ' + emailMatch[0]);
  }
  
  return contacts.join(', ') || '未检测到';
}

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

function extractExperience(text) {
  const expMatch = text.match(/(\d+)\s*年.*经验/);
  if (expMatch) {
    return `${expMatch[1]}年`;
  }
  return '未检测到';
}

function extractEducation(text) {
  const eduLevels = ['博士', '硕士', '本科', '大专', '高中'];
  const schools = ['大学', '学院', '学校'];
  
  for (const level of eduLevels) {
    if (text.includes(level)) {
      // 尝试匹配学校名称
      for (const schoolType of schools) {
        const regex = new RegExp(`([^\\s,，.。、]{2,15}${schoolType})`, 'g');
        const matches = text.match(regex);
        if (matches && matches.length > 0) {
          return `${level} - ${matches[0]}`;
        }
      }
      return level;
    }
  }
  
  return '未检测到';
}

async function saveToAirtable(resumeData, fileName) {
  try {
    // 配置Airtable
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_TABLE_NAME;
    
    if (!apiKey || !baseId || !tableName) {
      console.warn('Airtable配置缺失，使用环境变量中的默认值');
    }
    
    const base = new Airtable({ 
      apiKey: apiKey || 'patCOFt5DYSAv73VI.a27ea50b39361b388fe941cd6b562518a08f7943631c2deddd479a8bb1ba6d38'
    }).base(baseId || 'appYPoERDFlNulJgi');
    
    const table = tableName || 'tblQbhrbMuzqpXfZP';
    
    // 准备Airtable记录数据
    const recordData = {
      "Name": resumeData.name || '未检测到姓名',
      "Title": resumeData.title || '未检测到职位',
      "Skills": resumeData.skills || [],
      "Experience": resumeData.experience || '未检测到',
      "Education": resumeData.education || '未检测到',
      "Contact": resumeData.contact || '未检测到',
      "Source": fileName || '上传简历',
      "Upload Date": new Date().toISOString()
    };
    
    // 创建记录
    const records = await base(table).create([
      { fields: recordData }
    ]);
    
    if (!records || records.length === 0) {
      throw new Error('Airtable记录创建失败');
    }
    
    return {
      id: records[0].id,
      ...recordData
    };
  } catch (error) {
    console.error('Airtable保存错误:', error);
    throw new Error('保存到Airtable失败: ' + error.message);
  }
}
