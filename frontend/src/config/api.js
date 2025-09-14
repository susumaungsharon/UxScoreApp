const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5010';

export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
};

export default apiConfig;