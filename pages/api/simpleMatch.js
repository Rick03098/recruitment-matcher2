export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '只支持POST请求' });
  }

  const { jobDescription, resumes = [] } = req.body;

  if (!jobDescription) {
    return res.status(400).json({ message: '职位描述不能为空' });
  }

  try {
    // 简单的关键词匹配算法
    const keywords = jobDescription.toLowerCase().split(/\s+/);
    
    // 计算匹配度
    const matches = resumes.map(resume => {
      // 计算技能匹配
      const skills = resume.skills || [];
      const matchedSkills = skills.filter(skill => 
        keywords.some(keyword => 
          skill.toLowerCase().includes(keyword) || 
          keyword.includes(skill.toLowerCase())
        )
      );
      
      const skillScore = skills.length > 0 ? (matchedSkills.length / skills.length) * 100 : 0;
      
      // 最终得分
      const matchScore = Math.round(skillScore);
      
      return {
        ...resume,
        matchScore,
        matchDetails: {
          skillsScore: skillScore,
          experienceScore: 70, // 默认经验分数
          educationScore: 80, // 默认教育分数
          matchedSkills,
          missingSkills: skills.filter(skill => !matchedSkills.includes(skill)),
          analysis: `候选人${resume.name}的技能匹配度为${Math.round(skillScore)}%`,
          recommendation: matchScore >= 70 ? '建议考虑此候选人' : '可能需要寻找更合适的候选人'
        }
      };
    });
    
    // 按匹配度排序
    const sortedMatches = matches.sort((a, b) => b.matchScore - a.matchScore);
    
    // 模拟职位要求
    const jobRequirements = {
      jobTitle: '根据描述提取的职位',
      skills: keywords.filter(k => k.length > 2), // 简单过滤
      experience: '未指定',
      education: '未指定'
    };
    
    return res.status(200).json({
      matches: sortedMatches,
      jobRequirements
    });
  } catch (error) {
    console.error('匹配过程出错:', error);
    return res.status(500).json({ error: '匹配过程出错' });
  }
}
