import React from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import './MapView.css';

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
      <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={hasValidLocation ? 17 : 2}
          options={{
            styles: [
              { elementType: 'geometry', stylers: [{ color: '#1a1f3a' }] },
              { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1f3a' }] },
              { elementType: 'labels.text.fill', stylers: [{ color: '#8b92ab' }] },
              {
                featureType: 'road',
                elementType: 'geometry',
                stylers: [{ color: '#2c3e50' }]
              },
              {
                featureType: 'water',
                elementType: 'geometry',
                stylers: [{ color: '#0a0e27' }]
              }
            ],
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true
          }}
        >
          {hasValidLocation && (
            <Marker
              position={center}
              icon={{
                path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                scale: 10,
                fillColor: '#667eea',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
              }}
            />
          )}
        </GoogleMap>
      </LoadScript>

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
