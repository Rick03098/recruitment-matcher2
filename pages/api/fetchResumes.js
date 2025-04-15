import Airtable from 'airtable';

export default async function handler(req, res) {
  console.log("正在尝试连接Airtable...");
  
  try {
    // 配置Airtable
    const apiKey = process.env.AIRTABLE_API_KEY || 'patCOFt5DYSAv73VI.a27ea50b39361b388fe941cd6b562518a08f7943631c2deddd479a8bb1ba6d38';
    const baseId = process.env.AIRTABLE_BASE_ID || 'appYPoERDFlNulJgi';
    const tableName = process.env.AIRTABLE_TABLE_NAME || 'tblQbhrbMuzqpXfZP'; // 使用表ID而不是表名
    
    console.log("Airtable配置:", { baseId, tableName });
    
    const base = new Airtable({ apiKey }).base(baseId);

    // 从Airtable获取记录
    const records = await new Promise((resolve, reject) => {
      const allRecords = [];
      
      base(tableName)
        .select({
          maxRecords: 100,
          view: "Grid view"
        })
        .eachPage(
          function page(records, fetchNextPage) {
            console.log(`获取到${records.length}条记录`);
            records.forEach(record => {
              // 直接打印整个记录以查看所有可用字段
              console.log("记录字段:", Object.keys(record.fields));
              
              allRecords.push({
                id: record.id,
                name: record.get('Name') || '',
                title: record.get('Title') || '',
                skills: record.get('Skills') || [],  // 假设Skills是文本字段
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

    // 添加一些处理，确保skills是数组
    const processedRecords = records.map(record => {
      // 确保skills是数组
      let skills = record.skills;
      if (typeof skills === 'string') {
        skills = skills.split(',').map(s => s.trim());
      } else if (!Array.isArray(skills)) {
        skills = [];
      }
      
      return {
        ...record,
        skills
      };
    });

    return res.status(200).json({ 
      resumes: processedRecords,
      message: '成功从Airtable获取数据',
      count: processedRecords.length
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
