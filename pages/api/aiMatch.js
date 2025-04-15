import { OpenAI } from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '只支持POST请求' });
  }

  const { jobDescription, resumes } = req.body;

  if (!jobDescription || !resumes || !Array.isArray(resumes)) {
    return res.status(400).json({ message: '无效的请求数据' });
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // 提取职位要求
    const jobRequirementsResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system", 
          content: "你是一个专业的招聘分析专家。请从职位描述中提取关键技能和要求，格式为JSON。"
        },
        {
          role: "user",
          content: `从以下职位描述中提取关键技能、经验要求和学历要求，以JSON格式返回。请确保返回的是有效JSON，格式为：
          {
            "skills": ["技能1", "技能2", ...],
            "experience": "经验要求描述",
            "education": "学历要求描述", 
            "jobTitle": "职位名称",
            "responsibilities": ["职责1", "职责2", ...]
          }
          
          职位描述：${jobDescription}`
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const jobRequirements = JSON.parse(jobRequirementsResponse.choices[0].message.content);
    
    // 对每份简历评分
    const matchResults = [];
    
    // 为了提高效率，我们可以并行处理所有简历
    await Promise.all(resumes.map(async (resume, index) => {
      // 构建简历摘要
      const resumeSummary = `
        姓名: ${resume.name}
        职位: ${resume.title}
        技能: ${resume.skills.join(', ')}
        经验: ${resume.experience}
        学历: ${resume.education}
        ${resume.resumeText ? `简历内容: ${resume.resumeText}` : ''}
      `;
      
      // 使用OpenAI评估匹配度
      const matchResponse = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "你是一个专业的招聘匹配专家。请分析职位要求和候选人简历的匹配程度。"
          },
          {
            role: "user",
            content: `
              请分析以下职位要求与候选人简历的匹配程度，并以JSON格式返回评分和分析。
              
              职位要求:
              - 职位: ${jobRequirements.jobTitle || '未指定'}
              - 技能要求: ${jobRequirements.skills.join(', ')}
              - 经验要求: ${jobRequirements.experience || '未指定'}
              - 学历要求: ${jobRequirements.education || '未指定'}
              
              候选人简历:
              ${resumeSummary}
              
              请以JSON格式返回评分和分析，格式为:
              {
                "totalScore": 0-100之间的整数,
                "skillsScore": 0-100之间的整数,
                "experienceScore": 0-100之间的整数,
                "educationScore": 0-100之间的整数,
                "matchedSkills": ["匹配的技能1", "匹配的技能2", ...],
                "missingSkills": ["缺失的技能1", "缺失的技能2", ...],
                "analysis": "简短的匹配分析",
                "recommendation": "是否推荐这位候选人"
              }
              
              请确保返回的是有效JSON。
            `
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });
      
      const matchAnalysis = JSON.parse(matchResponse.choices[0].message.content);
      
      // 添加结果到数组
      matchResults.push({
        ...resume,
        matchScore: matchAnalysis.totalScore,
        matchDetails: matchAnalysis
      });
    }));
    
    // 按分数排序
    const sortedMatches = matchResults.sort((a, b) => b.matchScore - a.matchScore);
    
    return res.status(200).json({ 
      matches: sortedMatches,
      jobRequirements
    });
  } catch (error) {
    console.error('Error in AI matching:', error);
    return res.status(500).json({ error: 'AI匹配过程中出错' });
  }
}
