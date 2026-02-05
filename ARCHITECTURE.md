# System Architecture

## Overview

The Stealthera Health Monitor is a full-stack application with real-time data synchronization capabilities.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              React Frontend (Port 3000)              │  │
│  │                                                      │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │ Dashboard   │  │  Watch Cards │  │  Modals    │ │  │
│  │  │ Context     │  │  Statistics  │  │  Filters   │ │  │
│  │  └─────────────┘  └──────────────┘  └────────────┘ │  │
│  │                                                      │  │
│  │  ┌─────────────────────────────────────────────┐   │  │
│  │  │         State Management (Context API)      │   │  │
│  │  └─────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP (REST API)
                           │ WebSocket (Socket.IO)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     SERVER LAYER                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Node.js + Express (Port 5000)              │  │
│  │                                                      │  │
│  │  ┌───────────────┐         ┌───────────────────┐   │  │
│  │  │  REST API     │         │  WebSocket (IO)   │   │  │
│  │  │  Endpoints    │         │  Events Handler   │   │  │
│  │  └───────────────┘         └───────────────────┘   │  │
│  │                                                      │  │
│  │  ┌─────────────────────────────────────────────┐   │  │
│  │  │            Services Layer                    │   │  │
│  │  │  ┌──────────────┐  ┌──────────────────────┐ │   │  │
│  │  │  │ Data Manager │  │ Stealthera API Client│ │   │  │
│  │  │  │              │  │                      │ │   │  │
│  │  │  │ - Watch      │  │ - HTTP Client       │ │   │  │
│  │  │  │   Registry   │  │ - Retry Logic       │ │   │  │
│  │  │  │ - Polling    │  │ - Batch Processing  │ │   │  │
│  │  │  │ - Alerts     │  │ - Error Handling    │ │   │  │
│  │  │  └──────────────┘  └──────────────────────┘ │   │  │
│  │  └─────────────────────────────────────────────┘   │  │
│  │                                                      │  │
│  │  ┌─────────────────────────────────────────────┐   │  │
│  │  │         Polling Mechanisms                   │   │  │
│  │  │  • Vitals: 5s    • Device Status: 30s      │   │  │
│  │  │  • Alerts: 10s   • Sleep Data: 5min        │   │  │
│  │  └─────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS Requests
                           │ Bearer Token Auth
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  EXTERNAL API LAYER                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Stealthera API (api.stealthera.com)          │  │
│  │                                                      │  │
│  │  Endpoints:                                         │  │
│  │  • /vitals/:patient_id                             │  │
│  │  • /alerts/fall/:patient_id/:device_id             │  │
│  │  • /sleep/:patient_id/:date                        │  │
│  │  • /device/:device_id/info                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Initial Load
```
User Opens Browser
    ↓
React App Loads
    ↓
Connect to WebSocket
    ↓
Request Initial Data (REST)
    ↓
Display Dashboard
```

### 2. Real-Time Updates
```
Backend Polling Timer Triggers
    ↓
Batch API Requests to Stealthera
    ↓
Data Manager Processes Results
    ↓
Check for Critical Alerts
    ↓
Emit WebSocket Event to All Clients
    ↓
React Components Update Automatically
```

### 3. User Actions
```
User Clicks "Add Watch"
    ↓
Submit Form Data
    ↓
POST /api/watches/register
    ↓
Register in Data Manager
    ↓
Fetch Initial Watch Data
    ↓
Emit WebSocket Event
    ↓
UI Updates with New Watch
```

## Scalability Architecture

### Batch Processing
```
100 Watches Registered
    ↓
Group into Batches of 10
    ↓
Process 10 Concurrent Requests
    ↓
Wait for Batch to Complete
    ↓
Process Next Batch
    ↓
All 100 Watches Updated
```

### Memory Management
```
Watch Data Structure:
{
  vitals: { ... },              // Latest only
  deviceInfo: { ... },          // Latest only
  alerts: [ ... ],              // Last 50 only
  sleepData: { ... }            // Latest only
}
```

## Technology Decisions

### Why Socket.IO?
- Built-in reconnection logic
- Room support for future scaling
- Fallback to long polling
- Binary data support
- Broadcasting capabilities

### Why In-Memory Storage?
- Fast access (no DB latency)
- Simple deployment
- Suitable for 100 devices
- Easy to migrate to Redis later

### Why Batch Processing?
- Respects API rate limits
- Reduces server load
- Configurable concurrency
- Better error handling

### Why Different Polling Intervals?
- Vitals: Most critical, update frequently (5s)
- Device Status: Less critical, update slower (30s)
- Fall Alerts: Important but rare (10s)
- Sleep Data: Static daily data (5min)

## Security Considerations

1. **API Token**: Stored in environment variables only
2. **CORS**: Restricted to specific origins
3. **Rate Limiting**: Applied to REST endpoints
4. **Input Validation**: All user inputs validated
5. **Helmet.js**: Security headers enabled
6. **HTTPS**: Recommended for production

## Performance Optimizations

1. **Batch API Requests**: Reduces round trips
2. **Efficient Data Structures**: Maps for O(1) lookups
3. **Limited History**: Only last 50 alerts per watch
4. **Compression**: Gzip compression enabled
5. **Connection Pooling**: HTTP keep-alive
6. **WebSocket**: Single persistent connection

## Future Scaling Options

### For 1,000+ Devices
- Add Redis for distributed caching
- Use message queue (RabbitMQ/Kafka)
- Implement database for historical data
- Add load balancer
- Use clustering (PM2/Kubernetes)

### For Multiple Hospitals
- Multi-tenancy support
- Database per tenant
- Separate WebSocket rooms
- Regional deployments
- CDN for static assets

## Monitoring Points

Key metrics to monitor:
- WebSocket connection count
- API response times
- Memory usage
- CPU usage
- Error rates
- Alert processing time
- Polling loop health
