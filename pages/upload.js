import formidable from 'formidable';
import fs from 'fs';
import os from 'os';
import { parseResumeContent, extractTextFromPdf } from '../../utils/resumeParser';

// 禁用默认的bodyParser，以便我们可以使用formidable解析form数据
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '只支持POST请求' });
  }

  try {
    // 使用系统临时目录
    const tempDir = os.tmpdir();
    console.log('使用的临时目录:', tempDir);
    
    // 配置formidable解析上传文件
    const form = new formidable.IncomingForm({
      uploadDir: tempDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });
    
    // 解析表单
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });
    
    const uploadedFile = files.file;
    if (!uploadedFile) {
      return res.status(400).json({ success: false, message: '没有找到上传的文件' });
    }
    
    // 处理单个PDF文件
    const filePath = uploadedFile.filepath;
    const fileType = uploadedFile.mimetype;
    
    // 根据文件类型处理
    let resumeText = '';
    if (fileType === 'application/pdf') {
      resumeText = await extractTextFromPdf(filePath);
    } else if (fileType === 'text/plain') {
      resumeText = fs.readFileSync(filePath, 'utf8');
    } else {
      // 对于其他文件类型，返回错误
      fs.unlinkSync(filePath); // 删除临时文件
      return res.status(400).json({ success: false, message: '不支持的文件类型，仅支持PDF和TXT文件' });
    }
    
    // 解析简历内容
    const parsedData = parseResumeContent(resumeText);
    
    // 删除临时文件
    fs.unlinkSync(filePath);
    
    // 返回解析结果
    return res.status(200).json({
      success: true,
      message: '文件上传并解析成功',
      file: {
        name: uploadedFile.originalFilename,
        size: uploadedFile.size,
        type: fileType
      },
      parsedData
    });
  } catch (error) {
    console.error('处理上传文件错误:', error);
    return res.status(500).json({
      success: false,
      message: '文件处理失败: ' + error.message
    });
  }
}
