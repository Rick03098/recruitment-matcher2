// utils/fileUploadHandler.js
import formidable from 'formidable';
import { Writable } from 'stream';
import pdfParse from 'pdf-parse';

/**
 * 使用内存存储处理文件上传
 * @param {Object} req - 请求对象
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 包含fields和files的对象
 */
export async function handleFileUploadInMemory(req, options = {}) {
  const {
    maxFileSize = 10 * 1024 * 1024, // 默认10MB
    allowMultiple = false
  } = options;
  
  // 配置formidable使用内存存储
  const form = new formidable.IncomingForm({
    keepExtensions: true,
    maxFileSize: maxFileSize,
    multiples: allowMultiple,
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
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

/**
 * 从内存中读取PDF文件并解析
 * @param {Object} file - formidable文件对象
 * @returns {Promise<String>} 提取的文本
 */
export async function extractTextFromMemoryPdf(file) {
  try {
    // 从内存中获取文件数据
    const fileBuffer = Buffer.concat(file.filepath.chunks);
    
    // 从PDF中提取文本
    const data = await pdfParse(fileBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF解析错误:', error);
    throw new Error('PDF解析失败: ' + error.message);
  }
}

/**
 * 从内存中读取文本文件
 * @param {Object} file - formidable文件对象
 * @returns {String} 文件文本内容
 */
export function readTextFileFromMemory(file) {
  try {
    // 从内存中获取文件数据
    const fileBuffer = Buffer.concat(file.filepath.chunks);
    return fileBuffer.toString('utf8');
  } catch (error) {
    console.error('文本文件读取错误:', error);
    throw new Error('文本文件读取失败: ' + error.message);
  }
}
