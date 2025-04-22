// pages/api/uploadAndSaveResume.js
import { handleFileUploadInMemory, extractTextFromMemoryPdf, readTextFileFromMemory } from '../../utils/fileUploadHandler';
import { parseResumeContent, extractNameFromFilename } from '../../utils/resumeParser';
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
    // 使用内存处理文件上传
    const { fields, files } = await handleFileUploadInMemory(req);
    
    const uploadedFile = files.file;
    if (!uploadedFile) {
      return res.status(400).json({ success: false, message: '没有找到上传的文件' });
    }
    
    // 处理简历文件
    const fileType = uploadedFile.mimetype;
    
    // 根据文件类型处理
    let resumeText = '';
    if (fileType === 'application/pdf') {
      resumeText = await extractTextFromMemoryPdf(uploadedFile);
    } else if (fileType === 'text/plain') {
      resumeText = readTextFileFromMemory(uploadedFile);
    } else if (fileType === 'application/msword' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // 对于Word文档，这里可以添加特定处理...
      return res.status(400).json({ success: false, message: '暂时不支持Word文档解析' });
    } else {
      // 对于其他文件类型，返回错误
      return res.status(400).json({ success: false, message: '不支持的文件类型，仅支持PDF和TXT文件' });
    }
    
    // 解析简历内容
    const parsedData = parseResumeContent(resumeText);
    
    // 从文件名中提取可能的姓名信息
    const fileName = uploadedFile.originalFilename;
    const possibleName = extractNameFromFilename(fileName);
    
    // 如果简历中没有检测到姓名，但文件名可能含有姓名，使用文件名中的姓名
    if (!parsedData.name || parsedData.name === '未检测到') {
      parsedData.name = possibleName;
    }
    
    // 保存到Airtable
    const airtableRecord = await saveToAirtable(parsedData, fileName);
    
    // 返回解析结果
    return res.status(200).json({
      success: true,
      message: '简历上传、解析和保存成功',
      file: {
        name: uploadedFile.originalFilename,
        size: uploadedFile.size,
        type: fileType
      },
      parsedData,
      airtableRecord
    });
  } catch (error) {
    console.error('处理上传文件错误:', error);
    return res.status(500).json({
      success: false,
      message: '文件处理失败: ' + error.message
    });
  }
}
