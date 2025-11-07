-- Supabase Database Schema for Ignition Hackathon - Rider Telemetry System
-- Created: November 2025

-- =============================================
-- 1. ESP32 Leg Sensor Data (MPU6050 only)
-- =============================================
CREATE TABLE IF NOT EXISTS esp32_leg_data (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- MPU6050 Data
    accel_x DOUBLE PRECISION,
    accel_y DOUBLE PRECISION,
    accel_z DOUBLE PRECISION,
    gyro_x DOUBLE PRECISION,
    gyro_y DOUBLE PRECISION,
    gyro_z DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    
    -- Metadata
    device_id VARCHAR(50) DEFAULT 'ESP32_LEG',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for timestamp queries
CREATE INDEX idx_esp32_leg_timestamp ON esp32_leg_data(timestamp DESC);
CREATE INDEX idx_esp32_leg_created ON esp32_leg_data(created_at DESC);


-- =============================================
-- 2. ESP32 Chest Sensor Data (MPU6050 + GPS)
-- =============================================
CREATE TABLE IF NOT EXISTS esp32_chest_data (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- GPS Data from NEO-6M (moved from leg to chest)
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    altitude DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    satellites INTEGER,
    
    -- MPU6050 Data
    accel_x DOUBLE PRECISION,
    accel_y DOUBLE PRECISION,
    accel_z DOUBLE PRECISION,
    gyro_x DOUBLE PRECISION,
    gyro_y DOUBLE PRECISION,
    gyro_z DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    
    -- Metadata
    device_id VARCHAR(50) DEFAULT 'ESP32_CHEST',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for timestamp queries
CREATE INDEX idx_esp32_chest_timestamp ON esp32_chest_data(timestamp DESC);
CREATE INDEX idx_esp32_chest_created ON esp32_chest_data(created_at DESC);
CREATE INDEX idx_esp32_chest_gps_coords ON esp32_chest_data(latitude, longitude);
CREATE INDEX idx_esp32_chest_timestamp_gps ON esp32_chest_data(timestamp DESC) WHERE latitude IS NOT NULL;


-- =============================================
-- 3. Processed Ride Data (Combined Analysis)
-- =============================================
CREATE TABLE IF NOT EXISTS ride_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID DEFAULT gen_random_uuid(),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    
    -- Ride State Detection
    activity_type VARCHAR(20), -- 'WALKING', 'SCOOTER', 'MOTORCYCLE', 'STATIONARY'
    
    -- Statistics
    total_distance DOUBLE PRECISION,
    max_speed DOUBLE PRECISION,
    avg_speed DOUBLE PRECISION,
    harsh_brakes INTEGER DEFAULT 0,
    harsh_accelerations INTEGER DEFAULT 0,
    
    -- GPS Stats
    gps_points_count INTEGER DEFAULT 0,
    avg_gps_accuracy DOUBLE PRECISION,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================
-- 4. Events & Alerts
-- =============================================
CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(50) NOT NULL, -- 'HARSH_BRAKE', 'HARSH_ACCEL', 'FALL_DETECTED', 'ACCIDENT_ALERT'
    severity VARCHAR(20), -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    
    -- Event Data
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    
    -- Sensor Values at Event
    leg_accel_x DOUBLE PRECISION,
    leg_accel_y DOUBLE PRECISION,
    leg_accel_z DOUBLE PRECISION,
    chest_accel_x DOUBLE PRECISION,
    chest_accel_y DOUBLE PRECISION,
    chest_accel_z DOUBLE PRECISION,
    
    -- Notification Status
    telegram_notified BOOLEAN DEFAULT FALSE,
    telegram_sent_at TIMESTAMPTZ,
    
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_severity ON events(severity);


-- =============================================
-- 5. Telegram User Links
-- =============================================
CREATE TABLE IF NOT EXISTS telegram_users (
    id BIGSERIAL PRIMARY KEY,
    telegram_chat_id BIGINT UNIQUE NOT NULL,
    telegram_username VARCHAR(100),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    
    -- Linking
    is_linked BOOLEAN DEFAULT FALSE,
    linked_at TIMESTAMPTZ,
    
    -- Notifications
    notifications_enabled BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================
-- 6. Telegram PIN Codes (Temporary)
-- =============================================
CREATE TABLE IF NOT EXISTS telegram_pins (
    id BIGSERIAL PRIMARY KEY,
    pin_code VARCHAR(6) NOT NULL UNIQUE,
    telegram_chat_id BIGINT NOT NULL,
    
    -- Expiry
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_telegram_pins_code ON telegram_pins(pin_code);
CREATE INDEX idx_telegram_pins_expiry ON telegram_pins(expires_at);


-- =============================================
-- 7. System Settings
-- =============================================
CREATE TABLE IF NOT EXISTS system_settings (
    id BIGSERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('data_collection_interval', '2', 'Seconds between sensor readings'),
('harsh_brake_threshold', '-8.0', 'Deceleration threshold for harsh braking (m/s²)'),
('harsh_accel_threshold', '6.0', 'Acceleration threshold for harsh acceleration (m/s²)'),
('fall_detection_threshold', '15.0', 'Combined sensor difference threshold for fall detection'),
('accident_detection_enabled', 'true', 'Enable automatic accident detection'),
('telegram_notifications_enabled', 'true', 'Enable Telegram notifications')
ON CONFLICT (setting_key) DO NOTHING;


-- =============================================
-- 8. Helper Views
-- =============================================

-- Latest sensor readings (for frontend)
CREATE OR REPLACE VIEW latest_sensor_data AS
SELECT 
    COALESCE(c.timestamp, l.timestamp) as timestamp,
    -- GPS data now comes from chest sensor
    c.latitude,
    c.longitude,
    c.altitude,
    c.speed,
    c.heading,
    c.accuracy,
    c.satellites,
    -- Leg sensor data (MPU6050 only)
    l.accel_x AS leg_accel_x,
    l.accel_y AS leg_accel_y,
    l.accel_z AS leg_accel_z,
    l.gyro_x AS leg_gyro_x,
    l.gyro_y AS leg_gyro_y,
    l.gyro_z AS leg_gyro_z,
    l.temperature AS leg_temperature,
    -- Chest sensor data (MPU6050 + GPS)
    c.accel_x AS chest_accel_x,
    c.accel_y AS chest_accel_y,
    c.accel_z AS chest_accel_z,
    c.gyro_x AS chest_gyro_x,
    c.gyro_y AS chest_gyro_y,
    c.gyro_z AS chest_gyro_z,
    c.temperature AS chest_temperature
FROM esp32_chest_data c
FULL OUTER JOIN esp32_leg_data l 
    ON ABS(EXTRACT(EPOCH FROM (c.timestamp - l.timestamp))) < 3
ORDER BY COALESCE(c.timestamp, l.timestamp) DESC
LIMIT 1;


-- Recent events for dashboard
CREATE OR REPLACE VIEW recent_events AS
SELECT 
    id,
    timestamp,
    event_type,
    severity,
    latitude,
    longitude,
    speed,
    description,
    telegram_notified
FROM events
ORDER BY timestamp DESC
LIMIT 50;


-- =============================================
-- 9. Row Level Security (Optional)
-- =============================================
-- Enable RLS if needed for multi-user access
-- ALTER TABLE esp32_leg_data ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE esp32_chest_data ENABLE ROW LEVEL SECURITY;


-- =============================================
-- 10. Auto-cleanup old data (Optional)
-- =============================================
-- Function to delete data older than 7 days
CREATE OR REPLACE FUNCTION cleanup_old_sensor_data()
RETURNS void AS $$
BEGIN
    DELETE FROM esp32_leg_data WHERE created_at < NOW() - INTERVAL '7 days';
    DELETE FROM esp32_chest_data WHERE created_at < NOW() - INTERVAL '7 days';
    DELETE FROM telegram_pins WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- You can schedule this with pg_cron extension or run manually
-- SELECT cron.schedule('cleanup-sensor-data', '0 2 * * *', 'SELECT cleanup_old_sensor_data()');


-- =============================================
-- DONE! Schema created successfully
-- =============================================
