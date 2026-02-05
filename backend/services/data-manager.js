const logger = require('./logger');

class DataManager {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.watchRegistry = new Map(); // deviceId -> { patientId, deviceId, lastUpdate, data }
    this.pollingIntervals = new Map();
    this.cache = new Map();
    this.alertHistory = new Map();
  }

  /**
   * Register a watch for monitoring
   * @param {string} patientId - Patient identifier
   * @param {string} deviceId - Device identifier
   */
  registerWatch(patientId, deviceId) {
    const key = `${patientId}-${deviceId}`;
    
    if (!this.watchRegistry.has(key)) {
      this.watchRegistry.set(key, {
        patientId,
        deviceId,
        lastUpdate: null,
        vitals: null,
        deviceInfo: null,
        alerts: [],
        sleepData: null
      });
      
      logger.info(`Registered watch: Patient ${patientId}, Device ${deviceId}`);
    }
    
    return key;
  }

  /**
   * Unregister a watch
   * @param {string} patientId - Patient identifier
   * @param {string} deviceId - Device identifier
   */
  unregisterWatch(patientId, deviceId) {
    const key = `${patientId}-${deviceId}`;
    this.watchRegistry.delete(key);
    this.stopPolling(key);
    logger.info(`Unregistered watch: Patient ${patientId}, Device ${deviceId}`);
  }

  /**
   * Get all registered watches
   * @returns {Array} Array of watch data
   */
  getAllWatches() {
    return Array.from(this.watchRegistry.entries()).map(([key, data]) => ({
      key,
      ...data
    }));
  }

  /**
   * Get specific watch data
   * @param {string} patientId - Patient identifier
   * @param {string} deviceId - Device identifier
   * @returns {Object|null} Watch data
   */
  getWatch(patientId, deviceId) {
    const key = `${patientId}-${deviceId}`;
    return this.watchRegistry.get(key) || null;
  }

  /**
   * Update vitals data for a watch
   * @param {string} patientId - Patient identifier
   * @param {string} deviceId - Device identifier
   */
  async updateVitals(patientId, deviceId) {
    const key = `${patientId}-${deviceId}`;
    const watch = this.watchRegistry.get(key);
    
    if (!watch) return null;

    const vitalsData = await this.apiClient.getPatientVitals(patientId);
    
    if (vitalsData.success) {
      watch.vitals = vitalsData.data;
      watch.lastUpdate = new Date();
      this.watchRegistry.set(key, watch);
      
      // Check for critical vitals and create alerts
      this.checkCriticalVitals(patientId, deviceId, vitalsData.data);
    }

    return vitalsData;
  }

  /**
   * Update device info
   * @param {string} deviceId - Device identifier
   */
  async updateDeviceInfo(deviceId) {
    const deviceData = await this.apiClient.getDeviceInfo(deviceId);
    
    if (deviceData.success) {
      // Update all watches with this device
      for (const [key, watch] of this.watchRegistry.entries()) {
        if (watch.deviceId === deviceId) {
          watch.deviceInfo = deviceData.data;
          this.watchRegistry.set(key, watch);
        }
      }
    }

    return deviceData;
  }

  /**
   * Fetch fall alerts
   * @param {string} patientId - Patient identifier
   * @param {string} deviceId - Device identifier
   */
  async updateFallAlerts(patientId, deviceId) {
    const key = `${patientId}-${deviceId}`;
    const watch = this.watchRegistry.get(key);
    
    if (!watch) return null;

    const alertsData = await this.apiClient.getFallAlerts(patientId, deviceId);
    
    if (alertsData.success && alertsData.data.events) {
      // Only keep new alerts
      const existingAlertIds = new Set(watch.alerts.map(a => a.timestamp));
      const newAlerts = alertsData.data.events.filter(
        alert => !existingAlertIds.has(alert.timestamp)
      );
      
      if (newAlerts.length > 0) {
        watch.alerts = [...newAlerts, ...watch.alerts].slice(0, 50); // Keep last 50 alerts
        this.watchRegistry.set(key, watch);
        
        return { hasNewAlerts: true, newAlerts, allAlerts: watch.alerts };
      }
    }

    return { hasNewAlerts: false, allAlerts: watch.alerts || [] };
  }

  /**
   * Fetch sleep data
   * @param {string} patientId - Patient identifier
   * @param {string} date - Date in YYYY-MM-DD format
   */
  async updateSleepData(patientId, deviceId, date) {
    const key = `${patientId}-${deviceId}`;
    const watch = this.watchRegistry.get(key);
    
    if (!watch) return null;

    const sleepData = await this.apiClient.getSleepSummary(patientId, date);
    
    if (sleepData.success) {
      watch.sleepData = sleepData.data;
      this.watchRegistry.set(key, watch);
    }

    return sleepData;
  }

  /**
   * Check for critical vital signs and generate internal alerts
   * @param {string} patientId - Patient identifier
   * @param {string} deviceId - Device identifier
   * @param {Object} vitals - Vitals data
   */
  checkCriticalVitals(patientId, deviceId, vitals) {
    const alerts = [];

    // Critical heart rate
    if (vitals.heart_rate && (vitals.heart_rate < 40 || vitals.heart_rate > 120)) {
      alerts.push({
        type: 'CRITICAL_HEART_RATE',
        severity: 'high',
        message: `Heart rate ${vitals.heart_rate} BPM is outside normal range`,
        value: vitals.heart_rate,
        timestamp: new Date().toISOString()
      });
    }

    // Low SpO2
    if (vitals.spo2 && vitals.spo2 < 90) {
      alerts.push({
        type: 'LOW_SPO2',
        severity: 'high',
        message: `SpO2 ${vitals.spo2}% is critically low`,
        value: vitals.spo2,
        timestamp: new Date().toISOString()
      });
    }

    // High stress score
    if (vitals.stress_score && vitals.stress_score > 80) {
      alerts.push({
        type: 'HIGH_STRESS',
        severity: 'medium',
        message: `Stress score ${vitals.stress_score} is elevated`,
        value: vitals.stress_score,
        timestamp: new Date().toISOString()
      });
    }

    // Abnormal blood pressure
    if (vitals.blood_pressure) {
      const { systolic, diastolic } = vitals.blood_pressure;
      if (systolic > 140 || systolic < 90 || diastolic > 90 || diastolic < 60) {
        alerts.push({
          type: 'ABNORMAL_BP',
          severity: 'medium',
          message: `Blood pressure ${systolic}/${diastolic} is outside normal range`,
          value: `${systolic}/${diastolic}`,
          timestamp: new Date().toISOString()
        });
      }
    }

    if (alerts.length > 0) {
      const key = `${patientId}-${deviceId}`;
      const watch = this.watchRegistry.get(key);
      if (watch) {
        watch.alerts = [...alerts, ...watch.alerts].slice(0, 50);
        this.watchRegistry.set(key, watch);
      }
    }

    return alerts;
  }

  /**
   * Batch update all watches
   */
  async updateAllWatches() {
    const watches = Array.from(this.watchRegistry.values());
    
    if (watches.length === 0) return;

    logger.info(`Updating ${watches.length} watches...`);

    // Update vitals for all patients
    const patientIds = [...new Set(watches.map(w => w.patientId))];
    const vitalsResults = await this.apiClient.batchGetVitals(patientIds);
    
    // Update device info for all devices
    const deviceIds = [...new Set(watches.map(w => w.deviceId))];
    const deviceResults = await this.apiClient.batchGetDeviceInfo(deviceIds);

    // Map results back to watches
    vitalsResults.forEach(result => {
      if (result.success) {
        for (const [key, watch] of this.watchRegistry.entries()) {
          if (watch.patientId === result.data.patient_id) {
            watch.vitals = result.data;
            watch.lastUpdate = new Date();
            this.watchRegistry.set(key, watch);
            this.checkCriticalVitals(watch.patientId, watch.deviceId, result.data);
          }
        }
      }
    });

    deviceResults.forEach(result => {
      if (result.success) {
        for (const [key, watch] of this.watchRegistry.entries()) {
          if (watch.deviceId === result.data.device_id) {
            watch.deviceInfo = result.data;
            this.watchRegistry.set(key, watch);
          }
        }
      }
    });

    logger.info(`Updated ${watches.length} watches successfully`);
  }

  /**
   * Get dashboard statistics
   */
  getStatistics() {
    const watches = Array.from(this.watchRegistry.values());
    
    return {
      totalWatches: watches.length,
      activeDevices: watches.filter(w => w.deviceInfo?.connectivity_status === 'online').length,
      lowBatteryDevices: watches.filter(w => w.deviceInfo?.battery_percentage < 20).length,
      criticalAlerts: watches.filter(w => 
        w.alerts.some(a => a.severity === 'high')
      ).length,
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Clear all data
   */
  clearAll() {
    this.watchRegistry.clear();
    this.pollingIntervals.forEach(interval => clearInterval(interval));
    this.pollingIntervals.clear();
    this.cache.clear();
    logger.info('All data cleared');
  }
}

module.exports = DataManager;
