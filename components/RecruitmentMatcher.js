export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '只支持POST请求' });
  }

  const { jobDescription, resumes = [] } = req.body;

  if (!jobDescription) {
    return res.status(400).json({ message: '职位描述不能为空' });
  }

  try {
    console.log("处理匹配请求，职位描述长度:", jobDescription.length);
    console.log("候选人数量:", resumes.length);
    
    // 测试第一个简历的数据结构
    if (resumes.length > 0) {
      console.log("第一份简历数据样例:", {
        name: resumes[0].name,
        skillsType: typeof resumes[0].skills,
        isArray: Array.isArray(resumes[0].skills),
        skills: resumes[0].skills
      });
    }
    
    // 从JD中提取关键词
    const keywords = extractKeywords(jobDescription);
    console.log("提取的关键词:", keywords);
    
    // 计算匹配度
    const matches = resumes.map(resume => {
      // 确保技能是数组
      let skills = resume.skills || [];
      if (!Array.isArray(skills)) {
        if (typeof skills === 'string') {
          skills = skills.split(',').map(s => s.trim());
        } else {
          skills = [];
        }
      }
      
      console.log(`候选人 ${resume.name} 的技能:`, skills);
      
      // 技能匹配
      const matchedSkills = skills.filter(skill => 
        keywords.some(keyword => {
          const skillLower = skill.toLowerCase();
          const keywordLower = keyword.toLowerCase();
          return skillLower.includes(keywordLower) || keywordLower.includes(skillLower);
        })
      );
      
      console.log(`候选人 ${resume.name} 的匹配技能:`, matchedSkills);
      
      // 计算匹配度 (如果没有关键词，默认至少给10%)
      const skillScore = keywords.length > 0 
        ? (matchedSkills.length / keywords.length) * 100 
        : 10;
      
      // 整体匹配分数
      const matchScore = Math.max(Math.round(skillScore), 10); // 至少给10%的匹配度
      
      return {
        ...resume,
        matchScore,
        matchDetails: {
          matchedSkills,
          missingSkills: skills.filter(skill => !matchedSkills.includes(skill)),
          analysis: generateAnalysis(resume.name, matchScore, matchedSkills)
        }
      };
    });
    
    // 按匹配度排序
    const sortedMatches = matches.sort((a, b) => b.matchScore - a.matchScore);
    
    // 职位要求
    const jobRequirements = {
      jobTitle: extractJobTitle(jobDescription),
      skills: keywords
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

// 提取关键词 - 改进版
function extractKeywords(text) {
  if (!text || typeof text !== 'string') {
    console.log("无效的文本输入");
    return ["技能"];
  }
  
  const commonTechKeywords = [
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
  
  // 提取常见技术关键词
  const extractedKeywords = commonTechKeywords.filter(keyword => 
    text.toLowerCase().includes(keyword.toLowerCase())
  );
  
  return extractedKeywords.length > 0 ? extractedKeywords : ["通用技能"];
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
    if (text.toLowerCase().includes(title.toLowerCase())) {
      return title;
    }
  }
  
  return '未指定职位';
}

// 生成分析
function generateAnalysis(name, score, matchedSkills) {
  const skillsText = matchedSkills.length > 0 
    ? `掌握了${matchedSkills.join('、')}等技能` 
    : '没有直接匹配的关键技能';
  
  if (score >= 80) {
    return `${name}的技能非常匹配，${skillsText}。`;
  } else if (score >= 50) {
    return `${name}的技能部分匹配，${skillsText}，但可能缺少一些关键技能。`;
  } else {
    return `${name}的技术栈与职位要求匹配度较低，${skillsText}，可能需要额外培训。`;
  }
}
