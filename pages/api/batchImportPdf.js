import formidable from 'formidable';
import fs from 'fs';
import os from 'os';
import { parseResumeContent, extractTextFromPdf, extractNameFromFilename } from '../../utils/resumeParser';
import { saveToAirtable } from '../../utils/airtableService';

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
      maxFileSize: 20 * 1024 * 1024, // 20MB
      multiples: true, // 允许多文件上传
    });
    
    // 解析表单
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });
    
    // 处理多个文件
    const uploadedFiles = files.files;
    if (!uploadedFiles) {
      return res.status(400).json({ success: false, message: '没有找到上传的文件' });
    }
    
    // 确保uploadedFiles是数组
    const filesArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    
    if (filesArray.length === 0) {
      return res.status(400).json({ success: false, message: '没有找到上传的文件' });
    }
    
    // 处理每个文件
    const results = [];
    const errors = [];
    
    for (const uploadedFile of filesArray) {
      try {
        const filePath = uploadedFile.filepath;
        const fileType = uploadedFile.mimetype;
        const fileName = uploadedFile.originalFilename;
        
        // 只处理PDF文件
        if (fileType !== 'application/pdf') {
          errors.push(`${fileName}: 不支持的文件类型，仅支持PDF`);
          // 删除非PDF文件
          fs.unlinkSync(filePath);
          continue;
        }
        
        // 从PDF中提取文本
        const resumeText = await extractTextFromPdf(filePath);
        
        // 解析简历内容
        const parsedData = parseResumeContent(resumeText);
        
        // 尝试从文件名中提取姓名
        const name = extractNameFromFilename(fileName);
        if (!parsedData.name || parsedData.name === '未检测到') {
          parsedData.name = name;
        }
        
        // 保存到Airtable
        const airtableRecord = await saveToAirtable({
          ...parsedData,
          name: parsedData.name || name
        }, fileName);
        
        // 将解析结果添加到数组
        results.push({
          file: {
            name: fileName,
            size: uploadedFile.size,
            type: fileType
          },
          candidate: {
            name: parsedData.name || name,
            title: parsedData.title,
            skills: parsedData.skills,
            experience: parsedData.experience,
            education: parsedData.education,
            contact: parsedData.contact
          },
          airtableId: airtableRecord.id
        });
        
        // 删除临时文件
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error(`处理文件 ${uploadedFile.originalFilename} 时出错:`, error);
        errors.push(`${uploadedFile.originalFilename}: ${error.message}`);
        
        // 删除发生错误的文件
        if (fs.existsSync(uploadedFile.filepath)) {
          fs.unlinkSync(uploadedFile.filepath);
        }
      }
    }
    
    // 返回结果
    return res.status(200).json({
      success: true,
      message: `成功解析并保存 ${results.length} 个简历文件${errors.length > 0 ? `，${errors.length} 个文件处理失败` : ''}`,
      results,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    console.error('批量处理简历文件错误:', error);
    return res.status(500).json({
      success: false,
      message: '批量文件处理失败: ' + error.message
    });
  }
}
