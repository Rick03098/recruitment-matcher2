import { useState } from 'react';
import { useRouter } from 'next/router';
import PdfDropzone from '../components/PdfDropzone';
import FilePreview from '../components/FilePreview';

export default function UploadResume() {
  const [name, setName] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const router = useRouter();

  // 处理PDF文件上传
  const handleFileUpload = async (files) => {
    if (files.length === 0) return;
    
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/uploadPdf', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '文件上传失败');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setUploadedFile(data.file);
        setParsedData(data.parsedData);
        
        // 如果解析出了技能，将其填入简历文本区域
        if (data.parsedData.rawText) {
          setResumeText(data.parsedData.rawText);
        }
      } else {
        throw new Error(data.message || '文件处理失败');
      }
    } catch (err) {
      console.error('PDF处理错误:', err);
      setError(`文件处理失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 移除已上传的文件
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setParsedData(null);
  };

  // 提交表单
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
      // 构建请求数据
      const requestData = {
        name,
        resumeText,
        fileSource: uploadedFile ? uploadedFile.name : null
      };
      
      // 如果有解析的技能数据，也一起发送
      if (parsedData && parsedData.skills) {
        requestData.skills = parsedData.skills;
        requestData.experience = parsedData.experience;
        requestData.education = parsedData.education;
      }
      
      // 发送请求
      const response = await fetch('/api/addResume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      // 处理响应
      if (!response.ok) {
        throw new Error('服务器响应错误: ' + response.status);
      }

      const result = await response.json();
      
      if (result.success) {
        setSuccess(result.message || '简历添加成功！');
        
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

  return (
    <div className="p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">添加简历</h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2" htmlFor="name">
                姓名
              </label>
              <input
                id="name"
                type="text"
                className="w-full p-2 border rounded"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 gap-6 mb-6">
              {/* PDF上传区域 */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b">
                  <h3 className="font-medium">上传简历文件</h3>
                </div>
                <div className="p-4">
                  {!uploadedFile ? (
                    <PdfDropzone 
                      onFileUpload={handleFileUpload}
                      label="上传简历"
                      helpText="支持PDF、DOCX和TXT格式，最大10MB"
                    />
                  ) : (
                    <FilePreview 
                      file={uploadedFile}
                      parsedData={parsedData}
                      onRemove={handleRemoveFile}
                    />
                  )}
                </div>
              </div>
              
              {/* 手动输入区域 */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b">
                  <h3 className="font-medium">或手动输入简历内容</h3>
                </div>
                <div className="p-4">
                  <textarea
                    className="w-full p-2 border rounded h-40"
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="请粘贴您的简历文本内容，包括技能、经验、教育背景等信息..."
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className={`bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 disabled:bg-blue-300 ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isLoading}
              >
                {isLoading ? '处理中...' : '解析并保存'}
              </button>
              
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700"
                onClick={() => router.push('/')}
                disabled={isLoading}
              >
                返回首页
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
