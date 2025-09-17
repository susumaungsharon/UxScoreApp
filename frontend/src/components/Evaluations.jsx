import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiService from '../services/apiService';

const Evaluations = ({ token, role }) => {
  const { projectId, projectName } = useParams();
  const [evaluations, setEvaluations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategoryToAdd, setSelectedCategoryToAdd] = useState('');
  const [formData, setFormData] = useState({
    projectId: projectId,
    websiteUrl: '',
    notes: '',
    categoryScores: []
  });

  const isAdmin = role === 'Admin';

  const fetchCategories = async () => {
    try {
      const response = await apiService.get('/api/categories');
      setCategories(response);

      const initialCategoryScores = response.map(category => ({
        categoryId: category.id,
        categoryName: category.name,
        score: 1,
        comment: '',
        screenshot: null,
        annotation: ''
      }));
      
      setFormData(prev => ({
        ...prev,
        categoryScores: initialCategoryScores
      }));
    } catch (error) {
      console.error('Error fetching categories:', error);
      const fallbackCategories = [
        { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Navigation and Flow' },
        { id: '00839fa9-1488-4f9b-9850-d9c9b63ceb88', name: 'Search and Filters' },
        { id: 'cc0b54e0-9d3e-4fd7-9223-75f1f2c8aea5', name: 'Visual Design' },
        { id: '06315079-4387-4368-bebc-cb2c352517eb', name: 'Content & Info Clarity' },
        { id: '3a97b348-3fc6-4f5a-b102-1f9ad0e0a1b4', name: 'Responsiveness' },
        { id: '213bbc6c-9475-4bd1-87ee-4f6815a3e63c', name: 'Performance' }
      ];
      setCategories(fallbackCategories);
      
      const fallbackCategoryScores = fallbackCategories.map(category => ({
        categoryId: category.id,
        categoryName: category.name,
        score: 1,
        comment: '',
        screenshot: null,
        annotation: ''
      }));
      
      setFormData(prev => ({
        ...prev,
        categoryScores: fallbackCategoryScores
      }));
    }
  };

  const fetchProjectWebsites = async () => {
    try {
      const response = await apiService.get(`/api/projects/${projectId}/websites`, { token });
      setWebsites(response);
    } catch (error) {
      console.error('Error fetching project websites:', error);
    }
  };

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const response = await apiService.get(`/api/evaluations?projectId=${projectId}`);
      setEvaluations(response);
    } catch (error) {
      console.error('Error fetching evaluations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvaluation = async (evaluation) => {
    if (!window.confirm('Are you sure you want to delete this evaluation? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.delete(`/api/evaluations/${evaluation.id}`);
      await fetchEvaluations();
      alert('Evaluation deleted successfully.');
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      alert('Failed to delete evaluation. Please try again.');
    }
  };

  const uploadFormData = async (url, formData, method = 'POST') => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    const config = {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData
    };

    const response = await fetch(`${apiService.baseURL}${url}`, config);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw { response: { data: errorData, status: response.status } };
    }
    
    return response.json();
  };

  const handleCreateEvaluation = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const data = new FormData();
    
    data.append('projectId', formData.projectId);
    data.append('websiteUrl', formData.websiteUrl);
    data.append('notes', formData.notes || '');
    
    formData.categoryScores.forEach((categoryScore, index) => {
      data.append(`categoryScores[${index}].categoryId`, categoryScore.categoryId);
      data.append(`categoryScores[${index}].score`, categoryScore.score);
      data.append(`categoryScores[${index}].comment`, categoryScore.comment || '');
      data.append(`categoryScores[${index}].annotation`, categoryScore.annotation || '');
      
      if (categoryScore.screenshot) {
        data.append(`categoryScores[${index}].screenshot`, categoryScore.screenshot);
      }
    });

    try {
      if (isEditMode && editingEvaluation) {
        await uploadFormData(`/api/evaluations/${editingEvaluation.id}`, data, 'PUT');
        console.log('Evaluation updated successfully!');
      } else {
        await uploadFormData('/api/evaluations', data, 'POST');
        console.log('Evaluation created successfully!');
      }

      handleCancel();
      await fetchEvaluations();
    } catch (error) {
      if (error.response && error.response.data && error.response.data.errors) {
        const validationErrors = error.response.data.errors;
        if (validationErrors.Notes) {
          console.error(validationErrors.Notes[0]);
        } else {
          console.error('Failed to save evaluation. Check console for details.');
        }
      } else {
        console.error('Error saving evaluation:', error.response ? error.response.data : error.message);
      }
      alert('Failed to save evaluation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCategoryScoreChange = (index, field, value) => {
    const updatedScores = [...formData.categoryScores];
    updatedScores[index] = {
      ...updatedScores[index],
      [field]: field === 'score' ? parseInt(value) : value
    };
    setFormData(prev => ({
      ...prev,
      categoryScores: updatedScores
    }));
  };

  const removeCategoryScore = (index) => {
    const updatedScores = formData.categoryScores.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      categoryScores: updatedScores
    }));
  };

  const addCategoryScore = () => {
    if (selectedCategoryToAdd && categories.find(cat => cat.id === selectedCategoryToAdd)) {
      const selectedCategory = categories.find(cat => cat.id === selectedCategoryToAdd);
      setFormData(prev => ({
        ...prev,
        categoryScores: [...prev.categoryScores, {
          categoryId: selectedCategory.id,
          categoryName: selectedCategory.name,
          score: 1,
          comment: '',
          screenshot: null,
          annotation: ''
        }]
      }));
      setSelectedCategoryToAdd('');
    }
  };

  const resetForm = () => {
    const initialCategoryScores = categories.map(category => ({
      categoryId: category.id,
      categoryName: category.name,
      score: 1,
      comment: '',
      screenshot: null,
      annotation: ''
    }));
    
    setFormData({
      projectId: projectId,
      websiteUrl: '',
      notes: '',
      categoryScores: initialCategoryScores
    });
  };

  const handleEditEvaluation = (evaluation) => {
    setEditingEvaluation(evaluation);
    setIsEditMode(true);
    
    const editCategoryScores = evaluation.categoryScores.map(cs => {
      const category = categories.find(cat => cat.id === cs.categoryId);
      return {
        categoryId: cs.categoryId,
        categoryName: category?.name || 'Unknown Category',
        score: cs.score,
        comment: cs.comment || '',
        screenshot: null,
        annotation: cs.annotation || '',
        existingScreenshot: cs.screenshot
      };
    });
    
    setFormData({
      projectId: projectId,
      websiteUrl: evaluation.websiteUrl,
      notes: evaluation.notes || '',
      categoryScores: editCategoryScores
    });
    
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    resetForm();
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingEvaluation(null);
    setSelectedCategoryToAdd('');
  };

  useEffect(() => {
    fetchCategories();
    fetchEvaluations();
    fetchProjectWebsites();
  }, [projectId, token]);

  const getScoreColor = (score) => {
    if (score >= 4) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getScoreIcon = (score) => {
    if (score >= 4) return '😊';
    if (score >= 3) return '😐';
    return '😟';
  };

  const openImageModal = (imageSrc) => {
    setSelectedImage(imageSrc);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getOverallProjectScore = () => {
    if (evaluations.length === 0) return 0;
    
    const totalScore = evaluations.reduce((sum, evaluation) => {
      if (evaluation.categoryScores && evaluation.categoryScores.length > 0) {
        const avgScore = evaluation.categoryScores.reduce((scoreSum, score) => scoreSum + score.score, 0) / evaluation.categoryScores.length;
        return sum + avgScore;
      }
      return sum;
    }, 0);
    
    return (totalScore / evaluations.length).toFixed(1);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <nav className="flex items-center text-sm text-gray-600 mb-4">
          <Link to="/dashboard" className="hover:text-blue-600">Projects</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">{decodeURIComponent(projectName)}</span>
        </nav>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {decodeURIComponent(projectName)} Evaluations
            </h1>
            <p className="text-gray-600">Manage and review website evaluations for this project</p>
          </div>
          {evaluations.length > 0 && (
            <div className="text-right">
              <div className="text-sm text-gray-600">Project Score</div>
              <div className="text-3xl font-bold text-blue-600">{getOverallProjectScore()}/5</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-gray-600">
          {evaluations.length} evaluation{evaluations.length !== 1 ? 's' : ''} completed
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 inline-flex items-center shadow-sm"
            disabled={loading}
          >
            Create Evaluation
          </button>
        </div>
      </div>

      {loading && evaluations.length === 0 && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading evaluations...</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          {evaluations.length > 0 ? (
            evaluations.map((evaluation) => {
              const avgScore = evaluation.categoryScores && evaluation.categoryScores.length > 0
                ? (evaluation.categoryScores.reduce((sum, score) => sum + score.score, 0) / evaluation.categoryScores.length).toFixed(1)
                : 0;

              return (
                <div key={evaluation.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="bg-gray-50 px-6 py-4 border-b">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="text-xl font-semibold text-blue-600 hover:text-blue-800 mb-2">
                          <a href={evaluation.websiteUrl} target="_blank" rel="noopener noreferrer">
                            {evaluation.websiteUrl}
                          </a>
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                            Completed
                          </span>
                          <span>📅 {formatDate(evaluation.createdAt)}</span>
                          <span>👤 {evaluation.createdBy}</span>
                          {evaluation.categoryScores && evaluation.categoryScores.length > 0 && (
                            <span>📋 {evaluation.categoryScores.length} categories evaluated</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Overall Score</div>
                          <div className={`text-2xl font-bold ${
                            avgScore >= 4 ? 'text-green-600' : 
                            avgScore >= 3 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {avgScore}/5
                          </div>
                        </div>
                        {(
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleEditEvaluation(evaluation)}
                              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:text-blue-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                              title="Edit Evaluation"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteEvaluation(evaluation)}
                              className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-800 focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors"
                              title="Delete Evaluation"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {evaluation.notes && (
                      <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                        <p className="text-gray-700">{evaluation.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    {evaluation.categoryScores && evaluation.categoryScores.length > 0 && (
                      <div className="mb-6">
                        <h5 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
                          📊 Category Evaluations
                        </h5>
                        <div className="space-y-4">
                          {evaluation.categoryScores.map((score) => (
                            <div key={score.id} className={`border rounded-lg p-4 ${getScoreColor(score.score)}`}>
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-lg">{score.category || categories.find(c => c.id === score.categoryId)?.name}</span>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-2xl">{getScoreIcon(score.score)}</span>
                                      <span className="font-bold text-xl">{score.score}/5</span>
                                    </div>
                                  </div>
                                  {score.comment && (
                                    <p className="text-sm text-gray-700 mb-2 italic">{score.comment}</p>
                                  )}
                                </div>
                              </div>
                              
                              {score.screenshot && (
                                <div className="mt-3 border-t pt-3">
                                  <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0">
                                      <img
                                        src={`data:image/jpeg;base64,${score.screenshot}`}
                                        alt="Category Screenshot"
                                        className="w-32 h-24 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity border-2 border-gray-200"
                                        onClick={() => openImageModal(`data:image/jpeg;base64,${score.screenshot}`)}
                                      />
                                      <p className="text-xs text-gray-500 mt-1 text-center">Click to enlarge</p>
                                    </div>
                                    {score.annotation && (
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-700 mb-1">Screenshot Notes:</p>
                                        <p className="text-sm text-gray-600 leading-relaxed">{score.annotation}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex space-x-3">
                      </div>
                      <div className="text-sm text-gray-500">
                        Evaluation #{evaluation.id}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No evaluations yet</h3>
              <p className="text-gray-500 mb-6">Start evaluating websites for this project to see results here.</p>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl mx-4 my-8 max-h-screen overflow-y-auto">
            <h3 className="text-xl font-semibold mb-6 text-gray-900">
              {isEditMode ? 'Edit Evaluation' : 'Create New Evaluation'}
            </h3>
            <form onSubmit={handleCreateEvaluation} className="space-y-6">
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Website URL *</label>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={formData.websiteUrl}
                      readOnly
                      className="w-full p-3 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                    />
                  ) : (
                    <select
                      name="websiteUrl"
                      value={formData.websiteUrl}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select a website</option>
                      {websites.map((website, index) => (
                        <option key={`${website.id}-${index}`} value={website.url}>
                          {website.url}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Add any notes about this evaluation..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-b pb-2">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">Category Evaluations</h4>
                    <p className="text-sm text-gray-600">Score each category and optionally add a screenshot with notes</p>
                  </div>
                  
                  {categories.filter(cat => !formData.categoryScores.map(cs => cs.categoryId).includes(cat.id)).length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-3">Select Category to Add</h5>
                      <div className="flex items-center space-x-3">
                        <select
                          value={selectedCategoryToAdd}
                          onChange={(e) => setSelectedCategoryToAdd(e.target.value)}
                          className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Choose a category...</option>
                          {categories
                            .filter(cat => !formData.categoryScores.map(cs => cs.categoryId).includes(cat.id))
                            .map(category => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))
                          }
                        </select>
                        <button
                          type="button"
                          onClick={addCategoryScore}
                          disabled={!selectedCategoryToAdd}
                          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {formData.categoryScores.map((categoryScore, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-4 relative">
                    <button
                      type="button"
                      onClick={() => removeCategoryScore(index)}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 focus:ring-2 focus:ring-red-500 flex items-center justify-center text-sm font-bold"
                      title="Remove this category"
                    >
                      ×
                    </button>
                    
                    <div className="flex items-center justify-between pr-10">
                      <h5 className="text-md font-medium text-gray-800">{categoryScore.categoryName}</h5>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700">Score:</label>
                        <select
                          value={categoryScore.score}
                          onChange={(e) => handleCategoryScoreChange(index, 'score', e.target.value)}
                          className="p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value={1}>1 - Poor</option>
                          <option value={2}>2 - Fair</option>
                          <option value={3}>3 - Good</option>
                          <option value={4}>4 - Very Good</option>
                          <option value={5}>5 - Excellent</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                      <input
                        type="text"
                        value={categoryScore.comment}
                        onChange={(e) => handleCategoryScoreChange(index, 'comment', e.target.value)}
                        placeholder="Optional comment about this category..."
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Screenshot (Optional)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleCategoryScoreChange(index, 'screenshot', e.target.files[0])}
                          className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                        />
                        {isEditMode && categoryScore.existingScreenshot && (
                          <div className="mt-2">
                            <img
                              src={`data:image/jpeg;base64,${categoryScore.existingScreenshot}`}
                              alt="Current screenshot"
                              className="w-20 h-16 object-cover rounded border"
                            />
                            <p className="text-xs text-gray-500 mt-1">Current screenshot (upload new to replace)</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Screenshot Notes</label>
                        <textarea
                          value={categoryScore.annotation}
                          onChange={(e) => handleCategoryScoreChange(index, 'annotation', e.target.value)}
                          placeholder="Describe what this screenshot shows..."
                          rows={2}
                          className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {formData.categoryScores.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-lg mb-2">No categories selected</p>
                    <p className="text-sm">Select categories from the dropdown above to evaluate this website</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 font-medium"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 font-medium disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Evaluation' : 'Create Evaluation')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={closeImageModal}>
          <div className="relative max-w-4xl max-h-4xl p-4">
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

export default Evaluations;