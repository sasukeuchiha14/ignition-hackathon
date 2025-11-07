import React from 'react';
import './EventsPanel.css';

const EventsPanel = ({ events }) => {
  const getSeverityColor = (severity) => {
    const colors = {
      LOW: '#4facfe',
      MEDIUM: '#f093fb',
      HIGH: '#fa709a',
      CRITICAL: '#ef4444'
    };
    return colors[severity] || colors.LOW;
  };

  const getEventIcon = (eventType) => {
    const icons = {
      harsh_brake: '🛑',
      harsh_acceleration: '🚀',
      fall_detected: '⚠️',
      speeding: '⚡',
      sudden_stop: '🔴',
      sharp_turn: '↩️'
    };
    return icons[eventType] || '📍';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getGoogleMapsLink = (lat, lng) => {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  if (!events || events.length === 0) {
    return (
      <div className="events-panel">
        <div className="empty-state">
          <span className="empty-icon">✅</span>
          <p className="empty-text">No events recorded</p>
          <p className="empty-subtext">All systems operating normally</p>
        </div>
      </div>
    );
  }

  return (
    <div className="events-panel">
      <div className="events-list">
        {events.map((event, index) => (
          <div 
            key={event.id || index} 
            className="event-card"
            style={{ borderLeftColor: getSeverityColor(event.severity) }}
          >
            <div className="event-header">
              <div className="event-title-row">
                <span className="event-icon">{getEventIcon(event.event_type)}</span>
                <span className="event-type">{event.event_type.replace(/_/g, ' ')}</span>
              </div>
              <span 
                className="event-severity"
                style={{ background: getSeverityColor(event.severity) }}
              >
                {event.severity}
              </span>
            </div>

            <div className="event-details">
              {event.description && (
                <p className="event-description">{event.description}</p>
              )}

              <div className="event-meta">
                <div className="meta-item">
                  <span className="meta-label">⏰ Time:</span>
                  <span className="meta-value">{formatTimestamp(event.timestamp)}</span>
                </div>

                {event.speed !== undefined && (
                  <div className="meta-item">
                    <span className="meta-label">🚀 Speed:</span>
                    <span className="meta-value">{event.speed.toFixed(1)} km/h</span>
                  </div>
                )}

                {event.latitude && event.longitude && (
                  <div className="meta-item">
                    <span className="meta-label">📍 Location:</span>
                    <a 
                      href={getGoogleMapsLink(event.latitude, event.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="location-link"
                    >
                      View on Map
                    </a>
                  </div>
                )}

                <div className="meta-item">
                  <span className="meta-label">📱 Telegram:</span>
                  <span className={`notification-status ${event.telegram_notified ? 'sent' : 'pending'}`}>
                    {event.telegram_notified ? '✅ Sent' : '⏳ Pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventsPanel;
