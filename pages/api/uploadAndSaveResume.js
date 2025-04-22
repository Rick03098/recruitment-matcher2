import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import Airtable from 'airtable';
import os from 'os';

// 禁用默认的bodyParser，以便使用formidable解析form数据
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
    
    // 确保目录存在 (虽然os.tmpdir()通常应该已经存在)
    if (!fs.existsSync(tempDir)) {
      console.log(`临时目录 ${tempDir} 不存在，尝试创建...`);
      try {
        fs.mkdirSync(tempDir, { recursive: true });
      } catch (dirError) {
        console.error(`无法创建临时目录: ${dirError.message}`);
        // 如果无法创建目录，可以尝试使用内存存储
        return useMemoryStorage(req, res);
      }
    }
    
    // 解析表单
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });
    
    // ... 余下的代码保持不变
  } catch (error) {
    console.error('处理上传文件错误:', error);
    return res.status(500).json({
      success: false,
      message: '文件处理失败: ' + error.message
    });
  }
}

// 如果文件系统不可用，回退到内存存储
async function useMemoryStorage(req, res) {
  try {
    // 配置formidable使用内存存储
    const form = new formidable.IncomingForm({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      // 使用内存存储而不是文件系统
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
    
    // ... 使用内存处理文件的代码
    // ... 这部分代码可以参考你的 uploadPdf.js 文件中的实现
  } catch (error) {
    console.error('内存处理上传文件错误:', error);
    return res.status(500).json({
      success: false,
      message: '文件处理失败: ' + error.message
    });
  }
}
