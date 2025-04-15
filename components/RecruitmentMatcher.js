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

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        setIsLoadingResumes(true);
        const response = await fetch('/api/fetchResumes');

        if (!response.ok) throw new Error('简历获取失败');
        const data = await response.json();
        setResumes(data.resumes || []);
      } catch (err) {
        setError('无法加载简历：' + err.message);
      } finally {
        setIsLoadingResumes(false);
      }
    };

    fetchResumes();
  }, []);

  const matchResumes = async () => {
    if (!jobDescription.trim()) {
      setError('请先输入职位描述！');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/aiMatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription, resumes }),
      });

      if (!response.ok) throw new Error('AI 匹配失败');
      const data = await response.json();

      setMatches(data.matches || []);
      setJobRequirements(data.jobRequirements || null);
      setActiveTab('results');
    } catch (err) {
      setError('匹配出错：' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">智能简历匹配</h1>

      {error && <div className="text-red-600 mb-4">⚠ {error}</div>}

      <div className="mb-4">
        <textarea
          className="w-full h-32 border rounded p-3"
          placeholder="输入职位 JD..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
      </div>

      <button
        onClick={matchResumes}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {isLoading ? '匹配中...' : '开始匹配'}
      </button>

      {activeTab === 'results' && (
        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">匹配结果</h2>

          {jobRequirements && (
            <div className="mb-6 p-4 border rounded bg-gray-50">
              <h3 className="font-medium mb-2">职位要求</h3>
              <ul className="list-disc pl-5 text-sm">
                <li>职位：{jobRequirements.jobTitle || '未指定'}</li>
                <li>技能：{jobRequirements.skills?.join('、') || '—'}</li>
                <li>经验：{jobRequirements.experience || '未指定'}</li>
                <li>学历：{jobRequirements.education || '未指定'}</li>
              </ul>
            </div>
          )}

          {matches.length > 0 ? (
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2">姓名</th>
                  <th className="border px-3 py-2">职位</th>
                  <th className="border px-3 py-2">匹配度</th>
                  <th className="border px-3 py-2">分析</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="border px-3 py-2">{m.name}</td>
                    <td className="border px-3 py-2">{m.title}</td>
                    <td className="border px-3 py-2">{m.matchScore ?? '--'}%</td>
                    <td className="border px-3 py-2">{m.matchDetails?.analysis || '暂无分析'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-600">暂无匹配结果</p>
          )}
        </div>
      )}
    </div>
  );
}
