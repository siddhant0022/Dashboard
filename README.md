# Stealthera Health Monitor Dashboard

A scalable, real-time dashboard for monitoring fitness watch data from 100+ Stealthera 4G wearable devices. Built with React.js and Node.js with WebSocket support for live updates.

## Features

### Real-Time Monitoring
- **Live Vitals**: Heart rate, SpO2, HRV, stress score, temperature, blood pressure
- **Device Status**: Battery level, connectivity status, firmware version
- **Fall Detection**: Real-time fall alert notifications
- **Sleep Tracking**: Daily sleep metrics and summaries

### Scalability
- Handles 100+ concurrent watch connections
- Batch API requests with configurable concurrency
- Efficient WebSocket communication
- Optimized polling intervals per data type

### User Interface
- **Dashboard Overview**: Statistics panel with key metrics
- **Watch Cards**: Individual cards showing vitals and alerts
- **Filtering**: Filter by critical alerts, low battery, or offline devices
- **Real-time Updates**: Automatic data refresh via WebSocket
- **Responsive Design**: Works on desktop, tablet, and mobile

### Alerts & Notifications
- Critical vitals detection (abnormal heart rate, low SpO2, high stress)
- Fall detection alerts
- Low battery warnings
- Device connectivity status
- Toast notifications for important events

## Tech Stack

### Backend
- **Node.js** with Express.js
- **Socket.IO** for real-time WebSocket communication
- **Axios** for HTTP requests to Stealthera API
- **Winston** for logging
- **Helmet** for security
- **Compression** for response optimization

### Frontend
- **React 18** with functional components and hooks
- **Socket.IO Client** for WebSocket connection
- **Axios** for REST API calls
- **Recharts** for data visualization
- **React Toastify** for notifications
- **Lucide React** for icons
- **date-fns** for date formatting

## Project Structure

```
stealthera-dashboard/
├── backend/
│   ├── services/
│   │   ├── stealthera-api.js    # Stealthera API client
│   │   ├── data-manager.js      # Data management & polling
│   │   └── logger.js             # Winston logger config
│   ├── server.js                 # Main server with WebSocket
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── WatchCard.js          # Individual watch display
    │   │   ├── StatisticsPanel.js    # Dashboard statistics
    │   │   └── RegisterWatchModal.js # Add watch modal
    │   ├── contexts/
    │   │   └── DashboardContext.js   # Global state management
    │   ├── services/
    │   │   ├── socket.js             # WebSocket service
    │   │   └── api.js                # REST API client
    │   ├── App.js
    │   ├── App.css
    │   ├── index.js
    │   └── index.css
    ├── package.json
    └── .env.example
```

## Installation

### Prerequisites
- Node.js >= 16.0.0
- npm or yarn
- Stealthera API access token

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=5000
STEALTHERA_API_BASE_URL=https://api.stealthera.com/v1
STEALTHERA_API_TOKEN=your_actual_token_here
CLIENT_URL=http://localhost:3000
VITALS_POLLING_INTERVAL=5000
DEVICE_STATUS_POLLING_INTERVAL=30000
FALL_ALERTS_POLLING_INTERVAL=10000
```

5. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

5. Start the development server:
```bash
npm start
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Endpoints

### REST API

#### Health Check
```
GET /api/health
```

#### Watches
```
GET    /api/watches                      # Get all registered watches
POST   /api/watches/register             # Register new watch
DELETE /api/watches/:patientId/:deviceId # Unregister watch
GET    /api/watches/:patientId/:deviceId # Get specific watch
```

#### Vitals
```
GET /api/vitals/:patientId
```

#### Device Info
```
GET /api/device/:deviceId/info
```

#### Fall Alerts
```
GET /api/alerts/fall/:patientId/:deviceId
```

#### Sleep Data
```
GET /api/sleep/:patientId/:date
```

#### Statistics
```
GET /api/statistics
```

### WebSocket Events

