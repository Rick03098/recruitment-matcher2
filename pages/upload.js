import { useState } from 'react';
import { useRouter } from 'next/router';

export default function UploadResume() {
  const [name, setName] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!resumeText.trim()) {
      setError('请输入简历内容');
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
  // 使用新的API端点
  const response = await fetch('/api/addResume', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      resumeText
    }),
  });

  // 简单处理响应
  if (!response.ok) {
    throw new Error('服务器响应错误: ' + response.status);
  }

  try {
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
  } catch (parseError) {
    throw new Error('无法解析服务器响应');
  }
} catch (err) {
  console.error('简历处理失败:', err);
  setError(`简历处理失败: ${err.message}`);
} finally {
  setIsLoading(false);
}
  let data;
  const text = await response.text(); // 先获取文本
  
  try {
    data = JSON.parse(text); // 尝试解析为JSON
  } catch (jsonError) {
    console.error('JSON解析失败:', text);
    throw new Error('服务器返回了无效的JSON: ' + text.substring(0, 100));
  }

  if (!response.ok) {
    throw new Error(data.message || '处理简历失败');
  }

  setSuccess(`简历处理成功！${data.message || ''}`);
  
  // 3秒后重定向到首页
  setTimeout(() => {
    router.push('/');
  }, 3000);
} catch (err) {
  console.error('简历处理失败:', err);
  setError(`简历处理失败: ${err.message}`);
} finally {
  setIsLoading(false);
}
  };

  return (
    <div className="p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
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
            
            <div className="mb-6">
              <label className="block text-sm font-bold mb-2" htmlFor="resumeText">
                简历内容
              </label>
              <textarea
                id="resumeText"
                className="w-full p-2 border rounded h-64"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="请粘贴您的简历文本内容，包括技能、经验、教育背景等信息..."
                required
              />
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 disabled:bg-blue-300"
                disabled={isLoading}
              >
                {isLoading ? '处理中...' : '解析并保存'}
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
