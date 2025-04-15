import { useState, useEffect } from 'react';

export default function RecruitmentMatcher() {
  const [jobDescription, setJobDescription] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const [resumes, setResumes] = useState([]);
  const [matches, setMatches] = useState([]);
  const [jobRequirements, setJobRequirements] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMatchLoading, setIsMatchLoading] = useState(false);

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
        alert('获取简历失败: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (activeTab === 'resumes') {
      fetchResumes();
    }
  }, [activeTab]);

  // 匹配简历
  const matchResumes = async () => {
    if (!jobDescription.trim()) {
      alert('请先输入职位描述！');
      return;
    }

    setIsMatchLoading(true);
    
    try {
      // 确保我们有简历数据
      let resumesToMatch = resumes;
      if (resumesToMatch.length === 0) {
        const response = await fetch('/api/fetchResumes');
        const data = await response.json();
        resumesToMatch = data.resumes;
        setResumes(resumesToMatch);
      }
      
      // 调用匹配API
      const response = await fetch('/api/simpleMatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobDescription,
          resumes: resumesToMatch
        }),
      });
      
      if (!response.ok) {
        throw new Error('匹配请求失败');
      }
      
      const data = await response.json();
      setMatches(data.matches);
      setJobRequirements(data.jobRequirements);
      setActiveTab('results'); // 切换到结果页
    } catch (error) {
      console.error('匹配过程出错:', error);
      alert('匹配过程出错: ' + error.message);
    } finally {
      setIsMatchLoading(false);
    }
  };

  // 获取匹配度等级
  const getMatchLevel = (score) => {
    if (score >= 80) return { text: '极高', color: 'text-green-600' };
    if (score >= 60) return { text: '良好', color: 'text-blue-600' };
    if (score >= 40) return { text: '一般', color: 'text-yellow-600' };
    return { text: '较低', color: 'text-red-600' };
  };

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
            {matches.length > 0 && (
              <button 
                className={`py-2 px-4 ${activeTab === 'results' ? 'font-bold text-blue-500' : 'text-gray-500'}`}
                onClick={() => setActiveTab('results')}
              >
                匹配结果
              </button>
            )}
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
                  onClick={matchResumes}
                  disabled={isMatchLoading}
                >
                  {isMatchLoading ? '匹配中...' : '开始匹配'}
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
                              {resume.skills && resume.skills.map((skill, index) => (
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
                        {jobRequirements.skills && jobRequirements.skills.map((skill, idx) => (
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
                                  <p className="text-sm text-gray-600">{Math.round(match.matchDetails.skillsScore)}%</p>
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
                                  <h4 className="font-medium text-sm mb-1">匹配技能</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {match.matchDetails.matchedSkills && match.matchDetails.matchedSkills.map((skill, idx) => (
                                      <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                        {skill}
                                      </span>
                                    ))}
                                    {(!match.matchDetails.matchedSkills || match.matchDetails.matchedSkills.length === 0) && (
                                      <span className="text-sm text-gray-500">无匹配技能</span>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium text-sm mb-1">缺失技能</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {match.matchDetails.missingSkills && match.matchDetails.missingSkills.map((skill, idx) => (
                                      <span key={idx} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                                        {skill}
                                      </span>
                                    ))}
                                    {(!match.matchDetails.missingSkills || match.matchDetails.missingSkills.length === 0) && (
                                      <span className="text-sm text-gray-500">无缺失技能</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </>
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
