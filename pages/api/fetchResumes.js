import Airtable from 'airtable';

export default async function handler(req, res) {
  try {
    // 配置Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    }).base(process.env.AIRTABLE_BASE_ID);

    // 从Airtable获取记录
    const records = await new Promise((resolve, reject) => {
      const allRecords = [];
      
      base(process.env.AIRTABLE_TABLE_NAME)
        .select({
          maxRecords: 100,
          view: "Grid view"
        })
        .eachPage(
          function page(records, fetchNextPage) {
            records.forEach(record => {
              allRecords.push({
                id: record.id,
                name: record.get('Name') || '',
                title: record.get('Title') || '',
                skills: record.get('Skills') ? record.get('Skills').split(',').map(skill => skill.trim()) : [],
                experience: record.get('Experience') || '',
                education: record.get('Education') || '',
                email: record.get('Email') || '',
                phone: record.get('Phone') || '',
                resumeText: record.get('ResumeText') || ''
              });
            });
            fetchNextPage();
          },
          function done(err) {
            if (err) {
              reject(err);
            } else {
              resolve(allRecords);
            }
          }
        );
    });

    // 如果没有记录，提供一些默认数据
    if (records.length === 0) {
      return res.status(200).json({
        resumes: [
          {
            id: 'default1',
            name: '张三(默认数据)',
            title: '前端开发工程师',
            skills: ['JavaScript', 'React', 'HTML', 'CSS'],
            experience: '3年',
            education: '本科'
          }
        ],
        message: '从Airtable获取数据为空，显示默认数据'
      });
    }

    return res.status(200).json({ 
      resumes: records,
      message: '成功从Airtable获取数据' 
    });
  } catch (error) {
    console.error('Error fetching resumes from Airtable:', error);
    
    // 发生错误时提供默认数据
    return res.status(200).json({
      resumes: [
        {
          id: 'error1',
          name: '李四(错误回退数据)',
          title: '后端开发工程师',
          skills: ['Java', 'Spring', 'MySQL'],
          experience: '4年',
          education: '硕士'
        }
      ],
      error: error.message,
      message: 'Airtable连接错误，显示默认数据'
    });
  }
}
