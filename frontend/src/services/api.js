import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    if (error.response) {
      // Server responded with error
      throw new Error(error.response.data.error || 'An error occurred');
    } else if (error.request) {
      // Request made but no response
      throw new Error('No response from server. Please check your connection.');
    } else {
      throw new Error('Error setting up request');
    }
  }
);

const api = {
  // Health check
  async checkHealth() {
    const response = await apiClient.get('/health');
    return response.data;
  },

  // Watches
  async getAllWatches() {
    const response = await apiClient.get('/watches');
    return response.data;
  },

  async registerWatch(patientId, deviceId) {
    const response = await apiClient.post('/watches/register', {
      patientId,
      deviceId
    });
    return response.data;
  },

  async unregisterWatch(patientId, deviceId) {
    const response = await apiClient.delete(`/watches/${patientId}/${deviceId}`);
    return response.data;
  },

  async getWatch(patientId, deviceId) {
    const response = await apiClient.get(`/watches/${patientId}/${deviceId}`);
    return response.data;
  },

  // Vitals
  async getVitals(patientId) {
    const response = await apiClient.get(`/vitals/${patientId}`);
    return response.data;
  },

  // Device info
  async getDeviceInfo(deviceId) {
    const response = await apiClient.get(`/device/${deviceId}/info`);
    return response.data;
  },

  // Fall alerts
  async getFallAlerts(patientId, deviceId) {
    const response = await apiClient.get(`/alerts/fall/${patientId}/${deviceId}`);
    return response.data;
  },

  // Sleep data
  async getSleepData(patientId, date) {
    const response = await apiClient.get(`/sleep/${patientId}/${date}`);
    return response.data;
  },

  // Statistics
  async getStatistics() {
    const response = await apiClient.get('/statistics');
    return response.data;
  }
};

export default api;
