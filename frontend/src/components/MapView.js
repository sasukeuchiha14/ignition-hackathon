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
      width: 24px; 
      height: 24px; 
      background-color: ${color}; 
      border: 3px solid white; 
      border-radius: 50%; 
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
    className: 'custom-marker'
  });
};

// Component to update map center when GPS data changes
const MapUpdater = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center[0] !== 0 && center[1] !== 0) {
      map.setView(center, 17, { animate: true });
    }
  }, [map, center]);
  
  return null;
};

const MapView = ({ legData, chestData }) => {
  // GPS data is on chest sensor, fallback to leg if chest not available
  const gpsData = chestData || legData || {};
  
  const hasValidLocation = gpsData?.latitude && gpsData?.longitude;
  const position = hasValidLocation 
    ? [gpsData.latitude, gpsData.longitude] 
    : [0, 0];

  return (
    <div className="map-view">
      {/* Map Container */}
      <div style={{ height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
        {hasValidLocation ? (
          <MapContainer
            center={position}
            zoom={17}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />
            
            <Marker 
              position={position}
              icon={createCustomIcon('#667eea')}
            >
              <Popup>
                <div style={{ color: '#1a1f3a', fontWeight: 'bold' }}>
                  📍 Current Location<br />
                  <small style={{ color: '#6b7280' }}>
                    {gpsData.latitude?.toFixed(6)}, {gpsData.longitude?.toFixed(6)}
                  </small>
                </div>
              </Popup>
            </Marker>
            
            <MapUpdater center={position} />
          </MapContainer>
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1a1f3a',
              color: '#9ca3af',
              borderRadius: '12px',
              fontSize: '1.2rem'
            }}
          >
            📡 Waiting for GPS Signal...
          </div>
        )}
      </div>

      <div className="map-info">
        <div className="info-grid">
          <div className="info-card">
            <span className="info-label">📍 Location</span>
            <span className="info-value">
              {hasValidLocation 
                ? `${gpsData.latitude?.toFixed(6) || '0'}, ${gpsData.longitude?.toFixed(6) || '0'}`
                : 'No GPS Fix'}
            </span>
          </div>
          <div className="info-card">
            <span className="info-label">📏 Altitude</span>
            <span className="info-value">
              {gpsData?.altitude ? `${gpsData.altitude?.toFixed(1)} m` : 'N/A'}
            </span>
          </div>
          <div className="info-card">
            <span className="info-label">🚀 Speed</span>
            <span className="info-value">
              {gpsData?.speed !== undefined ? `${gpsData.speed?.toFixed(1)} km/h` : 'N/A'}
            </span>
          </div>
          <div className="info-card">
            <span className="info-label">🧭 Heading</span>
            <span className="info-value">
              {gpsData?.heading !== undefined ? `${gpsData.heading?.toFixed(0)}°` : 'N/A'}
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
              {gpsData?.hdop ? `${gpsData.hdop?.toFixed(2)} HDOP` : 
               gpsData?.accuracy ? `${gpsData.accuracy?.toFixed(2)} HDOP` : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
