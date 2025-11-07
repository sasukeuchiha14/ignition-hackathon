import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom marker icon for better visibility
const createCustomIcon = (color = '#667eea') => {
  return L.divIcon({
    html: `<div style="
      width: 20px; 
      height: 20px; 
      background-color: ${color}; 
      border: 3px solid white; 
      border-radius: 50%; 
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      position: relative;
      top: -10px;
      left: -10px;
    "></div>`,
    iconSize: [20, 20],
    className: 'custom-marker'
  });
};

// Component to update map center when GPS data changes
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center.lat !== 0 && center.lng !== 0) {
      map.setView([center.lat, center.lng], zoom);
    }
  }, [map, center.lat, center.lng, zoom]);
  
  return null;
};

const MapView = ({ legData, chestData }) => {
  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '12px'
  };

  // GPS data is on chest sensor, fallback to leg if chest not available
  const gpsData = chestData || legData || {};
  
  const center = {
    lat: gpsData?.latitude || 0,
    lng: gpsData?.longitude || 0
  };

  const hasValidLocation = gpsData?.latitude && gpsData?.longitude;

  return (
    <div className="map-view">
      <div style={mapContainerStyle}>
        {hasValidLocation ? (
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={17}
            style={{ height: '100%', width: '100%', borderRadius: '12px' }}
            zoomControl={true}
            scrollWheelZoom={true}
          >
            {/* Dark theme tile layer */}
            <TileLayer
              url="https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
              className="dark-tiles"
            />
            
            {/* Custom marker for current location */}
            <Marker 
              position={[center.lat, center.lng]}
              icon={createCustomIcon('#667eea')}
            >
              <Popup>
                <div style={{ color: '#333', fontWeight: 'bold' }}>
                  📍 Current Location<br />
                  <small>
                    {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
                  </small>
                </div>
              </Popup>
            </Marker>
            
            <MapUpdater center={center} zoom={17} />
          </MapContainer>
        ) : (
          // Fallback when no GPS data
          <MapContainer
            center={[0, 0]}
            zoom={2}
            style={{ height: '100%', width: '100%', borderRadius: '12px' }}
            zoomControl={true}
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />
            <div className="no-gps-overlay">
              <div style={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center',
                zIndex: 1000
              }}>
                📡 Waiting for GPS Signal...
              </div>
            </div>
          </MapContainer>
        )}
      </div>

      <div className="map-info">
        <div className="info-grid">
          <div className="info-card">
            <span className="info-label">📍 Location</span>
            <span className="info-value">
              {hasValidLocation 
                ? `${gpsData.latitude.toFixed(6)}, ${gpsData.longitude.toFixed(6)}`
                : 'No GPS Fix'}
            </span>
          </div>
          <div className="info-card">
            <span className="info-label">📏 Altitude</span>
            <span className="info-value">
              {gpsData?.altitude ? `${gpsData.altitude.toFixed(1)} m` : 'N/A'}
            </span>
          </div>
          <div className="info-card">
            <span className="info-label">🚀 Speed</span>
            <span className="info-value">
              {gpsData?.speed !== undefined ? `${gpsData.speed.toFixed(1)} km/h` : 'N/A'}
            </span>
          </div>
          <div className="info-card">
            <span className="info-label">🧭 Heading</span>
            <span className="info-value">
              {gpsData?.heading !== undefined ? `${gpsData.heading.toFixed(0)}°` : 'N/A'}
            </span>
          </div>
          <div className="info-card">
            <span className="info-label">📡 Satellites</span>
            <span className="info-value">
              {gpsData?.satellites || 0}
            </span>
          </div>
          <div className="info-card">
            <span className="info-label">🎯 Accuracy</span>
            <span className="info-value">
              {gpsData?.hdop ? `${gpsData.hdop.toFixed(2)} HDOP` : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
