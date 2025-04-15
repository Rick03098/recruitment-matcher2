import Airtable from 'airtable';

export default async function handler(req, res) {
  // 初始化Airtable
  const base = new Airtable({
    apiKey: process.env.AIRTABLE_API_KEY,
  }).base(process.env.AIRTABLE_BASE_ID);

  try {
    // 从Airtable获取记录
    const records = await new Promise((resolve, reject) => {
      const allRecords = [];
      
      base(process.env.AIRTABLE_TABLE_NAME)
        .select({
          // 可以添加视图、过滤器等
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
                // 可以添加更多字段
                resumeText: record.get('ResumeText') || '', // 简历全文
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

    return res.status(200).json({ resumes: records });
  } catch (error) {
    console.error('Error fetching resumes from Airtable:', error);
    return res.status(500).json({ error: 'Failed to fetch resumes' });
  }
}
