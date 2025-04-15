// 替换matchResumes函数
const matchResumes = async () => {
  if (!jobDescription.trim()) {
    setApiStatus('请先输入职位描述！');
    return;
  }

  setIsMatchLoading(true);
  setApiStatus('匹配中...');
  
  try {
    // 确保我们有简历数据
    let resumesToMatch = resumes;
    if (resumesToMatch.length === 0) {
      const response = await fetch('/api/fetchResumes');
      if (!response.ok) throw new Error('获取简历失败');
      
      const data = await response.json();
      resumesToMatch = data.resumes || [];
      setResumes(resumesToMatch);
      setApiStatus(data.message || '已获取简历数据');
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
      const errorData = await response.json();
      throw new Error(errorData.message || '匹配请求失败');
    }
    
    const data = await response.json();
    setMatches(data.matches || []);
    setJobRequirements(data.jobRequirements || null);
    setActiveTab('results'); // 切换到结果页
    setApiStatus('匹配成功');
  } catch (error) {
    console.error('匹配过程出错:', error);
    setApiStatus(`匹配过程出错: ${error.message}`);
  } finally {
    setIsMatchLoading(false);
  }
};
