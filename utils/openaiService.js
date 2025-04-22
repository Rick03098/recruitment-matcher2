// utils/openaiService.js
import OpenAI from 'openai';

// --- 使用你提供的硬编码 OpenAI API Key ---
const OPENAI_API_KEY = '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';
// -------------------------------------

let openai;
if (OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-')) {
  try {
    openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
    console.log("OpenAI 客户端已使用提供的 API Key 初始化。");
  } catch (error) {
      console.error("初始化 OpenAI 客户端时出错:", error);
      openai = null;
  }
} else {
  console.warn("提供的 OpenAI API Key 无效或未设置，相关功能将不可用。");
  openai = null;
}

/**
 * 调用 OpenAI 解析简历文本
 * @param {string} resumeText - 简历的纯文本内容
 * @returns {Promise<object|null>} 解析后的结构化数据 (JSON 对象) 或 null
 */
export async function parseResumeWithOpenAI(resumeText) {
  if (!openai) {
    throw new Error("OpenAI 服务未初始化或 API Key 无效。");
  }
  if (!resumeText || resumeText.trim().length === 0) {
    console.log("简历文本为空，跳过 OpenAI 解析。");
    return null;
  }

  // 精炼后的 Prompt，专注于核心信息并强化 JSON 输出要求
  const prompt = `
    Analyze the following resume text and extract key information.
    Respond ONLY with a valid JSON object containing the extracted data.
    Do NOT include any introductory text, explanations, apologies, or markdown formatting like \`\`\`json.

    The JSON object should have these exact keys:
    - "name": string (Candidate's full name)
    - "contact": object (with "phone": string and "email": string)
    - "education": object (highest level found, with "school": string, "major": string, "degree": string)
    - "experience": array of objects (each with "company": string, "title": string, "startDate": string (YYYY-MM or year), "endDate": string (YYYY-MM, year, or 'Present'), "description": string)
    - "skills": array of strings (list of technical skills, tools, programming languages)

    If a piece of information is not found, use null for string/object fields or an empty array [] for array fields.

    Resume Text:
    ---
    ${resumeText}
    ---

    JSON Output:
  `;

  try {
    console.log("调用 OpenAI Chat Completion API...");
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125", // 使用一个较新的、支持 JSON mode 的模型
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1, // 更低，更稳定
      response_format: { type: "json_object" }, // 强制 JSON 输出模式
    });

    const responseContent = completion.choices[0]?.message?.content;

    if (responseContent) {
      console.log("OpenAI 原始响应:", responseContent); // 打印原始响应以供调试
      try {
         // 由于使用了 response_format: { type: "json_object" }, 返回的应该直接是 JSON 字符串
         const parsedJson = JSON.parse(responseContent);
         console.log("成功解析 OpenAI 返回的 JSON。");
         // 做一些基本的数据验证或清理
         if (!parsedJson.name) console.warn("OpenAI未能提取到姓名");
         if (!parsedJson.skills || parsedJson.skills.length === 0) console.warn("OpenAI未能提取到技能");

         return parsedJson;
      } catch (jsonError) {
         console.error("解析 OpenAI 返回的 JSON 失败:", jsonError);
         console.error("原始响应内容:", responseContent); // 再次打印供分析
         throw new Error(`无法解析 OpenAI 返回的 JSON: ${jsonError.message}`);
      }
    } else {
      throw new Error("OpenAI 返回了空的响应内容。");
    }
  } catch (error) {
    console.error("调用 OpenAI API 出错:", error);
    // 记录更详细的错误信息
    if (error instanceof OpenAI.APIError) {
        console.error("OpenAI API Error Status:", error.status);
        console.error("OpenAI API Error Message:", error.message);
        console.error("OpenAI API Error Code:", error.code);
        console.error("OpenAI API Error Type:", error.type);
    }
    throw new Error(`调用 OpenAI API 失败: ${error.message}`);
  }
}
