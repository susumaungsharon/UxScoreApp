import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/apiService';

const Dashboard = ({ token, role }) => {
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newProject, setNewProject] = useState({ 
    name: '', 
    description: '', 
    websites: [''], 
    userId: '' 
  });

  const isAdmin = role === 'Admin';

  const addWebsiteField = () => {
    setNewProject({
      ...newProject,
      websites: [...newProject.websites, '']
    });
  };

  const removeWebsiteField = (index) => {
    const updatedWebsites = newProject.websites.filter((_, i) => i !== index);
    setNewProject({
      ...newProject,
      websites: updatedWebsites
    });
  };

  const updateWebsite = (index, value) => {
    const updatedWebsites = [...newProject.websites];
    updatedWebsites[index] = value;
    setNewProject({
      ...newProject,
      websites: updatedWebsites
    });
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await apiService.get(`/api/Projects`, { token });
      setProjects(response);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [token]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: newProject.name,
        description: newProject.description,
        websites: newProject.websites.filter(w => w.trim()),
        userId: newProject.userId || 'apple',
      };
      
      if (isEditMode && editingProject) {
        await apiService.put(`/api/Projects/${editingProject.id}`, payload, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } else {
        await apiService.post(`/api/Projects`, payload, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
      
      handleCancel();
      await fetchProjects();
    } catch (error) {
      console.error('Error saving project:', error.response ? error.response.data : error.message);
      alert('Failed to save project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setIsEditMode(true);
    setNewProject({
      name: project.name,
      description: project.description || '',
      websites: project.websites && project.websites.length > 0 ? project.websites : [''],
      userId: project.createdBy
    });
    setIsModalOpen(true);
  };

  const handleDeleteProject = async (project) => {
    if (!window.confirm(`Are you sure you want to delete the project "${project.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiService.delete(`/api/Projects/${project.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      await fetchProjects();
      alert('Project deleted successfully.');
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingProject(null);
    setNewProject({ name: '', description: '', websites: [''], userId: '' });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getProjectStats = (project) => {
    const websiteCount = Array.isArray(project.websites) ? project.websites.length : 0;
    return {
      websiteCount,
    };
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Projects Dashboard</h1>
        <p className="text-gray-600">Manage and monitor your website evaluation projects</p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-gray-600">
          {projects.length} project{projects.length !== 1 ? 's' : ''} total
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 inline-flex items-center shadow-sm"
          disabled={loading}
        >
          Create Project
        </button>
      </div>

      {loading && projects.length === 0 && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          {projects.length > 0 ? (
            projects.map((project) => {
              const stats = getProjectStats(project);
              return (
                <div key={project.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="bg-gray-50 px-6 py-4 border-b">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{project.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>📅 Created {formatDate(project.createdAt || new Date())}</span>
                          <span>👤 {project.createdBy}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Websites</div>
                          <div className="text-2xl font-bold text-blue-600">{stats.websiteCount}</div>
                        </div>
                        {isAdmin && (
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleEditProject(project)}
                              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:text-blue-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                              title="Edit Project"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProject(project)}
                              className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-800 focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors"
                              title="Delete Project"
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
                  </div>

                  <div className="p-6">
                    {project.description && (
                      <div className="mb-4">
                        <p className="text-gray-700 leading-relaxed">{project.description}</p>
                      </div>
                    )}

                    {project.websites && project.websites.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                          🌐 Project Websites
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {project.websites.map((website, index) => (
                            <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                              <a
                                href={website.startsWith('http') ? website : `https://${website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 font-medium text-sm break-all"
                              >
                                {website}
                              </a>
                              <div className="mt-1 flex items-center text-xs text-gray-500">
                                <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                                Ready for evaluation
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex space-x-3">
                        <Link
                          to={`/evaluations/${project.id}/${encodeURIComponent(project.name)}`}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 inline-flex items-center text-sm font-medium transition-colors"
                        >
                          📊 View Evaluations
                        </Link>
                      </div>
                      <div className="text-sm text-gray-500">
                        Last updated: {formatDate(project.updatedAt || project.createdAt || new Date())}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
              <div className="text-gray-400 text-6xl mb-4">📁</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-6">Create your first project to start evaluating websites.</p>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl mx-4 my-8 max-h-screen overflow-y-auto">
            <h3 className="text-xl font-semibold mb-6 text-gray-900">
              {isEditMode ? 'Edit Project' : 'Create New Project'}
            </h3>
            
            <form onSubmit={handleCreateProject} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Enter project name"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Describe your project goals and scope"
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Website URLs
                  </label>
                  <button
                    type="button"
                    onClick={addWebsiteField}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Add Website
                  </button>
                </div>
                <div className="space-y-3">
                  {newProject.websites.map((website, index) => (
                    <div key={index} className="flex gap-3">
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => updateWebsite(index, e.target.value)}
                        placeholder="https://example.com"
                        className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {newProject.websites.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeWebsiteField(index)}
                          className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:ring-2 focus:ring-red-500"
                          title="Remove website"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Add the websites you want to evaluate in this project
                </p>
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
                  {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Project' : 'Create Project')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;