import Airtable from 'airtable';

export default async function handler(req, res) {
  try {
    // 配置Airtable
    const apiKey = process.env.AIRTABLE_API_KEY || 'patCOFt5DYSAv73VI.a27ea50b39361b388fe941cd6b562518a08f7943631c2deddd479a8bb1ba6d38';
    const baseId = process.env.AIRTABLE_BASE_ID || 'appYPoERDFlNulJgi';
    const tableName = process.env.AIRTABLE_TABLE_NAME || 'tblQbhrbMuzqpXfZP';
    
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
            records.forEach(record => {
              // 将Airtable记录转换为应用需要的格式
              allRecords.push({
                id: record.id,
                name: record.get('Name') || '',
                skills: record.get('Skills') || '',
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

    // 处理技能，确保是数组格式
    const processedRecords = records.map(record => {
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
      source: 'airtable'
    });
  } catch (error) {
    console.error('Error fetching resumes from Airtable:', error);
    
    // 发生错误时提供默认数据
    return res.status(200).json({
      resumes: [
        {
          id: 'error1',
          name: '张三(默认数据)',
          skills: ['JavaScript', 'React']
        },
        {
          id: 'error2',
          name: '李四(默认数据)',
          skills: ['Java', 'Spring']
        }
      ],
      source: 'default',
      error: error.message
    });
  }
}
