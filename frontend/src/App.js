import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { DashboardProvider, useDashboard } from './contexts/DashboardContext';
import WatchCard from './components/WatchCard';
import StatisticsPanel from './components/StatisticsPanel';
import RegisterWatchModal from './components/RegisterWatchModal';
import { Plus, RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import './App.css';

const DashboardContent = () => {
  const {
    watches,
    statistics,
    isConnected,
    loading,
    registerWatch,
    refreshAll
  } = useDashboard();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all, critical, lowBattery

  const getFilteredWatches = () => {
    switch (filter) {
      case 'critical':
        return watches.filter(w => w.alerts?.some(a => a.severity === 'high'));
      case 'lowBattery':
        return watches.filter(w => w.deviceInfo?.battery_percentage < 20);
      case 'offline':
        return watches.filter(w => w.deviceInfo?.connectivity_status !== 'online');
      default:
        return watches;
    }
  };

  const filteredWatches = getFilteredWatches();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1>Stealthera Health Monitor</h1>
          <div className="connection-status">
            {isConnected ? (
              <>
                <Wifi className="icon text-green" />
                <span className="status-text">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="icon text-red" />
                <span className="status-text">Disconnected</span>
              </>
            )}
          </div>
        </div>
        <div className="header-actions">
          <button
            className="button button-secondary"
            onClick={refreshAll}
            title="Refresh all data"
          >
            <RefreshCw className="button-icon" />
            Refresh
          </button>
          <button
            className="button button-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="button-icon" />
            Add Watch
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Statistics */}
        <StatisticsPanel statistics={statistics} />

        {/* Filters */}
        <div className="filters-bar">
          <button
            className={`filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({watches.length})
          </button>
          <button
            className={`filter-button ${filter === 'critical' ? 'active' : ''}`}
            onClick={() => setFilter('critical')}
          >
            <AlertCircle className="filter-icon" />
            Critical ({watches.filter(w => w.alerts?.some(a => a.severity === 'high')).length})
          </button>
          <button
            className={`filter-button ${filter === 'lowBattery' ? 'active' : ''}`}
            onClick={() => setFilter('lowBattery')}
          >
            Low Battery ({watches.filter(w => w.deviceInfo?.battery_percentage < 20).length})
          </button>
          <button
            className={`filter-button ${filter === 'offline' ? 'active' : ''}`}
            onClick={() => setFilter('offline')}
          >
            Offline ({watches.filter(w => w.deviceInfo?.connectivity_status !== 'online').length})
          </button>
        </div>

        {/* Watches Grid */}
        {filteredWatches.length > 0 ? (
          <div className="watches-grid">
            {filteredWatches.map((watch) => (
              <WatchCard
                key={watch.key}
                watch={watch}
                onClick={(w) => console.log('Watch clicked:', w)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <AlertCircle className="empty-icon" />
            <h3>No watches found</h3>
            <p>
              {filter === 'all'
                ? 'Add your first watch to start monitoring'
                : 'No watches match the current filter'}
            </p>
            {filter === 'all' && (
              <button
                className="button button-primary"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="button-icon" />
                Add Watch
              </button>
            )}
          </div>
        )}
      </main>

      {/* Register Watch Modal */}
      <RegisterWatchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRegister={registerWatch}
      />

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

function App() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}

export default App;
