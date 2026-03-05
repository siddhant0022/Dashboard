import React from 'react';
import { 
  Heart, Activity, Droplet, Wind, Thermometer, 
  Battery, Wifi, WifiOff, AlertTriangle, TrendingUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import './WatchCard.css';

const WatchCard = ({ watch, onClick }) => {
  const { patientId, deviceId, vitals, deviceInfo, alerts, lastUpdate } = watch;

  const getBatteryIcon = (percentage) => {
    if (!percentage) return <Battery className="icon" />;
    
    const level = percentage;
    const color = level < 20 ? 'text-red' : level < 50 ? 'text-yellow' : 'text-green';
    
    return <Battery className={`icon ${color}`} />;
  };

  const getVitalStatus = (vital, normalRange) => {
    if (!vital) return 'normal';
    if (vital < normalRange.min || vital > normalRange.max) return 'critical';
    if (vital < normalRange.warn.min || vital > normalRange.warn.max) return 'warning';
    return 'normal';
  };

  const heartRateStatus = getVitalStatus(vitals?.heart_rate, {
    min: 40,
    max: 120,
    warn: { min: 50, max: 100 }
  });

  const spo2Status = getVitalStatus(vitals?.spo2, {
    min: 90,
    max: 100,
    warn: { min: 95, max: 100 }
  });

  const hasCriticalAlerts = alerts?.some(a => a.severity === 'high');
  const isOnline = deviceInfo?.connectivity_status === 'online';

  return (
    <div 
      className={`watch-card ${hasCriticalAlerts ? 'critical' : ''}`}
      onClick={() => onClick && onClick(watch)}
    >
      {/* Header */}
      <div className="watch-card-header">
        <div className="watch-info">
          <h3>Patient: {patientId}</h3>
          <p className="device-id">Device: {deviceId}</p>
        </div>
        <div className="status-icons">
          {isOnline ? (
            <Wifi className="icon text-green" title="Online" />
          ) : (
            <WifiOff className="icon text-gray" title="Offline" />
          )}
          {getBatteryIcon(deviceInfo?.battery_percentage)}
          {deviceInfo?.battery_percentage && (
            <span className="battery-text">{deviceInfo.battery_percentage}%</span>
          )}
        </div>
      </div>

      {/* Alerts */}
      {hasCriticalAlerts && (
        <div className="alert-banner">
          <AlertTriangle className="icon" />
          <span>Critical alerts detected</span>
        </div>
      )}

      {/* Vitals Grid */}
      <div className="vitals-grid">
        {/* Heart Rate */}
        <div className={`vital-item ${heartRateStatus}`}>
          <Heart className="icon" />
          <div className="vital-content">
            <span className="vital-label">Heart Rate</span>
            <span className="vital-value">
              {vitals?.heart_rate ? `${vitals.heart_rate} BPM` : 'N/A'}
            </span>
          </div>
        </div>

        {/* SpO2 */}
        <div className={`vital-item ${spo2Status}`}>
          <Droplet className="icon" />
          <div className="vital-content">
            <span className="vital-label">SpO2</span>
            <span className="vital-value">
              {vitals?.spo2 ? `${vitals.spo2}%` : 'N/A'}
            </span>
          </div>
        </div>

        {/* HRV */}
        <div className="vital-item">
          <Activity className="icon" />
          <div className="vital-content">
            <span className="vital-label">HRV</span>
            <span className="vital-value">
              {vitals?.hrv ? vitals.hrv : 'N/A'}
            </span>
          </div>
        </div>

        {/* Stress Score */}
        <div className="vital-item">
          <Wind className="icon" />
          <div className="vital-content">
            <span className="vital-label">Stress</span>
            <span className="vital-value">
              {vitals?.stress_score ? vitals.stress_score : 'N/A'}
            </span>
          </div>
        </div>

        {/* Temperature */}
        <div className="vital-item">
          <Thermometer className="icon" />
          <div className="vital-content">
            <span className="vital-label">Temp</span>
            <span className="vital-value">
              {vitals?.body_temperature ? `${vitals.body_temperature}°C` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Blood Pressure */}
        <div className="vital-item">
          <TrendingUp className="icon" />
          <div className="vital-content">
            <span className="vital-label">BP</span>
            <span className="vital-value">
              {vitals?.blood_pressure 
                ? `${vitals.blood_pressure.systolic}/${vitals.blood_pressure.diastolic}` 
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="watch-card-footer">
        <span className="last-update">
          {lastUpdate 
            ? `Updated ${formatDistanceToNow(new Date(lastUpdate), { addSuffix: true })}`
            : 'No updates yet'}
        </span>
        {alerts && alerts.length > 0 && (
          <span className="alert-count">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
};

export default WatchCard;
