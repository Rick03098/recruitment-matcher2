import Airtable from 'airtable';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '只支持POST请求' });
  }

  try {
    const { name, resumeText } = req.body;
    
    // 验证数据
    if (!name || !resumeText) {
      return res.status(400).json({ success: false, message: '姓名和简历内容不能为空' });
    }
    
    // 解
