import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import Airtable from 'airtable';

// 禁用默认的bodyParser，因为我们将使用formidable处理表单数据
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '只支持POST请求' });
  }

  try {
    // 使用formidable解析表单数据
    const form = new IncomingForm({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 限制文件大小为10MB
    });
    

    // 解析表单
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });

    // 获取姓名和文件
    const name = fields.name?.[0] || '';
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ message: '没有接收到文件' });
    }

    // 读取文件内容
    const filePath = file.filepath;
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // 提取简历中的关键信息
    const extractedInfo = await extractResumeInfo(fileContent, file.originalFilename);

    // 将数据保存到Airtable
    const airtableData = await saveToAirtable({
      name,
      ...extractedInfo
    });

    // 返回解析结果
    return res.status(200).json({
      message: '简历解析成功',
      ...extractedInfo,
      airtableId: airtableData.id
    });
  } catch (error) {
    console.error('简历解析失败:', error);
    return res.status(500).json({ message: '简历解析失败: ' + error.message });
  }
}

// 简历信息提取函数
async function extractResumeInfo(content, filename) {
  // 这里使用一个简单的关键词匹配方法
  // 在实际应用中，您可能想使用更复杂的NLP库或AI服务
  
  const skills = extractSkills(content);
  
  // 尝试提取可能的职位信息
  const title = extractTitle(content);
  
  // 尝试提取经验
  const experience = extractExperience(content);
  
  // 尝试提取教育
  const education = extractEducation(content);
  
  return {
    skills: skills.join(', '),
    title,
    experience,
    education,
    resumeText: content.substring(0, 1000) // 存储部分文本用于后续分析
  };
}

// 提取技能
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
    'Figma', '产品原型', '信息架构', 'LeetCode', 'Tableau', 'R', '用户研究'
  ];
  
  return commonSkills.filter(skill => 
    text.toLowerCase().includes(skill.toLowerCase())
  );
}

// 提取可能的职位名称
function extractTitle(text) {
  const commonTitles = [
    '前端开发工程师', '后端开发工程师', '全栈开发工程师',
    '软件工程师', '产品经理', 'UI设计师', 'UX设计师',
    '数据分析师', '人工智能工程师', '机器学习工程师',
    '测试工程师', '运维工程师', '项目经理',
    '内容运营', '市场营销', '用户研究', '产品设计'
  ];
  
  for (const title of commonTitles) {
    if (text.toLowerCase().includes(title.toLowerCase())) {
      return title;
    }
  }
  
  return '未指定';
}

// 提取经验年数
function extractExperience(text) {
  const expMatch = text.match(/(\d+)\s*年.*经验/);
  if (expMatch) {
    return `${expMatch[1]}年`;
  }
  return '未指定';
}

// 提取教育信息
function extractEducation(text) {
  const eduLevels = ['博士', '硕士', '本科', '大专', '高中'];
  
  for (const level of eduLevels) {
    if (text.includes(level)) {
      return level;
    }
  }
  
  return '未指定';
}

// 保存到Airtable
async function saveToAirtable(data) {
  const apiKey = process.env.AIRTABLE_API_KEY || 'patCOFt5DYSAv73VI.a27ea50b39361b388fe941cd6b562518a08f7943631c2deddd479a8bb1ba6d38';
  const baseId = process.env.AIRTABLE_BASE_ID || 'appYPoERDFlNulJgi';
  const tableName = process.env.AIRTABLE_TABLE_NAME || 'tblQbhrbMuzqpXfZP';
  
  const base = new Airtable({ apiKey }).base(baseId);
  
  return new Promise((resolve, reject) => {
    base(tableName).create([
      {
        fields: {
          'Name': data.name,
          'Skills': data.skills,
          'Title': data.title,
          'Experience': data.experience,
          'Education': data.education,
          'ResumeText': data.resumeText
        }
      }
    ], function(err, records) {
      if (err) {
        console.error('Airtable错误:', err);
        return reject(err);
      }
      resolve(records[0]);
    });
  });
}
