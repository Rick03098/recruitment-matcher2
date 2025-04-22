// pages/api/uploadAndSaveResume.js
import { handleFileUploadInMemory, extractTextFromMemoryPdf, readTextFileFromMemory } from '../../utils/fileUploadHandler';
import { extractNameFromFilename } from '../../utils/resumeParser'; // 保留用于备用姓名提取
import { parseResumeWithOpenAI } from '../../utils/openaiService'; // 引入 OpenAI 解析器
import { saveToAirtable } from '../../utils/airtableService'; // 引入更新后的 Airtable 服务

// 禁用 bodyParser 配置
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '只支持 POST 请求' });
  }

  try {
    // 1. 处理文件上传 (内存模式)
    const { fields, files } = await handleFileUploadInMemory(req);
    const uploadedFile = files.file; // 假设前端发送的字段名为 'file'
    if (!uploadedFile || !uploadedFile[0]) { // formidable v2+ wraps single file in array
        console.error("没有找到名为 'file' 的上传文件。Files:", files);
        return res.status(400).json({ success: false, message: "没有找到名为 'file' 的上传文件" });
    }
    const theFile = uploadedFile[0]; // 获取文件对象

    const fileType = theFile.mimetype;
    const originalFilename = theFile.originalFilename || 'unknown_file';
    const fileSize = theFile.size;

    console.log(`收到文件: ${originalFilename}, 类型: ${fileType}, 大小: ${fileSize} bytes`);

    // 2. 从文件中提取纯文本
    let resumeText = '';
    if (fileType === 'application/pdf') {
      console.log("尝试解析 PDF 文件...");
      resumeText = await extractTextFromMemoryPdf(theFile);
      console.log(`PDF 解析完成，提取到 ${resumeText.length} 字符。`);
    } else if (fileType === 'text/plain') {
      console.log("尝试读取 TXT 文件...");
      resumeText = readTextFileFromMemory(theFile);
      console.log(`TXT 读取完成，提取到 ${resumeText.length} 字符。`);
    } else {
      console.warn(`不支持的文件类型: ${fileType}`);
      return res.status(400).json({ success: false, message: `不支持的文件类型: ${fileType}，仅支持 PDF 和 TXT。` });
    }

    if (!resumeText || resumeText.trim().length < 50) { // 增加一个最小长度检查
        console.warn("提取到的简历文本过短或为空，可能无法有效解析。");
        // 可以选择不调用 OpenAI 或返回特定错误
        // return res.status(400).json({ success: false, message: '提取到的简历文本过短或为空' });
    }


    // 3. 使用 OpenAI 解析文本
    let parsedData = {};
    try {
      parsedData = await parseResumeWithOpenAI(resumeText);
      if (!parsedData) {
           // 如果 OpenAI 返回 null (例如文本为空的情况)
           console.error("OpenAI 解析器返回了 null，无法继续。");
           return res.status(500).json({ success: false, message: 'OpenAI未能解析简历文本' });
      }
      console.log("OpenAI 解析成功，获取到结构化数据。");

      // 4. (可选) 补充或验证信息
      const possibleName = extractNameFromFilename(originalFilename);
      if (!parsedData.name && possibleName) {
        console.log(`OpenAI 未提取到姓名，使用文件名中的姓名: ${possibleName}`);
        parsedData.name = possibleName;
      } else if (!parsedData.name) {
        parsedData.name = '姓名未检测';
        console.warn("姓名信息缺失，已设为默认值。");
      }
      // 添加原始文本预览到要保存的数据中
      parsedData.rawTextPreview = resumeText.substring(0, 500) + (resumeText.length > 500 ? '...' : '');


    } catch (openaiError) {
      console.error("调用 OpenAI 或处理其结果时出错:", openaiError);
      return res.status(500).json({
        success: false,
        message: `OpenAI 处理简历时出错: ${openaiError.message}`
      });
    }

    // 5. 保存到 Airtable
    let airtableRecord = null;
    try {
        // 注意：saveToAirtable 需要接收符合其内部 recordData 结构的对象
        // 我们直接传递 parsedData，并在 saveToAirtable 内部处理字段映射和格式化
       airtableRecord = await saveToAirtable(parsedData, originalFilename);
       console.log(`数据成功保存到 Airtable, 记录 ID: ${airtableRecord?.id}`);
    } catch (airtableError) {
       console.error("保存到 Airtable 时出错:", airtableError);
       // 即使保存失败，也可能希望返回已解析的数据给前端
       return res.status(500).json({
         success: false,
         message: `保存到 Airtable 失败: ${airtableError.message}`,
         parsedData: parsedData // 仍然返回解析的数据
       });
    }

    // 6. 返回成功响应
    return res.status(200).json({
      success: true,
      message: '简历已通过 OpenAI 解析并成功保存到 Airtable',
      file: {
        name: originalFilename,
        size: fileSize,
        type: fileType
      },
      parsedData: parsedData, // 返回从 OpenAI 获取的结构化数据
      airtableRecord: airtableRecord // 返回 Airtable 记录信息 (包含 id 和字段)
    });

  } catch (error) {
    // 捕获顶层或文件处理/文本提取阶段的错误
    console.error('处理上传文件的 handler 顶层错误:', error);
    return res.status(500).json({
      success: false,
      message: `文件处理失败: ${error.message}`
    });
  }
}
