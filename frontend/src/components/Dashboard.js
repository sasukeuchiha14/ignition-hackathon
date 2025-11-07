import React from 'react';
import './Dashboard.css';

const Dashboard = ({ legData, chestData, activityType }) => {
  const formatValue = (value, decimals = 2) => {
    return value !== undefined && value !== null ? value.toFixed(decimals) : 'N/A';
  };

  const getActivityColor = (type) => {
    const colors = {
      WALKING: '#667eea',
      SCOOTER: '#f093fb',
      MOTORCYCLE: '#fa709a',
      STATIONARY: '#4facfe',
      UNKNOWN: '#6b7280'
    };
    return colors[type] || colors.UNKNOWN;
  };

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        {/* Activity Status Card */}
        <div className="dashboard-card activity-card">
          <div className="card-header">
            <span className="card-icon">🚦</span>
            <h3 className="card-title">Activity Status</h3>
          </div>
          <div 
            className="activity-badge" 
            style={{ background: getActivityColor(activityType) }}
          >
            {activityType}
          </div>
        </div>

        {/* GPS Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <span className="card-icon">📍</span>
            <h3 className="card-title">GPS Status</h3>
          </div>
          <div className="card-content">
            <div className="stat-row">
              <span className="stat-label">Speed:</span>
              <span className="stat-value">{formatValue(chestData?.speed, 1)} km/h</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Satellites:</span>
              <span className="stat-value">{chestData?.satellites || 0}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">HDOP:</span>
              <span className="stat-value">{formatValue(legData?.hdop)}</span>
            </div>
          </div>
        </div>

        {/* Leg Acceleration Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <span className="card-icon">🦵</span>
            <h3 className="card-title">Leg Acceleration</h3>
          </div>
          <div className="card-content">
            <div className="stat-row">
              <span className="stat-label">X:</span>
              <span className="stat-value">{formatValue(legData?.accel_x)} m/s²</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Y:</span>
              <span className="stat-value">{formatValue(legData?.accel_y)} m/s²</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Z:</span>
              <span className="stat-value">{formatValue(legData?.accel_z)} m/s²</span>
            </div>
          </div>
        </div>

        {/* Chest Acceleration Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <span className="card-icon">🫀</span>
            <h3 className="card-title">Chest Acceleration</h3>
          </div>
          <div className="card-content">
            <div className="stat-row">
              <span className="stat-label">X:</span>
              <span className="stat-value">{formatValue(chestData?.accel_x)} m/s²</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Y:</span>
              <span className="stat-value">{formatValue(chestData?.accel_y)} m/s²</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Z:</span>
              <span className="stat-value">{formatValue(chestData?.accel_z)} m/s²</span>
            </div>
          </div>
        </div>

        {/* Leg Gyroscope Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <span className="card-icon">🔄</span>
            <h3 className="card-title">Leg Gyroscope</h3>
          </div>
          <div className="card-content">
            <div className="stat-row">
              <span className="stat-label">X:</span>
              <span className="stat-value">{formatValue(legData?.gyro_x)} °/s</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Y:</span>
              <span className="stat-value">{formatValue(legData?.gyro_y)} °/s</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Z:</span>
              <span className="stat-value">{formatValue(legData?.gyro_z)} °/s</span>
            </div>
          </div>
        </div>

        {/* Chest Gyroscope Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <span className="card-icon">🔄</span>
            <h3 className="card-title">Chest Gyroscope</h3>
          </div>
          <div className="card-content">
            <div className="stat-row">
              <span className="stat-label">X:</span>
              <span className="stat-value">{formatValue(chestData?.gyro_x)} °/s</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Y:</span>
              <span className="stat-value">{formatValue(chestData?.gyro_y)} °/s</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Z:</span>
              <span className="stat-value">{formatValue(chestData?.gyro_z)} °/s</span>
            </div>
          </div>
        </div>

        {/* Temperature Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <span className="card-icon">🌡️</span>
            <h3 className="card-title">Temperature</h3>
          </div>
          <div className="card-content">
            <div className="stat-row">
              <span className="stat-label">Leg:</span>
              <span className="stat-value">{formatValue(legData?.temperature, 1)} °C</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Chest:</span>
              <span className="stat-value">{formatValue(chestData?.temperature, 1)} °C</span>
            </div>
          </div>
        </div>

        {/* System Info Card */}
        <div className="dashboard-card">
          <div className="card-header">
            <span className="card-icon">⚙️</span>
            <h3 className="card-title">System Info</h3>
          </div>
          <div className="card-content">
            <div className="stat-row">
              <span className="stat-label">Leg ESP32:</span>
              <span className="stat-value connected-dot">●</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Chest ESP32:</span>
              <span className="stat-value connected-dot">●</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Update Rate:</span>
              <span className="stat-value">2s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
