const axios = require('axios');
const logger = require('./logger');

class StealtheraAPIClient {
  constructor() {
    this.baseURL = process.env.STEALTHERA_API_BASE_URL || 'https://api.stealthera.com/v1';
    this.token = process.env.STEALTHERA_API_TOKEN;
    this.timeout = parseInt(process.env.REQUEST_TIMEOUT) || 10000;
    this.maxRetries = parseInt(process.env.MAX_RETRY_ATTEMPTS) || 3;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`API Request: ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;
        
        if (!config || !config.retry) {
          config.retry = 0;
        }

        if (config.retry < this.maxRetries && this.isRetryableError(error)) {
          config.retry += 1;
          logger.warn(`Retrying request (${config.retry}/${this.maxRetries}): ${config.url}`);
          
          await this.delay(1000 * config.retry);
          return this.client(config);
        }

        logger.error('API Response Error:', {
          url: config?.url,
          status: error.response?.status,
          message: error.message
        });
        
        return Promise.reject(error);
      }
    );
  }

  isRetryableError(error) {
    return (
      !error.response ||
      error.response.status === 429 ||
      error.response.status >= 500
    );
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get patient vitals
   * @param {string} patientId - Patient identifier
   * @returns {Promise<Object>} Vitals data
   */
  async getPatientVitals(patientId) {
    try {
      const response = await this.client.get(`/vitals/${patientId}`);
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Error fetching vitals for patient ${patientId}:`, error.message);
      return {
        success: false,
        error: error.message,
        patientId,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get fall detection alerts
   * @param {string} patientId - Patient identifier
   * @param {string} deviceId - Device identifier
   * @returns {Promise<Object>} Fall alerts data
   */
  async getFallAlerts(patientId, deviceId) {
    try {
      const response = await this.client.get(`/alerts/fall/${patientId}/${deviceId}`);
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Error fetching fall alerts for patient ${patientId}, device ${deviceId}:`, error.message);
      return {
        success: false,
        error: error.message,
        patientId,
        deviceId,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get sleep summary
   * @param {string} patientId - Patient identifier
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Object>} Sleep data
   */
  async getSleepSummary(patientId, date) {
    try {
      const response = await this.client.get(`/sleep/${patientId}/${date}`);
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Error fetching sleep data for patient ${patientId}, date ${date}:`, error.message);
      return {
        success: false,
        error: error.message,
        patientId,
        date,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get device information
   * @param {string} deviceId - Device identifier
   * @returns {Promise<Object>} Device info
   */
  async getDeviceInfo(deviceId) {
    try {
      const response = await this.client.get(`/device/${deviceId}/info`);
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Error fetching device info for ${deviceId}:`, error.message);
      return {
        success: false,
        error: error.message,
        deviceId,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Batch fetch vitals for multiple patients
   * @param {Array<string>} patientIds - Array of patient identifiers
   * @returns {Promise<Array>} Array of vitals data
   */
  async batchGetVitals(patientIds) {
    const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 10;
    const results = [];
    
    for (let i = 0; i < patientIds.length; i += maxConcurrent) {
      const batch = patientIds.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        batch.map(patientId => this.getPatientVitals(patientId))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Batch fetch device info for multiple devices
   * @param {Array<string>} deviceIds - Array of device identifiers
   * @returns {Promise<Array>} Array of device info
   */
  async batchGetDeviceInfo(deviceIds) {
    const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 10;
    const results = [];
    
    for (let i = 0; i < deviceIds.length; i += maxConcurrent) {
      const batch = deviceIds.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        batch.map(deviceId => this.getDeviceInfo(deviceId))
      );
      results.push(...batchResults);
    }
    
    return results;
  }
}

module.exports = StealtheraAPIClient;
