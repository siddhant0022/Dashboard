require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const logger = require('./services/logger');
const StealtheraAPIClient = require('./services/stealthera-api');
const DataManager = require('./services/data-manager');

const watchRoutes = require('./routes/watchRoutes')

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.raw({
  type: "*/*",
  limit: "10mb"
}))

app.use("/pb", watchRoutes)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Initialize services
const apiClient = new StealtheraAPIClient();
const dataManager = new DataManager(apiClient);

// Polling intervals
let vitalsPollingInterval = null;
let deviceStatusInterval = null;
let fallAlertsInterval = null;

// Connected clients tracking
const connectedClients = new Set();

// ============================================================================
// REST API ENDPOINTS
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connectedClients: connectedClients.size
  });
});

/**
 * Get all watches
 */
app.get('/api/watches', (req, res) => {
  try {
    const watches = dataManager.getAllWatches();
    res.json({
      success: true,
      count: watches.length,
      data: watches
    });
  } catch (error) {
    logger.error('Error fetching watches:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Register a new watch
 */
app.post('/api/watches/register', (req, res) => {
  try {
    const { patientId, deviceId } = req.body;
    
    if (!patientId || !deviceId) {
      return res.status(400).json({
        success: false,
        error: 'patientId and deviceId are required'
      });
    }

    const key = dataManager.registerWatch(patientId, deviceId);
    
    // Immediately fetch initial data
    Promise.all([
      dataManager.updateVitals(patientId, deviceId),
      dataManager.updateDeviceInfo(deviceId),
      dataManager.updateFallAlerts(patientId, deviceId)
    ]).then(() => {
      const watch = dataManager.getWatch(patientId, deviceId);
      io.emit('watch:registered', { key, watch });
    });

    res.json({
      success: true,
      message: 'Watch registered successfully',
      key
    });
  } catch (error) {
    logger.error('Error registering watch:', error);
    res.status(500).json({
      success: false,
      
      error: error.message
    });
  }
});

/**
 * Unregister a watch
 */
app.delete('/api/watches/:patientId/:deviceId', (req, res) => {
  try {
    const { patientId, deviceId } = req.params;
    dataManager.unregisterWatch(patientId, deviceId);
    
    io.emit('watch:unregistered', { patientId, deviceId });
    
    res.json({
      success: true,
      message: 'Watch unregistered successfully'
    });
  } catch (error) {
    logger.error('Error unregistering watch:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get specific watch data
 */
app.get('/api/watches/:patientId/:deviceId', (req, res) => {
  try {
    const { patientId, deviceId } = req.params;
    const watch = dataManager.getWatch(patientId, deviceId);
    
    if (!watch) {
      return res.status(404).json({
        success: false,
        error: 'Watch not found'
      });
    }

    res.json({
      success: true,
      data: watch
    });
  } catch (error) {
    logger.error('Error fetching watch:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get patient vitals
 */
app.get('/api/vitals/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const vitals = await apiClient.getPatientVitals(patientId);
    res.json(vitals);
  } catch (error) {
    logger.error('Error fetching vitals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get device info
 */
app.get('/api/device/:deviceId/info', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const deviceInfo = await apiClient.getDeviceInfo(deviceId);
    res.json(deviceInfo);
  } catch (error) {
    logger.error('Error fetching device info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get fall alerts
 */
app.get('/api/alerts/fall/:patientId/:deviceId', async (req, res) => {
  try {
    const { patientId, deviceId } = req.params;
    const alerts = await apiClient.getFallAlerts(patientId, deviceId);
    res.json(alerts);
  } catch (error) {
    logger.error('Error fetching fall alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get sleep summary
 */
app.get('/api/sleep/:patientId/:date', async (req, res) => {
  try {
    const { patientId, date } = req.params;
    const sleepData = await apiClient.getSleepSummary(patientId, date);
    res.json(sleepData);
  } catch (error) {
    logger.error('Error fetching sleep data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get dashboard statistics
 */
app.get('/api/statistics', (req, res) => {
  try {
    const stats = dataManager.getStatistics();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// SOCKET.IO HANDLERS
// ============================================================================

io.on('connection', (socket) => {
  connectedClients.add(socket.id);
  logger.info(`Client connected: ${socket.id}. Total clients: ${connectedClients.size}`);

  // Send initial data
  socket.emit('initial:data', {
    watches: dataManager.getAllWatches(),
    statistics: dataManager.getStatistics()
  });

  // Handle watch registration
  socket.on('watch:register', async ({ patientId, deviceId }) => {
    try {
      const key = dataManager.registerWatch(patientId, deviceId);
      
      // Fetch initial data
      await Promise.all([
        dataManager.updateVitals(patientId, deviceId),
        dataManager.updateDeviceInfo(deviceId),
        dataManager.updateFallAlerts(patientId, deviceId)
      ]);

      const watch = dataManager.getWatch(patientId, deviceId);
      io.emit('watch:registered', { key, watch });
    } catch (error) {
      logger.error('Error registering watch via socket:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle watch unregistration
  socket.on('watch:unregister', ({ patientId, deviceId }) => {
    try {
      dataManager.unregisterWatch(patientId, deviceId);
      io.emit('watch:unregistered', { patientId, deviceId });
    } catch (error) {
      logger.error('Error unregistering watch via socket:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle manual refresh request
  socket.on('refresh:all', async () => {
    try {
      await dataManager.updateAllWatches();
      io.emit('data:updated', {
        watches: dataManager.getAllWatches(),
        statistics: dataManager.getStatistics()
      });
    } catch (error) {
      logger.error('Error refreshing data:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    connectedClients.delete(socket.id);
    logger.info(`Client disconnected: ${socket.id}. Total clients: ${connectedClients.size}`);
  });
});

// ============================================================================
// POLLING LOGIC
// ============================================================================

/**
 * Start vitals polling
 */
function startVitalsPolling() {
  const interval = parseInt(process.env.VITALS_POLLING_INTERVAL) || 5000;
  
  vitalsPollingInterval = setInterval(async () => {
    try {
      await dataManager.updateAllWatches();
      
      const watches = dataManager.getAllWatches();
      const stats = dataManager.getStatistics();
      
      // Emit updates to all connected clients
      io.emit('vitals:updated', { watches, statistics: stats });
      
    } catch (error) {
      logger.error('Error in vitals polling:', error);
    }
  }, interval);
  
  logger.info(`Vitals polling started with ${interval}ms interval`);
}

/**
 * Start device status polling
 */
function startDeviceStatusPolling() {
  const interval = parseInt(process.env.DEVICE_STATUS_POLLING_INTERVAL) || 30000;
  
  deviceStatusInterval = setInterval(async () => {
    try {
      const watches = dataManager.getAllWatches();
      const deviceIds = [...new Set(watches.map(w => w.deviceId))];
      
      for (const deviceId of deviceIds) {
        await dataManager.updateDeviceInfo(deviceId);
      }
      
      io.emit('device:status:updated', {
        watches: dataManager.getAllWatches()
      });
      
    } catch (error) {
      logger.error('Error in device status polling:', error);
    }
  }, interval);
  
  logger.info(`Device status polling started with ${interval}ms interval`);
}

/**
 * Start fall alerts polling
 */
function startFallAlertsPolling() {
  const interval = parseInt(process.env.FALL_ALERTS_POLLING_INTERVAL) || 10000;
  
  fallAlertsInterval = setInterval(async () => {
    try {
      const watches = dataManager.getAllWatches();
      
      for (const watch of watches) {
        const alertsData = await dataManager.updateFallAlerts(
          watch.patientId,
          watch.deviceId
        );
        
        if (alertsData && alertsData.hasNewAlerts) {
          io.emit('alerts:new', {
            patientId: watch.patientId,
            deviceId: watch.deviceId,
            alerts: alertsData.newAlerts
          });
        }
      }
    } catch (error) {
      logger.error('Error in fall alerts polling:', error);
    }
  }, interval);
  
  logger.info(`Fall alerts polling started with ${interval}ms interval`);
}

/**
 * Stop all polling
 */
function stopPolling() {
  if (vitalsPollingInterval) {
    clearInterval(vitalsPollingInterval);
    logger.info('Vitals polling stopped');
  }
  if (deviceStatusInterval) {
    clearInterval(deviceStatusInterval);
    logger.info('Device status polling stopped');
  }
  if (fallAlertsInterval) {
    clearInterval(fallAlertsInterval);
    logger.info('Fall alerts polling stopped');
  }
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start polling when server starts
  startVitalsPolling();
  startDeviceStatusPolling();
  startFallAlertsPolling();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  stopPolling();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  stopPolling();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
