# Quick Start Guide

## Prerequisites
- Node.js >= 16.0.0
- Stealthera API Bearer Token

## Setup (5 minutes)

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and add your API token:
```env
STEALTHERA_API_TOKEN=your_bearer_token_here
```

Start backend:
```bash
npm run dev
```

Backend will run on http://localhost:5000

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm start
```

Frontend will open at http://localhost:3000

### 3. Add Your First Watch

1. Click "Add Watch" button
2. Enter Patient ID (e.g., "P001")
3. Enter Device ID (e.g., "DEV001")
4. Click "Register Watch"

The watch will appear on the dashboard with live data!

## Testing Without API Access

If you don't have API access yet, you can test with mock data:

1. In `backend/services/stealthera-api.js`, add mock responses:

```javascript
async getPatientVitals(patientId) {
  // Temporary mock data for testing
  return {
    success: true,
    data: {
      patient_id: patientId,
      heart_rate: 75,
      spo2: 98,
      hrv: 45,
      stress_score: 35,
      body_temperature: 36.8,
      blood_pressure: { systolic: 120, diastolic: 80 }
    },
    timestamp: new Date().toISOString()
  };
}
```

## Next Steps

- Customize polling intervals in `.env`
- Add multiple watches
- Explore filtering options
- Check the full README.md for deployment

## Common Issues

**Backend won't start**: Check if port 5000 is in use
**Frontend can't connect**: Verify backend is running
**No data showing**: Check API token is valid

Need help? See README.md for detailed troubleshooting.
