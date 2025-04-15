import Airtable from 'airtable';

export default async function handler(req, res) {
  console.log("正在尝试连接Airtable...");
  
  try {
    // 打印环境变量(不包含API密钥)
    console.log("Airtable配置:", {
      baseId: process.env.AIRTABLE_BASE_ID ? "已设置" : "未设置",
      tableName: process.env.AIRTABLE_TABLE_NAME
    });
    
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID || !process.env.AIRTABLE_TABLE_NAME) {
      throw new Error("Airtable环境变量未正确设置");
    }
    
    // 配置Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    }).base(process.env.AIRTABLE_BASE_ID);

    console.log("已创建Airtable连接，尝试获取记录...");

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
            console.log(`获取到${records.length}条记录`);
            records.forEach(record => {
              allRecords.push({
                id: record.id,
                name: record.get('Name') || '',
                title: record.get('Title') || '',
                skills: record.get('Skills') ? record.get('Skills').split(',').map(skill => skill.trim()) : [],
                experience: record.get('Experience') || '',
                education: record.get('Education') || '',
                email: record.get('Email') || '',
                phone: record.get('Phone') || ''
              });
            });
            fetchNextPage();
          },
          function done(err) {
            if (err) {
              console.error("Airtable错误:", err);
              reject(err);
            } else {
              console.log(`总共获取到${allRecords.length}条记录`);
              resolve(allRecords);
            }
          }
        );
    });

    // 如果没有记录，提供一些默认数据
    if (records.length === 0) {
      console.log("未获取到任何记录，返回默认数据");
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

    console.log("成功获取Airtable数据");
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
      message: 'Airtable连接错误: ' + error.message
    });
  }
}
