import React, { useState, useEffect } from 'react';
import './App.css';
import MapView from './components/MapView';
import GyroscopeViz from './components/GyroscopeViz';
import Dashboard from './components/Dashboard';
import TelegramLink from './components/TelegramLink';
import EventsPanel from './components/EventsPanel';
import axios from 'axios';

// Backend API URL - update this to your domain
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:7777';

function App() {
  const [sensorData, setSensorData] = useState(null);
  const [events, setEvents] = useState([]);
  const [activityType, setActivityType] = useState('UNKNOWN');
  const [isConnected, setIsConnected] = useState(false);
  const [showTelegramLink, setShowTelegramLink] = useState(false);

  // Fetch live data every 2 seconds
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/live-data`);
        const data = response.data;
        
        setSensorData(data);
        setActivityType(data.activity_type || 'UNKNOWN');
        setEvents(data.recent_events || []);
        setIsConnected(true);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsConnected(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up interval for every 2 seconds
    const interval = setInterval(fetchData, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1>🏍️ Rider Telemetry</h1>
          <div className="header-status">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
            <span className="status-text">{isConnected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Activity Status Banner */}
        <div className={`activity-banner activity-${activityType.toLowerCase()}`}>
          <span className="activity-icon">
            {activityType === 'WALKING' && '🚶'}
            {activityType === 'SCOOTER' && '🛴'}
            {activityType === 'MOTORCYCLE' && '🏍️'}
            {activityType === 'STATIONARY' && '⏸️'}
            {activityType === 'UNKNOWN' && '❓'}
          </span>
          <span className="activity-text">{activityType}</span>
        </div>

        {/* Connection Warnings */}
        {sensorData && sensorData.leg_sensor && !sensorData.chest_sensor && (
          <div className="warning-banner">
            ⚠️ Only Leg Sensor connected - Limited data available
          </div>
        )}
        {sensorData && !sensorData.leg_sensor && sensorData.chest_sensor && (
          <div className="warning-banner">
            ⚠️ Only Chest Sensor connected - GPS available from this sensor
          </div>
        )}
        {sensorData && !sensorData.leg_sensor && !sensorData.chest_sensor && (
          <div className="error-banner">
            ❌ No sensors connected - Waiting for data...
          </div>
        )}

        {/* Map View */}
        <section className="map-section">
          <MapView 
            legData={sensorData?.leg_sensor} 
            chestData={sensorData?.chest_sensor}
          />
        </section>

        {/* Dashboard Cards */}
        <section className="dashboard-section">
          <Dashboard 
            legData={sensorData?.leg_sensor}
            chestData={sensorData?.chest_sensor}
            activityType={activityType}
          />
        </section>

        {/* Gyroscope 3D Visualization */}
        <section className="gyro-section">
          <h2 className="section-title">Orientation</h2>
          <GyroscopeViz 
            legData={sensorData?.leg_sensor}
            chestData={sensorData?.chest_sensor}
          />
        </section>

        {/* Events Panel */}
        <section className="events-section">
          <h2 className="section-title">Recent Events</h2>
          <EventsPanel events={events} />
        </section>

        {/* Telegram Link Button */}
        <button 
          className="telegram-link-btn"
          onClick={() => setShowTelegramLink(true)}
        >
          📱 Link Telegram
        </button>
      </main>

      {/* Telegram Link Modal */}
      <TelegramLink 
        isOpen={showTelegramLink}
        onClose={() => setShowTelegramLink(false)} 
      />
    </div>
  );
}

export default App;
