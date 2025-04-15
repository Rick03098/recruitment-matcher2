import { useState } from 'react';

export default function RecruitmentMatcher() {
  const [jobDescription, setJobDescription] = useState('');
  const [activeTab, setActiveTab] = useState('upload');

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
              <div>
                <button
                  className="bg-blue-500 text-white font-bold py-2 px-4 rounded"
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
              <p>这里将显示您的简历库</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
