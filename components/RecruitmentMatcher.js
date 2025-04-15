import { useState, useEffect } from 'react';

export default function RecruitmentMatcher() {
  const [jobDescription, setJobDescription] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 测试基本API
  const testApi = async () => {
    try {
      const response = await fetch('/api/hello');
      const data = await response.json();
      alert('API响应: ' + data.message);
    } catch (error) {
      alert('API调用失败: ' + error.message);
    }
  };

  // 获取简历数据
  useEffect(() => {
    const fetchResumes = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/fetchResumes');
        const data = await response.json();
        setResumes(data.resumes);
      } catch (error) {
        console.error('获取简历失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (activeTab === 'resumes') {
      fetchResumes();
    }
  }, [activeTab]);

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">智能招聘匹配系统</h1>
          
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
              <div className="flex space-x-4">
                <button
                  className="bg-blue-500 text-white font-bold py-2 px-4 rounded"
                  onClick={testApi}
                >
                  测试API
                </button>
                <button
                  className="bg-green-500 text-white font-bold py-2 px-4 rounded"
                >
                  开始匹配
                </button>
              </div>
            </div>
          )}
          
          {/* 简历库界面 */}
          {activeTab === 'resumes' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">简历库</h2>
              
              {isLoading ? (
                <p>加载中...</p>
              ) : resumes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-2 text-left">姓名</th>
                        <th className="px-4 py-2 text-left">职位</th>
                        <th className="px-4 py-2 text-left">技能</th>
                        <th className="px-4 py-2 text-left">经验</th>
                        <th className="px-4 py-2 text-left">学历</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumes.map((resume) => (
                        <tr key={resume.id} className="border-t">
                          <td className="px-4 py-2">{resume.name}</td>
                          <td className="px-4 py-2">{resume.title}</td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              {resume.skills.map((skill, index) => (
                                <span key={index} className="bg-gray-100 px-2 py-1 rounded text-xs">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-2">{resume.experience}</td>
                          <td className="px-4 py-2">{resume.education}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>暂无简历数据</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
