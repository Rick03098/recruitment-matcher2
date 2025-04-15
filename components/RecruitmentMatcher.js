import { useState, useEffect } from 'react';

export default function RecruitmentMatcher() {
  const [jobDescription, setJobDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [resumes, setResumes] = useState([]);
  const [error, setError] = useState(null);
  const [jobRequirements, setJobRequirements] = useState(null);

  // 从Airtable获取简历
  useEffect(() => {
    const fetchResumes = async () => {
      try {
        setIsLoadingResumes(true);
        const response = await fetch('/api/fetchResumes');
        
        if (!response.ok) {
          throw new Error('Failed to fetch resumes');
        }
        
        const data = await response.json();
        setResumes(data.resumes);
      } catch (err) {
        console.error('Error fetching resumes:', err);
        setError('无法加载简历库，请检查您的Airtable连接设置');
      } finally {
        setIsLoadingResumes(false);
      }
    };

    fetchResumes();
  }, []);

  // 使用AI进行匹配
  const matchResumes = async () => {
    if (!jobDescription.trim()) {
      alert('请先输入职位描述！');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/aiMatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobDescription,
          resumes
        }),
      });
      
      if (!response.ok) {
        throw new Error('匹配过程出错');
      }
      
      const data = await response.json();
      
      setMatches(data.matches);
      setJobRequirements(data.jobRequirements);
      setActiveTab('results');
    } catch (err) {
      console.error('匹配过程出错:', err);
      setError('匹配过程中出错，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取匹配度等级
  const getMatchLevel = (score) => {
    if (score >= 85) return { text: '极高', color: 'text-green-600' };
    if (score >= 70) return { text: '良好', color: 'text-blue-600' };
    if (score >= 50) return { text: '一般', color: 'text-yellow-600' };
    return { text: '较低', color: 'text-red-600' };
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">智能招聘匹配系统</h1>
          
          {/* 标签导航 */}
          <div className="flex border-b mb-6">
            <button 
              className={`py-2 px-4 ${activeTab === 'upload' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
              onClick={() => setActiveTab('upload')}
            >
              上传职位描述
            </button>
            <button 
              className={`py-2 px-4 ${activeTab === 'resumes' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
              onClick={() => setActiveTab('resumes')}
            >
              简历库 ({resumes.length})
            </button>
            <button 
              className={`py-2 px-4 ${activeTab === 'results' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
              onClick={() => setActiveTab('results')}
              disabled={matches.length === 0}
            >
              匹配结果
            </button>
          </div>
          
          {/* 上传职位描述界面 */}
          {activeTab === 'upload' && (
            <div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  职位描述
                </label>
                <textarea
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-64"
                  placeholder="请粘贴职位描述，例如：寻找有3年以上React开发经验的前端开发工程师，熟悉JavaScript、TypeScript、HTML和CSS等技术..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  onClick={matchResumes}
                  disabled={isLoading}
                >
                  {isLoading ? '智能匹配中...' : '开始AI匹配'}
                </button>
              </div>
            </div>
          )}
          
          {/* 简历库界面 */}
          {activeTab === 'resumes' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Airtable简历库</h2>
              
              {isLoadingResumes ? (
                <div className="text-center py-10">
                  <p className="text-gray-500">加载简历中...</p>
                </div>
              ) : error ? (
                <div className="text-center py-10">
                  <p className="text-red-500">{error}</p>
                </div>
              ) : resumes.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500">暂无简历，请先在Airtable中添加简历数据</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">职位</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">技能</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">经验</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学历</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {resumes.map((resume) => (
                        <tr key={resume.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{resume.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{resume.title}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="flex flex-wrap gap-1">
                              {resume.skills.map((skill, index) => (
                                <span key={index} className="bg-gray-100 px-2 py-1 rounded text-xs">{skill}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{resume.experience}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{resume.education}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* 匹配结果界面 */}
          {activeTab === 'results' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">匹配结果</h2>
              
              {jobRequirements && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-lg mb-2">职位要求分析</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-1">职位</h4>
                      <p>{jobRequirements.jobTitle || '未指定'}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">所需技能</h4>
                      <div className="flex flex-wrap gap-1">
                        {jobRequirements.skills.map((skill, idx) => (
                          <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">经验要求</h4>
                      <p>{jobRequirements.experience || '未指定'}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">学历要求</h4>
                      <p>{jobRequirements.education || '未指定'}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {matches.length > 0 ? (
                <div className="space-y-6">
                  {matches.map((match, index) => {
                    const matchLevel = getMatchLevel(match.matchScore);
                    
                    return (
                      <div key={match.id} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between bg-gray-50 p-4">
                          <div className="flex items-center">
                            <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                              {index + 1}
                            </div>
                            <div>
                              <h3 className="font-medium">{match.name}</h3>
                              <p className="text-sm text-gray-500">{match.title}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">{match.matchScore}%</div>
                            <div className={`text-sm ${matchLevel.color}`}>匹配度{matchLevel.text}</div>
                          </div>
                        </div>
                        
                        <div className="p-4">
                          {match.matchDetails && (
                            <>
                              <div className="grid md:grid-cols-3 gap-4 mb-4">
                                <div>
                                  <h4 className="font-medium text-sm mb-1">技能匹配</h4>
                                  <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                    <div 
                                      className="bg-blue-500 h-2 rounded-full" 
                                      style={{ width: `${match.matchDetails.skillsScore}%` }}
                                    ></div>
                                  </div>
                                  <p className="text-sm text-gray-600">{match.matchDetails.skillsScore}%</p>
                                </div>
                                <div>
                                  <h4 className="font-medium text-sm mb-1">经验匹配</h4>
                                  <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                    <div 
                                      className="bg-blue-500 h-2 rounded-full" 
                                      style={{ width: `${match.matchDetails.experienceScore}%` }}
                                    ></div>
                                  </div>
                                  <p className="text-sm text-gray-600">{match.matchDetails.experienceScore}%</p>
                                </div>
                                <div>
                                  <h4 className="font-medium text-sm mb-1">学历匹配</h4>
                                  <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                    <div 
                                      className="bg-blue-500 h-2 rounded-full" 
                                      style={{ width: `${match.matchDetails.educationScore}%` }}
                                    ></div>
                                  </div>
                                  <p className="text-sm text-gray-600">{match.matchDetails.educationScore}%</p>
                                </div>
                              </div>
                              
                              <div className="mb-4">
                                <h4 className="font-medium text-sm mb-2">匹配分析</h4>
                                <p className="text-sm text-gray-700">{match.matchDetails.analysis}</p>
                              </div>
                              
                              <div className="mb-4">
                                <h4 className="font-medium text-sm mb-1">推荐建议</h4>
                                <p className="text-sm font-medium">
                                  {match.matchDetails.recommendation}
                                </p>
                              </div>
                              
                              <div className="grid md:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <h4 className="font-medium text-sm mb-1">技能匹配</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {match.matchDetails.matchedSkills?.map((skill, idx) => (
                                      <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium text-sm mb-1">缺失技能</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {match.matchDetails.missingSkills?.map((skill, idx) => (
                                      <span key={idx} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                          
                          {match.email && (
                            <div className="mt-3 pt-3 border-t">
                              <h4 className="font-medium text-sm mb-1">联系方式</h4>
                              <p className="text-sm">{match.email}</p>
                              {match.phone && <p className="text-sm">{match.phone}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500">暂无匹配结果，请先上传职位描述并开始匹配</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
