import React, { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Text } from '@react-three/drei';
import './GyroscopeViz.css';

const SensorModel = ({ position, rotation, color, label }) => {
  const meshRef = useRef();

  useEffect(() => {
    if (meshRef.current && rotation) {
      meshRef.current.rotation.x = (rotation.x || 0) * (Math.PI / 180);
      meshRef.current.rotation.y = (rotation.y || 0) * (Math.PI / 180);
      meshRef.current.rotation.z = (rotation.z || 0) * (Math.PI / 180);
    }
  }, [rotation]);

  return (
    <group position={position}>
      <Box ref={meshRef} args={[1.5, 0.3, 0.8]}>
        <meshStandardMaterial color={color} />
      </Box>
      <Text
        position={[0, -0.5, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
};

const GyroscopeViz = ({ legData, chestData }) => {
  // Calculate orientation from accelerometer data (Euler angles)
  const calculateOrientation = (accel_x, accel_y, accel_z) => {
    // Normalize accelerometer values
    const magnitude = Math.sqrt(accel_x**2 + accel_y**2 + accel_z**2);
    if (magnitude === 0) return { x: 0, y: 0, z: 0 };
    
    const ax = accel_x / magnitude;
    const ay = accel_y / magnitude;
    const az = accel_z / magnitude;
    
    // Calculate pitch (rotation around X-axis)
    const pitch = Math.atan2(ay, Math.sqrt(ax**2 + az**2)) * (180 / Math.PI);
    
    // Calculate roll (rotation around Y-axis)
    const roll = Math.atan2(-ax, az) * (180 / Math.PI);
    
    // Yaw (rotation around Z-axis) - use gyro Z for indication
    const yaw = 0; // Can't determine absolute yaw from accelerometer alone
    
    return { x: pitch, y: roll, z: yaw };
  };

  const legRotation = calculateOrientation(
    legData?.accel_x || 0,
    legData?.accel_y || 0,
    legData?.accel_z || 9.8
  );

  const chestRotation = calculateOrientation(
    chestData?.accel_x || 0,
    chestData?.accel_y || 0,
    chestData?.accel_z || 9.8
  );

  // Calculate posture difference (angle between orientations)
  const postureDiff = Math.sqrt(
    Math.pow(chestRotation.x - legRotation.x, 2) +
    Math.pow(chestRotation.y - legRotation.y, 2)
  );

  return (
    <div className="gyroscope-viz">
      <div className="gyro-canvas-container">
        <Canvas camera={{ position: [0, 2, 5], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <SensorModel
            position={[-2, 0, 0]}
            rotation={legRotation}
            color="#667eea"
            label="Leg Sensor"
          />
          <SensorModel
            position={[2, 0, 0]}
            rotation={chestRotation}
            color="#f093fb"
            label="Chest Sensor"
          />
          <gridHelper args={[10, 10, '#2c3e50', '#1a1f3a']} />
          <OrbitControls enableZoom={true} enablePan={true} />
        </Canvas>
      </div>

      <div className="gyro-data">
        <div className="gyro-section">
          <h4 className="gyro-subtitle">🦵 Leg Sensor</h4>
          <div className="gyro-values">
            <div className="gyro-value">
              <span className="axis-label">Pitch:</span>
              <span className="axis-value">{legRotation.x.toFixed(1)}°</span>
            </div>
            <div className="gyro-value">
              <span className="axis-label">Roll:</span>
              <span className="axis-value">{legRotation.y.toFixed(1)}°</span>
            </div>
            <div className="gyro-value">
              <span className="axis-label">Gyro Z:</span>
              <span className="axis-value">{(legData?.gyro_z || 0).toFixed(2)} rad/s</span>
            </div>
          </div>
        </div>

        <div className="gyro-section">
          <h4 className="gyro-subtitle">🫀 Chest Sensor</h4>
          <div className="gyro-values">
            <div className="gyro-value">
              <span className="axis-label">Pitch:</span>
              <span className="axis-value">{chestRotation.x.toFixed(1)}°</span>
            </div>
            <div className="gyro-value">
              <span className="axis-label">Roll:</span>
              <span className="axis-value">{chestRotation.y.toFixed(1)}°</span>
            </div>
            <div className="gyro-value">
              <span className="axis-label">Gyro Z:</span>
              <span className="axis-value">{(chestData?.gyro_z || 0).toFixed(2)} rad/s</span>
            </div>
          </div>
        </div>

        <div className="gyro-section posture-diff">
          <h4 className="gyro-subtitle">📐 Posture Difference</h4>
          <div className="posture-value">
            {postureDiff.toFixed(2)}°/s
          </div>
          <div className="posture-bar">
            <div 
              className="posture-fill" 
              style={{ width: `${Math.min(postureDiff * 2, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GyroscopeViz;
