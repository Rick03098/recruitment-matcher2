export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '只支持POST请求' });
  }

  const { jobDescription, resumes = [] } = req.body;

  if (!jobDescription) {
    return res.status(400).json({ message: '职位描述不能为空' });
  }

  if (resumes.length === 0) {
    return res.status(400).json({ message: '无简历数据进行匹配' });
  }

  try {
    // 从JD中提取关键词
    const keywords = extractKeywords(jobDescription);
    
    // 提取经验和学历要求
    const experienceReq = extractExperienceRequirement(jobDescription);
    const educationReq = extractEducationRequirement(jobDescription);
    
    // 计算匹配度
    const matches = resumes.map(resume => {
      // 技能匹配
      const skills = resume.skills || [];
      const matchedSkills = skills.filter(skill => 
        keywords.some(keyword => 
          skill.toLowerCase().includes(keyword.toLowerCase()) || 
          keyword.toLowerCase().includes(skill.toLowerCase())
        )
      );
      
      const skillScore = skills.length > 0 ? (matchedSkills.length / keywords.length) * 100 : 0;
      
      // 经验匹配
      let expScore = 70; // 默认分数
      if (experienceReq && resume.experience) {
        const resumeYears = extractYearsFromExperience(resume.experience);
        const requiredYears = extractYearsFromExperience(experienceReq);
        
        if (resumeYears >= requiredYears) {
          expScore = 100;
        } else if (resumeYears >= requiredYears * 0.7) {
          expScore = 80;
        } else {
          expScore = 50;
        }
      }
      
      // 学历匹配
      let eduScore = 70; // 默认分数
      if (educationReq && resume.education) {
        const eduMatch = compareEducationLevels(resume.education, educationReq);
        eduScore = eduMatch ? 100 : 60;
      }
      
      // 总分计算: 技能占60%，经验占25%，学历占15%
      const matchScore = Math.round(skillScore * 0.6 + expScore * 0.25 + eduScore * 0.15);
      
      // 生成匹配分析
      const analysis = generateAnalysis(resume.name, skillScore, matchedSkills, skills);
      
      // 生成推荐建议
      const recommendation = matchScore >= 70 
        ? '建议进一步考虑此候选人' 
        : matchScore >= 50 
          ? '可作为备选人才' 
          : '不太适合当前职位';
      
      return {
        ...resume,
        matchScore,
        matchDetails: {
          skillsScore: Math.round(skillScore),
          experienceScore: expScore,
          educationScore: eduScore,
          matchedSkills,
          missingSkills: skills.filter(skill => !matchedSkills.includes(skill)),
          analysis,
          recommendation
        }
      };
    });
    
    // 按匹配度排序
    const sortedMatches = matches.sort((a, b) => b.matchScore - a.matchScore);
    
    // 职位要求
    const jobRequirements = {
      jobTitle: extractJobTitle(jobDescription),
      skills: keywords,
      experience: experienceReq || '未指定',
      education: educationReq || '未指定'
    };
    
    return res.status(200).json({
      matches: sortedMatches,
      jobRequirements
    });
  } catch (error) {
    console.error('匹配过程出错:', error);
    return res.status(500).json({ error: '匹配过程出错: ' + error.message });
  }
}

// 提取关键词
function extractKeywords(text) {
  const commonTechKeywords = [
    'JavaScript', 'React', 'Vue', 'Angular', 'Node.js', 'TypeScript',
    'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Swift',
    'HTML', 'CSS', 'SASS', 'LESS', 'Bootstrap', 'Tailwind',
    'MongoDB', 'MySQL', 'PostgreSQL', 'SQL', 'NoSQL', 'Redis',
    'AWS', 'Azure', 'Docker', 'Kubernetes', 'CI/CD', 'Git',
    'Linux', 'Windows', 'MacOS', 'Android', 'iOS',
    '前端', '后端', '全栈', '开发', '测试', 'UI', 'UX'
  ];
  
  // 提取常见技术关键词
  const extractedKeywords = commonTechKeywords.filter(keyword => 
    text.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // 提取其他关键词
  const otherKeywords = text.split(/\s+/)
    .filter(word => word.length > 3)  // 只保留较长的词
    .filter(word => !extractedKeywords.includes(word));
  
  return [...new Set([...extractedKeywords, ...otherKeywords.slice(0, 5)])];
}

// 提取经验要求
function extractExperienceRequirement(text) {
  const expPatterns = [
    /(\d+)[年|后]以上经验/,
    /经验(\d+)[年|后]以上/,
    /(\d+)-(\d+)年经验/
  ];
  
  for (const pattern of expPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[2]) {
        return `${match[1]}-${match[2]}年`;
      }
      return `${match[1]}年以上`;
    }
  }
  
  if (text.includes('应届') || text.includes('实习')) {
    return '应届/实习';
  }
  
  return null;
}

// 提取学历要求
function extractEducationRequirement(text) {
  const eduLevels = ['博士', '硕士', '本科', '大专', '高中'];
  
  for (const level of eduLevels) {
    if (text.includes(level)) {
      if (text.includes(level + '及以上')) {
        return level + '及以上';
      }
      return level;
    }
  }
  
  return null;
}

// 从经验描述中提取年数
function extractYearsFromExperience(expText) {
  const match = expText.match(/(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }
  if (expText.includes('应届') || expText.includes('实习')) {
    return 0;
  }
  return 1; // 默认1年
}

// 比较学历等级
function compareEducationLevels(candidateEdu, requiredEdu) {
  const eduLevels = {
    '博士': 5,
    '硕士': 4,
    '本科': 3,
    '大专': 2,
    '高中': 1
  };
  
  let candidateLevel = 0;
  let requiredLevel = 0;
  
  for (const [level, value] of Object.entries(eduLevels)) {
    if (candidateEdu.includes(level)) {
      candidateLevel = Math.max(candidateLevel, value);
    }
    if (requiredEdu.includes(level)) {
      requiredLevel = Math.max(requiredLevel, value);
    }
  }
  
  // 如果要求"及以上"，则只要求达到或超过
  if (requiredEdu.includes('及以上')) {
    return candidateLevel >= requiredLevel;
  }
  
  // 否则需要精确匹配
  return candidateLevel >= requiredLevel;
}

// 提取职位名称
function extractJobTitle(text) {
  const commonTitles = [
    '前端开发工程师', '后端开发工程师', '全栈开发工程师',
    '软件工程师', '产品经理', 'UI设计师', 'UX设计师',
    '数据分析师', '人工智能工程师', '机器学习工程师',
    '测试工程师', '运维工程师', '项目经理'
  ];
  
  for (const title of commonTitles) {
    if (text.includes(title)) {
      return title;
    }
  }
  
  return '根据描述提取的职位';
}

// 生成分析
function generateAnalysis(name, skillScore, matchedSkills, allSkills) {
  if (skillScore >= 80) {
    return `${name}的技能非常匹配，掌握了${matchedSkills.join(', ')}等关键技能。`;
  } else if (skillScore >= 50) {
    return `${name}的技能部分匹配，熟悉${matchedSkills.join(', ')}，但缺少一些关键技能。`;
  } else {
    return `${name}的技术栈与职位要求匹配度较低，可能需要额外培训。`;
  }
}
