import { useState } from 'react';
import { useRouter } from 'next/router';

export default function UploadResume() {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const router = useRouter();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('请选择要上传的简历文件');
      return;
    }

    if (!name) {
      setError('请输入您的姓名');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // 创建FormData对象
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);

    try {
      const response = await fetch('/api/parseResume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '上传简历失败');
      }

      const data = await response.json();
      setSuccess(`简历上传成功！已提取 ${Object.keys(data.skills || {}).length} 项技能。`);
      
      // 3秒后重定向到简历库页面
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err) {
      console.error('简历上传失败:', err);
      setError(`简历上传失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">上传简历</h1>
          
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
            
            <div className="mb-6">
              <label className="block text-sm font-bold mb-2" htmlFor="resume">
                选择简历文件
              </label>
              <input
                id="resume"
                type="file"
                className="w-full p-2 border rounded"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                支持的格式: PDF, Word 文档 (.doc, .docx), 文本文件 (.txt)
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 disabled:bg-blue-300"
                disabled={isLoading}
              >
                {isLoading ? '处理中...' : '上传并解析'}
              </button>
              
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700"
                onClick={() => router.push('/')}
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
