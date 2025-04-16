import { OpenAI } from 'openai';
import Airtable from 'airtable';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '只支持POST请求' });
  }

  try {
    const { name, resumeText } = req.body;

    if (!name || !resumeText) {
      return res.status(400).json({ message: '姓名和简历内容不能为空' });
    }

    // 使用OpenAI分析简历
    const resumeData = await analyzeResumeWithAI(resumeText, name);

    // 保存到Airtable
    const airtableRecord = await saveToAirtable(resumeData);

    return res.status(200).json({
      message: '简历解析成功',
      ...resumeData,
      airtableId: airtableRecord.id
    });
  } catch (error) {
    console.error('简历解析失败:', error);
    return res.status(500).json({ message: '简历解析失败: ' + error.message });
  }
}

// 使用OpenAI分析简历
async function analyzeResumeWithAI(resumeText, name) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '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',
    });

    const promptText = `
    请分析以下简历内容，提取关键信息并以JSON格式返回。名字已提供，请勿从简历中提取。

    姓名: ${name}

    简历内容:
    ${resumeText.substring(0, 4000)} // 限制文本长度以适应API限制

    请提取以下信息并以JSON格式返回:
    1. 候选人的职位或职称
    2. 技能列表（以逗号分隔）
    3. 工作经验年数
    4. 教育背景/学历

    返回JSON格式:
    {
      "name": "${name}",
      "title": "职位名称",
      "skills": "技能1, 技能2, 技能3, ...",
      "experience": "X年",
      "education": "最高学历"
    }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "你是一个专业的HR助手，擅长解析简历并提取关键信息。" },
        { role: "user", content: promptText }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return {
      name: result.name,
      title: result.title || '未指定',
      skills: result.skills || '',
      experience: result.experience || '未指定',
      education: result.education || '未指定',
      resumeText: resumeText.substring(0, 1000) // 保存部分简历文本用于参考
    };
  } catch (error) {
    console.error('OpenAI API调用失败:', error);
    // 返回基本信息，防止整个过程失败
    return {
      name: name,
      title: '未能提取',
      skills: '',
      experience: '未能提取',
      education: '未能提取',
      resumeText: resumeText.substring(0, 1000)
    };
  }
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
