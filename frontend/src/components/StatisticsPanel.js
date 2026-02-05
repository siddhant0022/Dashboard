import React from 'react';
import { Activity, AlertTriangle, Battery, Wifi } from 'lucide-react';
import './StatisticsPanel.css';

const StatisticsPanel = ({ statistics }) => {
  if (!statistics) {
    return (
      <div className="statistics-panel">
        <p>Loading statistics...</p>
      </div>
    );
  }

  const stats = [
    {
      icon: <Activity className="stat-icon" />,
      label: 'Total Watches',
      value: statistics.totalWatches,
      color: 'blue'
    },
    {
      icon: <Wifi className="stat-icon" />,
      label: 'Active Devices',
      value: statistics.activeDevices,
      color: 'green'
    },
    {
      icon: <Battery className="stat-icon" />,
      label: 'Low Battery',
      value: statistics.lowBatteryDevices,
      color: statistics.lowBatteryDevices > 0 ? 'yellow' : 'gray'
    },
    {
      icon: <AlertTriangle className="stat-icon" />,
      label: 'Critical Alerts',
      value: statistics.criticalAlerts,
      color: statistics.criticalAlerts > 0 ? 'red' : 'gray'
    }
  ];

  return (
    <div className="statistics-panel">
      {stats.map((stat, index) => (
        <div key={index} className={`stat-card stat-${stat.color}`}>
          <div className="stat-icon-container">
            {stat.icon}
          </div>
          <div className="stat-content">
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatisticsPanel;
