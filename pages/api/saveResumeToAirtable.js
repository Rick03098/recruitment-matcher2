// 问题修复方案

// 1. 首先需要创建缺失的 API 端点: saveResumeToAirtable.js
// 在 pages/api 目录下创建新文件: saveResumeToAirtable.js

// pages/api/saveResumeToAirtable.js
import Airtable from 'airtable';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '只支持POST请求' });
  }

  try {
    const { name, title, skills, experience, education, contact, fileName } = req.body;
    
    // 验证数据
    if (!name) {
      return res.status(400).json({ success: false, message: '姓名不能为空' });
    }
    
    // 配置Airtable
    const apiKey = process.env.AIRTABLE_API_KEY || 'patCOFt5DYSAv73VI.a27ea50b39361b388fe941cd6b562518a08f7943631c2deddd479a8bb1ba6d38';
    const baseId = process.env.AIRTABLE_BASE_ID || 'appYPoERDFlNulJgi';
    const tableName = process.env.AIRTABLE_TABLE_NAME || 'tblQbhrbMuzqpXfZP';
    
    const base = new Airtable({apiKey}).base(baseId);
    const table = base(tableName);
    
    // 准备记录数据
    const fields = {
      "Name": name || '未检测到姓名',
      "Title": title || '未检测到职位',
      "Skills": Array.isArray(skills) ? skills : [],
      "Experience": experience || '未检测到',
      "Education": education || '未检测到',
      "Contact": contact || '未检测到',
      "Source": fileName || '手动输入',
      "Upload Date": new Date().toISOString()
    };
    
    // 创建记录
    const records = await new Promise((resolve, reject) => {
      table.create([{fields}], function(err, records) {
        if (err) {
          console.error('Airtable错误:', err);
          return reject(err);
        }
        
        resolve(records);
      });
    });
    
    if (!records || records.length === 0) {
      throw new Error('Airtable记录创建失败');
    }
    
    const record = records[0];
    
    return res.status(200).json({
      success: true,
      message: '简历已成功添加到简历库',
      data: {
        id: record.getId(),
        name,
        skills: Array.isArray(skills) ? skills.join(', ') : '',
        experience: experience || '未检测到',
        education: education || '未检测到'
      }
    });
  } catch (error) {
    console.error('保存简历时出错:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message || '未知错误'
    });
  }
}

// 2. 修复 pages/upload.js 中的表单提交函数

// 在 pages/upload.js 中，修改 handleSubmit 函数如下:
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // 验证输入
  if (!resumeText.trim() && !uploadedFile) {
    setError('请输入简历内容或上传简历文件');
    return;
  }

  if (!name) {
    setError('请输入您的姓名');
    return;
  }

  setIsLoading(true);
  setError(null);
  setSuccess(null);

  try {
    let response;
    
    if (uploadedFile) {
      // 如果有上传文件，使用已经解析的结果并保存到Airtable
      const requestData = {
        name,
        title: parsedData?.title || '',
        skills: parsedData?.skills || [],
        experience: parsedData?.experience || '',
        education: parsedData?.education || '',
        contact: parsedData?.contact || '',
        fileName: uploadedFile.name
      };
      
      response = await fetch('/api/saveResumeToAirtable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
    } else {
      // 如果是手动输入的简历内容，解析并保存
      const requestData = {
        name,
        resumeText,
      };
      
      response = await fetch('/api/parseAndSaveResume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
    }

    // 处理响应
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '服务器响应错误: ' + response.status);
    }

    const result = await response.json();
    
    if (result.success) {
      setSuccess('简历已成功保存到简历库！');
      
      // 3秒后重定向到首页
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } else {
      throw new Error(result.message || '未知错误');
    }
  } catch (err) {
    console.error('简历处理失败:', err);
    setError(`简历处理失败: ${err.message}`);
  } finally {
    setIsLoading(false);
  }
};

// 3. 修复 components/PdfDropzone.js 中的文件接受类型
// 在 components/PdfDropzone.js 中，确保 accept 配置正确:

const { getRootProps, getInputProps, isDragActive } = useDropzone({
  onDrop,
  accept: {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt']
  },
  maxFiles: maxFilesCount > 0 ? maxFilesCount : undefined
});

// 4. 修复文件上传后的错误处理
// 在 pages/api/uploadPdf.js 中，确保返回的错误是有效的 JSON:

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '只支持POST请求' });
  }

  try {
    // 其他代码保持不变...
    
    // 在处理失败时返回详细错误信息
    if (!response.ok) {
      let errorMessage = '文件上传失败';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // 忽略解析错误
      }
      throw new Error(errorMessage);
    }
    
    // 其他代码保持不变...
  } catch (error) {
    console.error('处理上传文件错误:', error);
    return res.status(500).json({
      success: false,
      message: '文件处理失败: ' + (error.message || '未知错误')
    });
  }
}
