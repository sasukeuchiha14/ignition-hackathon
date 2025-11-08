# Activity Detection Logic

## Overview
The system uses dual ESP32 sensors (leg + chest) to accurately detect rider activity and behavior patterns.

---

## Detection Algorithms

### 1. **Walking Detection**
**Speed Range:** 1-15 km/h  
**Key Indicators:**
- High leg gyroscope variance (> 0.3 rad/s)
- Stepping pattern: leg moving forward/backward while chest remains relatively stable
- Gyro magnitude indicates periodic leg movement

**Logic:**
```python
if 1 <= speed <= 15 and leg_gyro_magnitude > 0.3:
    return 'WALKING'
```

### 2. **Scooter Detection**
**Speed Range:** > 15 km/h  
**Posture:** Upright (angle difference < 15°)

**Key Indicators:**
- More upright riding position
- Smaller posture difference between chest and leg
- Chest and leg sensors nearly parallel

**Logic:**
```python
if speed > 15 and angle_diff < 15:
    return 'SCOOTER'
```

### 3. **Motorcycle Detection**
**Speed Range:** > 15 km/h  
**Posture:** Forward lean (angle difference > 15°)

**Key Indicators:**
- Forward-leaning riding position
- Larger posture difference between chest and leg
- More aggressive riding stance

**Logic:**
```python
if speed > 15 and angle_diff >= 15:
    return 'MOTORCYCLE'
```

### 4. **Stationary Detection**
**Speed Range:** < 0.5 km/h

**Key Indicators:**
- Near-zero GPS speed
- Minimal movement on both sensors

---

## Posture Calculation

### Angle Difference Method
Uses dot product to calculate angle between chest and leg orientations:

```python
# Calculate acceleration vectors
leg_accel = [accel_x, accel_y, accel_z]
chest_accel = [accel_x, accel_y, accel_z]

# Normalize
leg_mag = sqrt(sum(x² for x in leg_accel))
chest_mag = sqrt(sum(x² for x in chest_accel))

# Calculate angle
dot_product = sum(l*c for l, c in zip(leg_accel, chest_accel))
cos_angle = dot_product / (leg_mag * chest_mag)
angle_diff = arccos(cos_angle) * (180/π)
```

---

## Event Detection

### 1. **Harsh Braking**
- **Threshold:** accel_x < -8.0 m/s²
- **Severity:** MEDIUM
- **Saved to database:** ✅ Yes
- **Telegram alert:** ✅ Yes

### 2. **Harsh Acceleration**
- **Threshold:** accel_x > 6.0 m/s²
- **Severity:** LOW
- **Saved to database:** ✅ Yes
- **Telegram alert:** ✅ Yes

### 3. **Fall Detection**
- **Logic:** Large posture difference + sudden speed drop
- **Severity:** HIGH
- **Saved to database:** ✅ Yes
- **Telegram alert:** ✅ Yes

---

## 3D Orientation Visualization

### Frontend Calculation
Uses **accelerometer data** to calculate Euler angles (not gyroscope):

```javascript
// Calculate pitch (rotation around X-axis)
pitch = atan2(accel_y, sqrt(accel_x² + accel_z²)) * (180/π)

// Calculate roll (rotation around Y-axis)
roll = atan2(-accel_x, accel_z) * (180/π)
```

### Why Accelerometer?
- Gyroscope measures **angular velocity** (rad/s), not absolute orientation
- Accelerometer measures **gravity direction**, which gives absolute orientation
- More stable for visualization without drift

---

## Data Flow

```
ESP32 Leg Sensor (MPU6050)
    ↓
    accel_x, accel_y, accel_z
    gyro_x, gyro_y, gyro_z
    temperature
    ↓
Flask Backend (/api/esp32-leg)
    ↓
    Store in database

ESP32 Chest Sensor (MPU6050 + GPS)
    ↓
    accel_x, accel_y, accel_z
    gyro_x, gyro_y, gyro_z
    temperature
    latitude, longitude, speed, heading
    ↓
Flask Backend (/api/esp32-chest)
    ↓
    1. Store in database
    2. Get latest leg data
    3. Calculate activity type
    4. Detect events (harsh brake/accel)
    5. Send Telegram alerts if needed
    ↓
React Frontend (/api/live-data)
    ↓
    Display activity, 3D visualization, map, events
```

---

## Benefits of Dual Sensor Approach

1. **Better Classification:** Posture difference distinguishes scooter vs motorcycle
2. **Robust Detection:** Cross-validation between sensors reduces false positives
3. **Walking Pattern:** Leg gyro variance detects stepping motion
4. **Redundancy:** System works even if one sensor fails
5. **GPS Quality:** Chest placement gives clearer sky view
6. **Cost Efficient:** Cheaper than long wired connections or BLE mesh

---

## Testing Scenarios

### Walking Test
- Walk at 2-5 km/h
- Leg sensor should show periodic gyro spikes
- Activity should show "WALKING"

### Scooter Test
- Ride at 20-30 km/h in upright position
- Angle difference should be < 15°
- Activity should show "SCOOTER"

### Motorcycle Test
- Ride at 20+ km/h in forward-leaning position
- Angle difference should be > 15°
- Activity should show "MOTORCYCLE"

### Harsh Brake Test
- Quick deceleration
- Should trigger event and Telegram alert
- Event should appear in "Recent Events" panel

---

## Future Enhancements

1. **Machine Learning:** Train model on real riding data
2. **Kalman Filter:** Fuse accelerometer + gyroscope for better orientation
3. **Pattern Recognition:** Detect specific maneuvers (U-turns, lane changes)
4. **Fatigue Detection:** Monitor posture degradation over time
5. **Road Quality:** Detect potholes/rough roads from vibration patterns
