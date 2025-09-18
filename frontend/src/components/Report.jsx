import { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const Report = ({ token }) => {
  const [reportData, setReportData] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [filters, setFilters] = useState({
    projectId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchProjects();
    fetchReportData();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await apiService.get(`/api/reports/projects`, { token });
      setProjects(response);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await apiService.get(`/api/reports/evaluation-report?${params}`, { token });
      setReportData(response);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const applyFilters = () => {
    fetchReportData();
  };

  const resetFilters = () => {
    setFilters({
      projectId: '',
      startDate: '',
      endDate: ''
    });
    setTimeout(() => {
      fetchReportData();
    }, 100);
  };
  
  const getReportFilename = (extension = 'pdf') => {
    const nzDateTime = new Date().toLocaleString('sv-SE', {
      timeZone: 'Pacific/Auckland'
    });
    
    return `evaluation_report_${nzDateTime.slice(0, 10).replace(/-/g, '')}_${nzDateTime.slice(11, 16).replace(':', '')}.${extension}`;
  };

  const exportToCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const blob = await apiService.getBlob(`/api/reports/evaluation-report/csv?${params}`, token);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getReportFilename('csv');
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  const exportToPdf = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const blob = await apiService.getBlob(`/api/reports/evaluation-report/pdf?${params}`, token);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getReportFilename('pdf');
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  const printToPdf = () => {
    const printStyles = document.createElement('style');
    printStyles.textContent = `
      @media print {
        @page {
          size: A4 landscape;
          margin: 0.5in;
        }
        
        /* Hide everything by default */
        nav,
        .max-w-7xl > * {
          display: none !important;
        }
        
        /* Show only the table container */
        .table-container {
          display: block !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
        }
        
        /* Add title */
        .table-container::before {
          content: "Evaluation Report - Generated on ${new Date().toLocaleString('en-GB')}";
          display: block !important;
          font-size: 18px !important;
          font-weight: bold !important;
          text-align: center !important;
          margin-bottom: 20px !important;
          color: #000 !important;
          padding: 10px 0 !important;
          border-bottom: 2px solid #333 !important;
        }
        
        body {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
          font-size: 10px !important;
        }
        
        /* Table styling for print */
        table {
          width: 100% !important;
          border-collapse: collapse !important;
          font-size: 9px !important;
          margin: 0 !important;
        }
        
        th, td {
          border: 1px solid #333 !important;
          padding: 8px 4px !important;
          text-align: left !important;
          vertical-align: top !important;
          word-wrap: break-word !important;
        }
        
        th {
          background-color: #f0f0f0 !important;
          font-weight: bold !important;
          font-size: 10px !important;
        }
        
        tr:nth-child(even) {
          background-color: #f8f8f8 !important;
        }
        
        /* Screenshot images */
        .screenshot-img {
          max-height: 30px !important;
          max-width: 30px !important;
          object-fit: cover !important;
          border: 1px solid #ddd !important;
        }
        
        /* Score badges - preserve colors */
        .bg-green-50 {
          background-color: #dcfce7 !important;
        }
        .bg-yellow-50 {
          background-color: #fef3c7 !important;
        }
        .bg-red-50 {
          background-color: #fee2e2 !important;
        }
        .text-green-600 {
          color: #16a34a !important;
        }
        .text-yellow-600 {
          color: #d97706 !important;
        }
        .text-red-600 {
          color: #dc2626 !important;
        }
        
        /* Links */
        a {
          color: #2563eb !important;
          text-decoration: none !important;
        }
        
        /* Remove scrolling */
        .overflow-x-auto {
          overflow: visible !important;
        }
        
        /* Adjust column widths for print */
        th:nth-child(1), td:nth-child(1) { width: 15% !important; }
        th:nth-child(2), td:nth-child(2) { width: 20% !important; }
        th:nth-child(3), td:nth-child(3) { width: 25% !important; }
        th:nth-child(4), td:nth-child(4) { width: 20% !important; }
        th:nth-child(5), td:nth-child(5) { width: 20% !important; }
        
        /* Text wrapping */
        .max-w-xs {
          max-width: none !important;
          white-space: normal !important;
        }
        
        .truncate {
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }
        
        .break-all {
          word-break: break-all !important;
        }
      }
    `;
    
    document.head.appendChild(printStyles);
    
    const tableSection = document.querySelector('.bg-white.rounded-lg.shadow-sm.border.overflow-hidden');
    if (tableSection) {
      tableSection.classList.add('table-container');
    }
    
    window.print();
    
    setTimeout(() => {
      document.head.removeChild(printStyles);
      if (tableSection) {
        tableSection.classList.remove('table-container');
      }
    }, 1000);
  };

  const openImageModal = (imageSrc) => {
    setSelectedImage(imageSrc);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const getScoreColor = (score) => {
    if (score >= 4) return 'text-green-600 bg-green-50';
    if (score >= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const calculateAverageScore = (categoryScores) => {
    if (!categoryScores || categoryScores.length === 0) return 0;
    const total = categoryScores.reduce((sum, score) => sum + score.score, 0);
    return Math.round((total / categoryScores.length) * 10) / 10;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Evaluation Report</h1>
        <p className="text-gray-600">Comprehensive overview of all evaluations with scores and screenshots</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
            <select
              name="projectId"
              value={filters.projectId}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-end space-x-2">
            <button
              onClick={applyFilters}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              Apply Filters
            </button>
            <button
              onClick={resetFilters}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 focus:ring-2 focus:ring-gray-500"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-gray-600">
          Showing {reportData.length} evaluation{reportData.length !== 1 ? 's' : ''}
        </div>
        <div className="space-x-3">
          <button
            onClick={exportToCsv}
            className="bg-emerald-800 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 inline-flex items-center no-print"
            disabled={loading || reportData.length === 0}
          >
            📊 Export CSV
          </button>
          <button
            onClick={exportToPdf}
            className="bg-rose-800 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:ring-2 focus:ring-red-500 inline-flex items-center no-print"
            disabled={loading || reportData.length === 0}
          >
            📄 Export PDF
          </button>
          <button
            onClick={printToPdf}
            className="bg-blue-800 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 inline-flex items-center no-print"
            disabled={loading || reportData.length === 0}
          >
            🖨️ Print to PDF
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report data...</p>
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {reportData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Website</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category Scores</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Screenshots</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.map((evaluation, index) => (
                    <tr key={evaluation.evaluationId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{evaluation.projectName}</div>
                          <div className="text-sm text-gray-500 max-w-xs truncate" title={evaluation.projectDescription}>
                            {evaluation.projectDescription}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Avg: <span className="font-semibold">{evaluation.averageScore || 0}/5</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <a
                            href={evaluation.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium break-all"
                          >
                            {evaluation.websiteUrl}
                          </a>
                          <div className="text-xs text-gray-400 mt-1">
                            {formatDate(evaluation.createdAt)} • {evaluation.userId}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {evaluation.categoryScores && evaluation.categoryScores.length > 0 ? (
                            evaluation.categoryScores.map((score, scoreIndex) => (
                              <div key={scoreIndex} className="flex items-center justify-between text-xs">
                                <span className="font-medium text-gray-700 max-w-24 truncate" title={score.category}>
                                  {score.category}
                                </span>
                                <span className={`px-2 py-1 rounded-full font-bold ${getScoreColor(score.score)}`}>
                                  {score.score}/5
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">No scores</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {evaluation.screenshotAnnotations && evaluation.screenshotAnnotations.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {evaluation.screenshotAnnotations.slice(0, 3).map((annotation, annIndex) => (
                              annotation.screenshot && (
                                <div key={annIndex} className="relative">
                                  <img
                                    src={`data:image/jpeg;base64,${annotation.screenshot}`}
                                    alt="Screenshot"
                                    className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80 screenshot-img"
                                    onClick={() => openImageModal(`data:image/jpeg;base64,${annotation.screenshot}`)}
                                  />
                                  {annotation.category && (
                                    <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs px-1 rounded text-[10px]">
                                      {annotation.category.slice(0, 3)}
                                    </div>
                                  )}
                                </div>
                              )
                            ))}
                            {evaluation.screenshotAnnotations.length > 3 && (
                              <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-500">
                                +{evaluation.screenshotAnnotations.length - 3}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No screenshots</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          {evaluation.notes && (
                            <div className="text-xs text-gray-600 max-w-xs">
                              <span className="font-medium">Notes:</span> {evaluation.notes}
                            </div>
                          )}
                          {evaluation.categoryScores && evaluation.categoryScores.some(cs => cs.comment) && (
                            <div className="text-xs">
                              <span className="font-medium text-gray-600">Comments:</span>
                              <ul className="mt-1 space-y-1">
                                {evaluation.categoryScores
                                  .filter(cs => cs.comment)
                                  .slice(0, 2)
                                  .map((cs, idx) => (
                                    <li key={idx} className="text-gray-500">
                                      • {cs.comment}
                                    </li>
                                  ))
                                }
                              </ul>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No evaluations found</h3>
              <p className="text-gray-500">Try adjusting your filters or create some evaluations first.</p>
            </div>
          )}
        </div>
      )}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeImageModal}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedImage}
              alt="Screenshot"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 text-white text-2xl bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Report;