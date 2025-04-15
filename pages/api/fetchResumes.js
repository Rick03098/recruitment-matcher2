// pages/api/fetchResumes.js
export default async function handler(req, res) {
  try {
    // 返回一些测试数据，确认API是否正常工作
    return res.status(200).json({
      resumes: [
        {
          id: 'test1',
          name: '张三(测试API)',
          skills: ['JavaScript', 'React', 'HTML', 'CSS']
        },
        {
          id: 'test2',
          name: '李四(测试API)',
          skills: ['Java', 'Spring Boot', 'MySQL']
        }
      ],
      source: 'test-api'
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
