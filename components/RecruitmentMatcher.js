import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function RecruitmentMatcher() {
  const [jobDescription, setJobDescription] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const [resumes, setResumes] = useState([]);
  const [matches, setMatches] = useState([]);
  const [jobRequirements, setJobRequirements] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMatchLoading, setIsMatchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('');
  const [jobFile, setJobFile] = useState(null);
  const [isPdfUploading, setIsPdfUploading] = useState(false);

  // 获取简历数据
  useEffect(() => {
    const fetchResumes = async () => {
      if (activeTab !== 'resumes') return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/fetchResumes');
        const data = await response.json();
        
        if (data.resumes) {
          setResumes(data.resumes);
          setDataSource(data.source || '未知');
        }
        
        if (data.error) {
          setError(`错误: ${data.error}`);
        }
      } catch (err) {
        console.error('获取简历失败:', err);
        setError('无法加载简历库，请稍后再试');
        setDataSource('错误');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResumes();
  }, [activeTab]);

  // 处理文件上传
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 检查文件类型
    if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'].includes(file.type)) {
      setError('仅支持PDF、DOC、DOCX和TXT文件格式');
      return;
    }

    // 检查文件大小 (小于10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过10MB');
      return;
    }

    setJobFile(file);
    
    try {
      setIsPdfUploading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('file', file);
      
      // 这里可以添加上传文件的逻辑
      // 简单起见，仅设置文件名到job description中
      setJobDescription(`从文件 "${file.name}" 中提取的职位描述\n\n请在此编辑职位需求...`);
      
    } catch (err) {
      console.error('文件处理失败:', err);
      setError(`文件处理失败: ${err.message}`);
    } finally {
      setIsPdfUploading(false);
    }
  };

  // 匹配简历
  const matchResumes = async () => {
    if (!jobDescription.trim()) {
      setError('请先输入职位描述！');
      return;
    }

    setIsMatchLoading(true);
    setError(null);
    
    try {
      // 总是从Airtable获取最新数据
      const resumeResponse = await fetch('/api/fetchResumes');
      if (!resumeResponse.ok) {
        throw new Error('获取简历数据失败');
      }
      
      const resumeData = await resumeResponse.json();
      const resumesToMatch = resumeData.resumes || [];
      
      // 更新简历库
      setResumes(resumesToMatch);
      setDataSource(resumeData.source || '未知');
      
      if (resumesToMatch.length === 0) {
        throw new Error('没有简历数据可供匹配');
      }
      
      // 调用匹配API
      const response = await fetch('/api/match', {
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
      setMatches(data.matches || []);
      setJobRequirements(data.jobRequirements || null);
      setActiveTab('results'); // 切换到结果页
    } catch (error) {
      console.error('匹配过程出错:', error);
      setError('匹配过程出错: ' + error.message);
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

  // 清除已上传的文件
  const handleClearFile = () => {
    setJobFile(null);
  };

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          {/* 标题和上传简历链接 */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">智能招聘匹配系统</h1>
            <Link href="/upload">
              <a className="bg-green-500 text-white font-bold py-2 px-4 rounded hover:bg-green-600">
                上传简历
              </a>
            </Link>
          </div>
          
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
                  placeholder="请粘贴职位描述，例如：寻找有经验的前端开发工程师，熟悉JavaScript、React等技术..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
              
              {/* PDF上传区域 */}
              <div className="mb-4 p-4 border rounded bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold">
                    或上传职位描述文件
                  </label>
                  <span className="text-xs text-gray-500">支持的格式: PDF, DOCX, TXT (最大10MB)</span>
                </div>
                
                {!jobFile ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="job-file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isPdfUploading}
                    />
                    <label htmlFor="job-file" className="cursor-pointer">
                      <div className="mb-3">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4h-8m-12 0H8a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="mt-1 text-sm text-gray-600">
                          {isPdfUploading ? '上传中...' : '点击选择文件或将文件拖放到此处'}
                        </p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                    <div className="flex items-center">
                      <svg className="h-8 w-8 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 5V1H7.97a2 2 0 00-2 2v18a2 2 0 002 2h9.06a2 2 0 002-2V8h-4a2 2 0 01-2-2zM9 17a1 1 0 110-2h6a1 1 0 110 2H9zm0-4a1 1 0 110-2h6a1 1 0 110 2H9z" />
                        <path d="M14 1v5a1 1 0 001 1h5l-6-6z" />
                      </svg>
                      <div className="ml-3">
                        <p className="text-sm font-medium">{jobFile.name}</p>
                        <p className="text-xs text-gray-500">{Math.round(jobFile.size / 1024)} KB</p>
                      </div>
                    </div>
                    <button 
                      className="text-gray-400 hover:text-gray-500"
                      onClick={handleClearFile}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              
              <div>
                <button
                  className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600"
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
              <h2 className="text-xl font-semibold mb-4">
                简历库
                {dataSource && (
                  <span className="text-sm text-gray-500 ml-2">
                    (数据源: {dataSource})
                  </span>
                )}
              </h2>
              
              {isLoading ? (
                <p className="text-center py-4">加载中...</p>
              ) : resumes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-2 text-left">姓名</th>
                        <th className="px-4 py-2 text-left">技能</th>
                        <th className="px-4 py-2 text-left">来源</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumes.map((resume, index) => (
                        <tr key={resume.id || index} className="border-t">
                          <td className="px-4 py-2">{resume.name || '未知'}</td>
                          <td className="px-4 py-2">
                            {resume.skills && Array.isArray(resume.skills) ? 
                              resume.skills.join(', ') : 
                              '无技能信息'}
                          </td>
                          <td className="px-4 py-2">
                            {resume.fileSource ? (
                              <span className="flex items-center">
                                <svg className="h-4 w-4 text-red-500 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 5V1H7.97a2 2 0 00-2 2v18a2 2 0 002 2h9.06a2 2 0 002-2V8h-4a2 2 0 01-2-2zM9 17a1 1 0 110-2h6a1 1 0 110 2H9zm0-4a1 1 0 110-2h6a1 1 0 110 2H9z" />
                                  <path d="M14 1v5a1 1 0 001 1h5l-6-6z" />
                                </svg>
                                PDF文件
                              </span>
                            ) : (
                              <span>数据库</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-4">暂无简历数据</p>
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
                  </div>
                </div>
              )}
              
              {matches.length > 0 ? (
                <div className="space-y-6">
                  {matches.map((match, index) => {
                    const matchLevel = getMatchLevel(match.matchScore);
                    
                    return (
                      <div key={match.id || index} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between bg-gray-50 p-4">
                          <div className="flex items-center">
                            <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                              {index + 1}
                            </div>
                            <div>
                              <h3 className="font-medium">{match.name}</h3>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">{match.matchScore}%</div>
                            <div className={`text-sm ${matchLevel.color}`}>匹配度{matchLevel.text}</div>
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <div className="mb-4">
                            <h4 className="font-medium text-sm mb-2">匹配分析</h4>
                            <p className="text-sm text-gray-700">{match.matchDetails?.analysis || '无匹配分析'}</p>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <h4 className="font-medium text-sm mb-1">匹配技能</h4>
                              <div className="flex flex-wrap gap-1">
                                {match.matchDetails?.matchedSkills && match.matchDetails.matchedSkills.length > 0 ? (
                                  match.matchDetails.matchedSkills.map((skill, idx) => (
                                    <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                      {skill}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-sm text-gray-500">无匹配技能</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium text-sm mb-1">缺失技能</h4>
                              <div className="flex flex-wrap gap-1">
                                {match.matchDetails?.missingSkills && match.matchDetails.missingSkills.length > 0 ? (
                                  match.matchDetails.missingSkills.map((skill, idx) => (
                                    <span key={idx} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                                      {skill}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-sm text-gray-500">无缺失技能</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {match.fileSource && (
                            <div className="flex items-center">
                              <svg className="h-5 w-5 text-red-500 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 5V1H7.97a2 2 0 00-2 2v18a2 2 0 002 2h9.06a2 2 0 002-2V8h-4a2 2 0 01-2-2zM9 17a1 1 0 110-2h6a1 1 0 110 2H9zm0-4a1 1 0 110-2h6a1 1 0 110 2H9z" />
                                <path d="M14 1v5a1 1 0 001 1h5l-6-6z" />
                              </svg>
                              <a href="#" className="text-sm text-blue-500 hover:text-blue-700">
                                查看简历文件
                              </a>
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
