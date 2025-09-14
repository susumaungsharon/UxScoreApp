import apiConfig from '../config/api';

class ApiService {
  constructor() {
    this.baseURL = apiConfig.baseURL;
    this.timeout = apiConfig.timeout;
  }

  getAuthToken(providedToken) {
    return providedToken || localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  getHeaders(includeAuth = true, providedToken = null) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = this.getAuthToken(providedToken);
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const config = {
        method: options.method || 'GET',
        headers: this.getHeaders(options.auth !== false, options.token),
        signal: controller.signal,
      };

      if (options.body) {
        config.body = options.body;
      }

      const response = await fetch(url, config);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
  
  async getBlob(endpoint, token = null) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const config = {
        method: 'GET',
        headers: this.getHeaders(true, token),
        signal: controller.signal,
      };

      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
  
  async login(credentials) {
    return this.request('/api/Auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      auth: false,
    });
  }

  async register(userData) {
    return this.request('/api/Auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      auth: false,
    });
  }

}

const apiService = new ApiService();
export default apiService;