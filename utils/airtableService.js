import Airtable from 'airtable';

// 配置环境变量
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || 'patCOFt5DYSAv73VI.a27ea50b39361b388fe941cd6b562518a08f7943631c2deddd479a8bb1ba6d38';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appYPoERDFlNulJgi';
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'tblQbhrbMuzqpXfZP';

// 将解析结果保存到Airtable
export async function saveToAirtable(resumeData, source) {
  try {
    // 配置Airtable
    const base = new Airtable({ 
      apiKey: AIRTABLE_API_KEY
    }).base(AIRTABLE_BASE_ID);
    
    const table = AIRTABLE_TABLE_NAME;
    
    // 准备Airtable记录数据
    const recordData = {
      "Name": resumeData.name || '未检测到姓名',
      "Title": resumeData.title || '未检测到职位',
      "Skills": resumeData.skills || [],
      "Experience": resumeData.experience || '未检测到',
      "Education": resumeData.education || '未检测到',
      "Contact": resumeData.contact || '未检测到',
      "Source": source || '上传简历',
      "Upload Date": new Date().toISOString()
    };
    
    // 创建记录
    const records = await base(table).create([
      { fields: recordData }
    ]);
    
    if (!records || records.length === 0) {
      throw new Error('Airtable记录创建失败');
    }
    
    return {
      id: records[0].id,
      ...recordData
    };
  } catch (error) {
    console.error('Airtable保存错误:', error);
    throw new Error('保存到Airtable失败: ' + error.message);
  }
}
