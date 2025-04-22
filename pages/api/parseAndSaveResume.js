import Airtable from 'airtable';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '只支持POST请求' });
  }

  try {
    const { name, resumeText } = req.body;
    
    // 验证数据
    if (!name || !resumeText) {
      return res.status(400).json({ success: false, message: '姓名和简历内容不能为空' });
    }
    
    // 解析简历内容
    const parsedData = parseResumeContent(resumeText);
    
    try {
      // 尝试保存到Airtable
      const airtableRecord = await saveToAirtable({
        ...parsedData,
        name: name || parsedData.name
      }, '手动输入');
      
      // 返回成功响应（包含Airtable记录信息）
      return res.status(200).json({
        success: true,
        message: '简历已成功添加到简历库',
        data: {
          name,
          skills: parsedData.skills.join(', ') || '无识别技能',
          experience: parsedData.experience || '未检测到',
          education: parsedData.education || '未检测到'
        },
        airtableRecord
      });
    } catch (airtableError) {
      console.error('Airtable保存错误:', airtableError);
      
      // 即使Airtable保存失败，也返回解析结果
      return res.status(200).json({
        success: true,
        message: '简历已成功解析，但保存到Airtable失败: ' + airtableError.message,
        data: {
          name,
          skills: parsedData.skills.join(', ') || '无识别技能',
          experience: parsedData.experience || '未检测到',
          education: parsedData.education || '未检测到'
        },
        parsedData
      });
    }
  } catch (error) {
    // 确保错误信息也是有效的JSON
    console.error('处理简历时出错:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message || '未知错误'
    });
  }
}

// 解析简历内容
function parseResumeContent(text) {
  try {
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
  } catch (error) {
    console.error('解析简历内容出错:', error);
    // 返回一个空对象，避免完全失败
    return {
      name: '',
      title: '',
      skills: [],
      experience: '',
      education: '',
      contact: '',
      rawText: text.substring(0, 1000)
    };
  }
}

// 其他提取函数保持不变...
function extractName(text) {
  try {
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
  } catch (error) {
    console.error('提取名字出错:', error);
    return '未检测到';
  }
}

// 其他提取函数也添加try/catch...

// 将解析结果保存到Airtable
async function saveToAirtable(resumeData, source) {
  // 配置Airtable
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME;
  
  if (!apiKey) {
    throw new Error('缺少AIRTABLE_API_KEY环境变量');
  }
  
  if (!baseId) {
    throw new Error('缺少AIRTABLE_BASE_ID环境变量');
  }
  
  if (!tableName) {
    throw new Error('缺少AIRTABLE_TABLE_NAME环境变量');
  }
  
  try {
    const base = new Airtable({ apiKey }).base(baseId);
    
    // 准备Airtable记录数据
    const recordData = {
      "Name": resumeData.name || '未检测到姓名',
      "Title": resumeData.title || '未检测到职位',
      "Skills": resumeData.skills || [],
      "Experience": resumeData.experience || '未检测到',
      "Education": resumeData.education || '未检测到',
      "Contact": resumeData.contact || '未检测到',
      "Source": source || '手动输入',
      "Upload Date": new Date().toISOString()
    };
    
    // 创建记录
    const records = await base(tableName).create([
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
    throw new Error('保存到Airtable失败: ' + (error.message || '未知错误'));
  }
}

// 从文本中提取技能 - 保持其他提取函数不变
function extractSkills(text) {
  try {
    const commonSkills = [
      'JavaScript', 'React', 'Vue', 'Angular', 'Node.js', 'TypeScript',
      // 其他技能保持不变...
    ];
    
    return commonSkills.filter(skill => 
      text.toLowerCase().includes(skill.toLowerCase())
    );
  } catch (error) {
    console.error('提取技能出错:', error);
    return [];
  }
}

// 其他提取函数也需要添加错误处理...
