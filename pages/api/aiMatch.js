export default async function handler(req, res) {
  try {
    // 记录请求内容
    console.log('Request body:', req.body);
    
    // 简单响应测试
    return res.status(200).json({ 
      message: '测试成功',
      env: {
        airtableKeyExists: !!process.env.AIRTABLE_API_KEY,
        airtableBaseExists: !!process.env.AIRTABLE_BASE_ID,
        airtableTableExists: !!process.env.AIRTABLE_TABLE_NAME,
        openaiKeyExists: !!process.env.OPENAI_API_KEY
      } 
    });
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}