#### Client → Server
- `watch:register` - Register a new watch
- `watch:unregister` - Unregister a watch
- `refresh:all` - Manually refresh all data

#### Server → Client
- `initial:data` - Initial data on connection
- `watch:registered` - Watch registered successfully
- `watch:unregistered` - Watch unregistered
- `vitals:updated` - Vitals data updated
- `device:status:updated` - Device status updated
- `alerts:new` - New alerts detected
- `data:updated` - General data update
- `error` - Error notification

## Configuration

### Polling Intervals

Adjust polling intervals based on your needs:

```env
# Check vitals every 5 seconds
VITALS_POLLING_INTERVAL=5000

# Check device status every 30 seconds
DEVICE_STATUS_POLLING_INTERVAL=30000

# Check fall alerts every 10 seconds
FALL_ALERTS_POLLING_INTERVAL=10000

# Check sleep data every 5 minutes
SLEEP_DATA_POLLING_INTERVAL=300000
```

### Concurrency

Control API request concurrency:

```env
# Maximum concurrent API requests
MAX_CONCURRENT_REQUESTS=10

# Request timeout in milliseconds
REQUEST_TIMEOUT=10000

# Maximum retry attempts
MAX_RETRY_ATTEMPTS=3
```

## Scalability Considerations

### For 100+ Watches

1. **Batch Processing**: API requests are batched with configurable concurrency
2. **Efficient Polling**: Different polling intervals for different data types
3. **WebSocket Optimization**: Single WebSocket connection per client
4. **Memory Management**: Limited alert history per watch (last 50)
5. **Connection Pooling**: Reuses HTTP connections

### Performance Tips

- Adjust `MAX_CONCURRENT_REQUESTS` based on API rate limits
- Increase polling intervals if API quota is limited
- Use Redis for distributed caching (future enhancement)
- Consider database storage for historical data

## Deployment

### Backend Deployment

1. Set `NODE_ENV=production`
2. Use process manager (PM2, systemd)
3. Enable HTTPS
4. Configure proper CORS settings
5. Set up monitoring and logging

Example PM2 config:
```bash
pm2 start server.js --name stealthera-backend -i max
```

### Frontend Deployment

1. Build production bundle:
```bash
npm run build
```

2. Serve with nginx or similar:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/build;
    
    location / {
        try_files $uri /index.html;
    }
}
```

## Monitoring & Logging

### Backend Logs
- Logs stored in `logs/` directory
- `error.log` - Error logs only
- `combined.log` - All logs
- Console output in development

### Metrics to Monitor
- Connected clients count
- API response times
- WebSocket connection stability
- Memory usage
- API error rates

## Security

- API token stored in environment variables
- CORS configured for specific origins
- Rate limiting on REST endpoints
- Helmet.js for security headers
- Input validation on all endpoints

## Troubleshooting

### Backend won't start
- Check `.env` file exists and has correct values
- Verify Node.js version >= 16.0.0
- Ensure port 5000 is available

### Frontend can't connect
- Check backend is running
- Verify CORS settings in backend
- Check WebSocket URL in frontend `.env`

### No data updates
- Verify API token is valid
- Check API rate limits
- Review backend logs for errors
- Ensure watches are registered

### High memory usage
- Reduce number of concurrent watches
- Increase polling intervals
- Clear old alert history
- Check for memory leaks in custom code

## Future Enhancements

- [ ] Historical data visualization
- [ ] Advanced analytics and trends
- [ ] Export data to CSV/PDF
- [ ] Email/SMS alert notifications
- [ ] Multi-user authentication
- [ ] Role-based access control
- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Redis caching layer
- [ ] Mobile app (React Native)
- [ ] Advanced filtering and search
- [ ] Custom alert thresholds per patient
- [ ] Integration with hospital systems

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Contact: your-email@example.com

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Built for healthcare teams to monitor patient health in real-time** 🏥❤️
