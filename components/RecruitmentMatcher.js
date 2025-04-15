// 只替换matchResumes函数
const matchResumes = async () => {
  if (!jobDescription.trim()) {
    alert('请先输入职位描述！');
    return;
  }

  setIsMatchLoading(true);
  
  try {
    console.log('调用匹配API...');
    alert('正在调用匹配API'); // 添加一个明显的提示
    
    // 调用匹配API
    const response = await fetch('/api/simpleMatch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobDescription,
        resumes: [] // 暂时发送空数组
      }),
    });
    
    console.log('API响应状态:', response.status);
    
    const data = await response.json();
    console.log('匹配结果:', data);
    
    setMatches(data.matches || []);
    setJobRequirements(data.jobRequirements || null);
    setActiveTab('results'); // 切换到结果页
    
    alert('匹配完成'); // 添加完成提示
  } catch (error) {
    console.error('匹配过程出错:', error);
    alert('匹配过程出错: ' + error.message);
  } finally {
    setIsMatchLoading(false);
  }
};
