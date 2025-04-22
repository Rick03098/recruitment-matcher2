import { useState, useEffect } from 'react';
import Link from 'next/link';
import ResumeLibrary from './ResumeLibrary';
import PdfDropzone from './PdfDropzone';
import FilePreview from './FilePreview';

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
  const [jobPdfFile, setJobPdfFile] = useState(null);
  const [jobPdfParsedData, setJobPdfParsedData] = useState(null);

  // 获取简历数据
  useEffect(() => {
    fetchResumes();
  }, [activeTab]);

  // 获取简历数据的函数
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

  // 处理职位描述PDF上传
  const handleJobPdfUpload = async (files) => {
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
      
      if (!response
