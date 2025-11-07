import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Text } from '@react-three/drei';
import * as THREE from 'three';
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
  const legRotation = {
    x: legData?.gyro_x || 0,
    y: legData?.gyro_y || 0,
    z: legData?.gyro_z || 0
  };

  const chestRotation = {
    x: chestData?.gyro_x || 0,
    y: chestData?.gyro_y || 0,
    z: chestData?.gyro_z || 0
  };

  // Calculate posture difference
  const postureDiff = Math.sqrt(
    Math.pow((chestData?.gyro_x || 0) - (legData?.gyro_x || 0), 2) +
    Math.pow((chestData?.gyro_y || 0) - (legData?.gyro_y || 0), 2) +
    Math.pow((chestData?.gyro_z || 0) - (legData?.gyro_z || 0), 2)
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
              <span className="axis-label">X:</span>
              <span className="axis-value">{(legData?.gyro_x || 0).toFixed(2)}°/s</span>
            </div>
            <div className="gyro-value">
              <span className="axis-label">Y:</span>
              <span className="axis-value">{(legData?.gyro_y || 0).toFixed(2)}°/s</span>
            </div>
            <div className="gyro-value">
              <span className="axis-label">Z:</span>
              <span className="axis-value">{(legData?.gyro_z || 0).toFixed(2)}°/s</span>
            </div>
          </div>
        </div>

        <div className="gyro-section">
          <h4 className="gyro-subtitle">🫀 Chest Sensor</h4>
          <div className="gyro-values">
            <div className="gyro-value">
              <span className="axis-label">X:</span>
              <span className="axis-value">{(chestData?.gyro_x || 0).toFixed(2)}°/s</span>
            </div>
            <div className="gyro-value">
              <span className="axis-label">Y:</span>
              <span className="axis-value">{(chestData?.gyro_y || 0).toFixed(2)}°/s</span>
            </div>
            <div className="gyro-value">
              <span className="axis-label">Z:</span>
              <span className="axis-value">{(chestData?.gyro_z || 0).toFixed(2)}°/s</span>
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
