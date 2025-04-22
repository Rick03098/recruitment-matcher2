import formidable from 'formidable';
import { Writable } from 'stream';
import pdfParse from 'pdf-parse';
import { parseResumeContent } from '../../utils/resumeParser';

// 禁用默认的bodyParser
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
    // 配置formidable使用内存存储
    const form = new formidable.IncomingForm({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      // 关键部分：使用内存存储而不是文件系统
      fileWriteStreamHandler: () => {
        const chunks = [];
        const writable = new Writable({
          write(chunk, encoding, callback) {
            chunks.push(chunk);
            callback();
          }
        });
        writable.chunks = chunks;
        return writable;
      }
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
    
    // 从内存中获取文件数据，而不是从文件系统
    const fileBuffer = Buffer.concat(uploadedFile.filepath.chunks);
    const fileType = uploadedFile.mimetype;
    
    // 根据文件类型处理
    let resumeText = '';
    if (fileType === 'application/pdf') {
      // 直接解析内存中的PDF数据
      const data = await pdfParse(fileBuffer);
      resumeText = data.text;
    } else if (fileType === 'text/plain') {
      // 直接从内存缓冲区转换为文本
      resumeText = fileBuffer.toString('utf8');
    } else {
      // 对于其他文件类型，返回错误
      return res.status(400).json({ success: false, message: '不支持的文件类型，仅支持PDF和TXT文件' });
    }
    
    // 解析简历内容
    const parsedData = parseResumeContent(resumeText);
    
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
