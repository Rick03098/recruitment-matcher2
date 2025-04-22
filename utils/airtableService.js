// utils/airtableService.js
import Airtable from 'airtable';

// --- 使用你提供的硬编码常量 ---
const AIRTABLE_API_KEY = 'patCOFt5DYSAv73VI.a27ea50b39361b388fe941cd6b562518a08f7943631c2deddd479a8bb1ba6d38';
const AIRTABLE_BASE_ID = 'appYPoERDFlNulJgi';
const AIRTABLE_TABLE_NAME = 'resumepool'; // 使用你提供的表名
// -----------------------------

// 检查常量是否设置
if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
  console.error("错误：Airtable 常量未完全配置！");
  // 可以选择抛出错误
}

// 初始化 Airtable Base
let base;
try {
    base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
} catch (error) {
    console.error("初始化 Airtable Base 时出错:", error);
    base = null; // 标记为不可用
}


/**
 * 将解析结果保存到Airtable
 * @param {object} resumeData - 包含解析出的简历信息的对象
 * @param {string} source - 简历来源 (例如文件名或'手动输入')
 * @returns {Promise<object>} 创建的 Airtable 记录 (包含 id 和字段)
 */
export async function saveToAirtable(resumeData, source) {
  if (!base) {
      throw new Error("Airtable Base 未成功初始化，无法保存。");
  }
  if (!AIRTABLE_TABLE_NAME) {
     throw new Error("Airtable 表名未配置，无法保存。");
  }

  try {
    const table = AIRTABLE_TABLE_NAME; // 使用常量中的表名

    // 准备 Airtable 记录数据
    // 注意：这里的字段名 ("Name", "Title", "Skills"等) 需要与你 Airtable 'resumepool' 表中的列名完全一致！
    const recordData = {
      "Name": resumeData.name || '未检测到姓名',
      "Title": resumeData.title || '未检测到职位',
      // 将技能数组转换为逗号分隔的字符串，或根据 Airtable 字段类型调整
      "Skills": Array.isArray(resumeData.skills) ? resumeData.skills.join(', ') : (resumeData.skills || ''),
      // 如果 experience/education/contact 是对象/数组，建议转为 JSON 字符串存入长文本字段
      "Experience": typeof resumeData.experience === 'object' ? JSON.stringify(resumeData.experience, null, 2) : (resumeData.experience || '未检测到'),
      "Education": typeof resumeData.education === 'object' ? JSON.stringify(resumeData.education, null, 2) : (resumeData.education || '未检测到'),
      "Contact": typeof resumeData.contact === 'object' ? JSON.stringify(resumeData.contact, null, 2) : (resumeData.contact || '未检测到'),
      "Source": source || '未知来源',
      "Upload Date": new Date().toISOString(),
      // 可选：存储部分原始文本或其他 OpenAI 返回的信息
      "RawTextPreview": resumeData.rawTextPreview || (typeof resumeData.rawText === 'string' ? resumeData.rawText.substring(0, 500) + '...' : '')
    };

    console.log("准备发送到 Airtable 的数据:", JSON.stringify(recordData, null, 2));

    // 创建记录
    const records = await base(table).create([
      { fields: recordData }
    ]);

    if (!records || records.length === 0) {
      throw new Error('Airtable 记录创建失败');
    }

    console.log(`成功创建 Airtable 记录, ID: ${records[0].id}`);

    // 返回包含 ID 和已保存字段的对象
    return {
      id: records[0].id,
      ...recordData
    };
  } catch (error) {
    console.error('Airtable 保存错误:', error);
    // 尝试提供更具体的错误信息
    if (error.message.includes('NOT_FOUND')) {
         console.error(`请检查 Airtable Base ID ('${AIRTABLE_BASE_ID}') 和 Table Name ('${AIRTABLE_TABLE_NAME}') 是否正确。`);
    } else if (error.message.includes('AUTHENTICATION_REQUIRED') || error.message.includes('INVALID_API_KEY')) {
         console.error(`请检查 Airtable API Key 是否正确或有效。`);
    } else if (error.message.includes('INVALID_REQUEST')) {
        console.error('Airtable 请求无效，请检查发送的 recordData 结构是否与 Airtable 表字段匹配:', recordData);
    }
    throw new Error(`保存到 Airtable (${AIRTABLE_TABLE_NAME}) 失败: ${error.message}`);
  }
}
