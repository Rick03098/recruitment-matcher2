import { useState, useEffect } from 'react';

export default function RecruitmentMatcher() {
  const [jobDescription, setJobDescription] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 获取简历数据
  useEffect(() => {
    const fetchResumes = async () => {
      if (activeTab !== 'resumes') return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/mockResumes'); // 先使用模拟数据
        const data = await response.json();
        
        if (data.resumes) {
          setResumes(data.resumes);
        }
      } catch (err) {
        console.error('获取简历失败:', err);
        setError('无法加载简历库，请稍后再试');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResumes();
  }, [activeTab]);

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">智能招聘匹配系统</h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {/* 标签导航 */}
          <div className="flex border-b mb-6">
            <button 
              className={`py-2 px-4 ${activeTab === 'upload' ? 'font-bold text-blue-500' : 'text-gray-500'}`}
              onClick={() => setActiveTab('upload')}
            >
              上传职位描述
            </button>
            <button 
              className={`py-2 px-4 ${activeTab === 'resumes' ? 'font-bold text-blue-500' : 'text-gray-500'}`}
              onClick={() => setActiveTab('resumes')}
            >
              简历库
            </button>
          </div>
          
          {/* 上传职位描述界面 */}
          {activeTab === 'upload' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">
                  职位描述
                </label>
                <textarea
                  className="w-full p-2 border rounded h-40"
                  placeholder="请粘贴职位描述..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
              <div>
                <button className="bg-blue-500 text-white font-bold py-2 px-4 rounded">
                  测试版本
                </button>
              </div>
            </div>
          )}
          
          {/* 简历库界面 */}
          {activeTab === 'resumes' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">简历库</h2>
              
              {isLoading ? (
                <p className="text-center">加载中...</p>
              ) : resumes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-2 text-left">姓名</th>
                        <th className="px-4 py-2 text-left">技能</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumes.map((resume) => (
                        <tr key={resume.id || index} className="border-t">
                          <td className="px-4 py-2">{resume.name || '未知'}</td>
                          <td className="px-4 py-2">
                            {resume.skills && Array.isArray(resume.skills) ? 
                              resume.skills.join(', ') : 
                              '无技能信息'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center">暂无简历数据</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
