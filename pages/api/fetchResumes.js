export default async function handler(req, res) {
  try {
    // 简化版，返回模拟数据
    const mockResumes = [
      {
        id: '1',
        name: '张三',
        title: '前端开发工程师',
        skills: ['JavaScript', 'React', 'HTML', 'CSS'],
        experience: '3年',
        education: '本科'
      },
      {
        id: '2',
        name: '李四',
        title: '后端开发工程师',
        skills: ['Java', 'Spring Boot', 'MySQL'],
        experience: '5年',
        education: '硕士'
      }
    ];
    
    return res.status(200).json({ resumes: mockResumes });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: '获取简历失败' });
  }
}
