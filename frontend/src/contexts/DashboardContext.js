import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import socketService from '../services/socket';
import api from '../services/api';
import { toast } from 'react-toastify';

const DashboardContext = createContext();

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
};

export const DashboardProvider = ({ children }) => {
  const [watches, setWatches] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedWatch, setSelectedWatch] = useState(null);

  // Initialize connection and fetch initial data
  useEffect(() => {
    const initialize = async () => {
      try {
        // Connect to WebSocket
        socketService.connect(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');
        setIsConnected(true);

        // Fetch initial data
        const [watchesData, statsData] = await Promise.all([
          api.getAllWatches(),
          api.getStatistics()
        ]);

        setWatches(watchesData.data || []);
        setStatistics(statsData.data);
        setLoading(false);
      } catch (error) {
        console.error('Initialization error:', error);
        toast.error('Failed to initialize dashboard');
        setLoading(false);
      }
    };

    initialize();

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!isConnected) return;

    // Initial data from server
    socketService.on('initial:data', (data) => {
      setWatches(data.watches || []);
      setStatistics(data.statistics);
    });

    // Watch registered
    socketService.on('watch:registered', ({ key, watch }) => {
      setWatches(prev => {
        const exists = prev.find(w => w.key === key);
        if (exists) {
          return prev.map(w => w.key === key ? { key, ...watch } : w);
        }
        return [...prev, { key, ...watch }];
      });
      toast.success(`Watch registered: ${watch.patientId}`);
    });

    // Watch unregistered
    socketService.on('watch:unregistered', ({ patientId, deviceId }) => {
      const key = `${patientId}-${deviceId}`;
      setWatches(prev => prev.filter(w => w.key !== key));
      toast.info(`Watch unregistered: ${patientId}`);
    });

    // Vitals updated
    socketService.on('vitals:updated', ({ watches: updatedWatches, statistics: stats }) => {
      setWatches(updatedWatches || []);
      setStatistics(stats);
    });

    // Device status updated
    socketService.on('device:status:updated', ({ watches: updatedWatches }) => {
      setWatches(updatedWatches || []);
    });

    // New alerts
    socketService.on('alerts:new', ({ patientId, deviceId, alerts }) => {
      setWatches(prev => prev.map(w => {
        if (w.patientId === patientId && w.deviceId === deviceId) {
          return { ...w, alerts: [...alerts, ...(w.alerts || [])] };
        }
        return w;
      }));

      // Show toast for critical alerts
      alerts.forEach(alert => {
        if (alert.severity === 'high') {
          toast.error(`Critical Alert: ${alert.message}`, {
            autoClose: false
          });
        }
      });
    });

    // Data updated
    socketService.on('data:updated', ({ watches: updatedWatches, statistics: stats }) => {
      setWatches(updatedWatches || []);
      setStatistics(stats);
    });

    // Error handling
    socketService.on('error', ({ message }) => {
      toast.error(message);
    });

    // Cleanup
    return () => {
      socketService.off('initial:data');
      socketService.off('watch:registered');
      socketService.off('watch:unregistered');
      socketService.off('vitals:updated');
      socketService.off('device:status:updated');
      socketService.off('alerts:new');
      socketService.off('data:updated');
      socketService.off('error');
    };
  }, [isConnected]);

  // Actions
  const registerWatch = useCallback(async (patientId, deviceId) => {
    try {
      await api.registerWatch(patientId, deviceId);
      // Socket will handle the update via 'watch:registered' event
    } catch (error) {
      toast.error(`Failed to register watch: ${error.message}`);
      throw error;
    }
  }, []);

  const unregisterWatch = useCallback(async (patientId, deviceId) => {
    try {
      await api.unregisterWatch(patientId, deviceId);
      // Socket will handle the update via 'watch:unregistered' event
    } catch (error) {
      toast.error(`Failed to unregister watch: ${error.message}`);
      throw error;
    }
  }, []);

  const refreshAll = useCallback(() => {
    socketService.refreshAll();
    toast.info('Refreshing all data...');
  }, []);

  const getWatchByKey = useCallback((key) => {
    return watches.find(w => w.key === key);
  }, [watches]);

  const getCriticalAlerts = useCallback(() => {
    return watches.filter(w => 
      w.alerts?.some(alert => alert.severity === 'high')
    );
  }, [watches]);

  const value = {
    watches,
    statistics,
    isConnected,
    loading,
    selectedWatch,
    setSelectedWatch,
    registerWatch,
    unregisterWatch,
    refreshAll,
    getWatchByKey,
    getCriticalAlerts
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};
