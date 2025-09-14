import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiService from '../services/apiService';

const Login = ({ setToken, setRole, setUsername }) => {
  const [username, setUsernameLocal] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await apiService.login({
        username: username,
        password: password
      });
      
      const token = response.token;
      const role = response.roles?.[0];
      const user = response.user;
      const actualUsername = user?.username || username;
      
      if (!token) {
        throw new Error('Token not found in response');
      }
      
      localStorage.setItem('token', token);
      localStorage.setItem('role', role || 'Evaluator');
      localStorage.setItem('username', actualUsername);
      localStorage.setItem('userId', user?.id || '');
      
      if (setToken) setToken(token);
      if (setRole) setRole(role || 'Evaluator');
      if (setUsername) setUsername(actualUsername);
      
      navigate('/dashboard', { replace: true });
      
    } catch (error) {
      let errorMessage = 'Invalid username or password.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const errors = Array.isArray(error.response.data.errors) 
          ? error.response.data.errors.join(', ')
          : Object.values(error.response.data.errors).flat().join(', ');
        errorMessage = errors;
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid username or password.';
      } else if (error.response?.status === 400) {
        errorMessage = 'Please check your username and password.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Cannot connect to server. Please check your network connection.';
        console.error('Network error:', error.message);
      } else {
        errorMessage = 'An unexpected error occurred. Please try again.';
        console.error('Unexpected error:', error.message);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-semibold mb-6 text-center">Login</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsernameLocal(e.target.value)}
            placeholder="Enter your username"
            required
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};

export default Login;