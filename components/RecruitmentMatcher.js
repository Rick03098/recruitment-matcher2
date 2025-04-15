// 匹配简历
const matchResumes = async () => {
  if (!jobDescription.trim()) {
    setError('请先输入职位描述！');
    return;
  }

  setIsMatchLoading(true);
  setError(null);
  
  try {
    // 总是从Airtable获取最新数据
    const resumeResponse = await fetch('/api/fetchResumes');
    if (!resumeResponse.ok) {
      throw new Error('获取简历数据失败');
    }
    
    const resumeData = await resumeResponse.json();
    const resumesToMatch = resumeData.resumes || [];
    
    // 更新简历库
    setResumes(resumesToMatch);
    setDataSource(resumeData.source || '未知');
    
    if (resumesToMatch.length === 0) {
      throw new Error('没有简历数据可供匹配');
    }
    
    // 调用匹配API
    const response = await fetch('/api/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobDescription,
        resumes: resumesToMatch
      }),
    });
    
    if (!response.ok) {
      throw new Error('匹配请求失败');
    }
    
    const data = await response.json();
    setMatches(data.matches || []);
    setJobRequirements(data.jobRequirements || null);
    setActiveTab('results'); // 切换到结果页
  } catch (error) {
    console.error('匹配过程出错:', error);
    setError('匹配过程出错: ' + error.message);
  } finally {
    setIsMatchLoading(false);
  }
};
