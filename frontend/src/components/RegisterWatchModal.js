import React, { useState } from 'react';
import { X } from 'lucide-react';
import './RegisterWatchModal.css';

const RegisterWatchModal = ({ isOpen, onClose, onRegister }) => {
  const [patientId, setPatientId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!patientId.trim() || !deviceId.trim()) {
      setError('Both Patient ID and Device ID are required');
      return;
    }

    setLoading(true);

    try {
      await onRegister(patientId.trim(), deviceId.trim());
      setPatientId('');
      setDeviceId('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to register watch');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Register New Watch</h2>
          <button className="close-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="patientId">Patient ID</label>
            <input
              type="text"
              id="patientId"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="Enter patient ID"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="deviceId">Device ID</label>
            <input
              type="text"
              id="deviceId"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="Enter device ID"
              disabled={loading}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="button button-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register Watch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterWatchModal;
