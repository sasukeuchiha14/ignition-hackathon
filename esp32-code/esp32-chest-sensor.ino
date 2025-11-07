/*
 * ESP32 #2 - CHEST SENSOR
 * Reads data from:
 * - NEO-6M GPS Module
 * - MPU6050 IMU (Accelerometer + Gyroscope + Temperature)
 * 
 * Sends data to backend API every 2 seconds
 * 
 * Wiring:
 * NEO-6M GPS:
 *   - TX → GPIO16 (RX2)
 *   - RX → GPIO17 (TX2)
 *   - VCC → 3.3V
 *   - GND → GND
 * 
 * MPU6050:
 *   - SDA → GPIO21
 *   - SCL → GPIO22
 *   - VCC → 3.3V
 *   - GND → GND
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "Sasuke Uchiha";
const char* password = "sasukeuchiha";

// Backend API URL
const char* apiUrl = "https://oracle-apis.hardikgarg.me/ignition-hackathon/api/esp32-chest";

// GPS Serial (using Serial2)
HardwareSerial gpsSerial(2);
TinyGPSPlus gps;

// MPU6050 IMU
Adafruit_MPU6050 mpu;

// Timing
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 2000; // 2 seconds

void setup() {
  Serial.begin(115200);
  Serial.println("ESP32 Chest Sensor - Initializing...");
  
  // Initialize GPS
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17); // RX=16, TX=17
  Serial.println("GPS initialized");
  
  // Initialize MPU6050
  Wire.begin(21, 22); // SDA=21, SCL=22
  if (!mpu.begin()) {
    Serial.println("Failed to find MPU6050!");
    while (1) {
      delay(10);
    }
  }
  Serial.println("MPU6050 initialized");
  
  // Configure MPU6050
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  
  Serial.println("System ready!");
}

void loop() {
  // Read GPS data continuously
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }
  
  // Send data every 2 seconds (on even seconds)
  unsigned long currentTime = millis();
  if (currentTime - lastSendTime >= sendInterval) {
    lastSendTime = currentTime;
    sendSensorData();
  }
}

void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return;
  }
  
  // Read MPU6050 data
  sensors_event_t accel, gyro, temp;
  mpu.getEvent(&accel, &gyro, &temp);
  
  // Prepare JSON payload
  StaticJsonDocument<512> doc;
  
  // GPS Data
  if (gps.location.isValid()) {
    doc["latitude"] = gps.location.lat();
    doc["longitude"] = gps.location.lng();
  } else {
    doc["latitude"] = nullptr;
    doc["longitude"] = nullptr;
  }
  
  if (gps.altitude.isValid()) {
    doc["altitude"] = gps.altitude.meters();
  } else {
    doc["altitude"] = nullptr;
  }
  
  if (gps.speed.isValid()) {
    doc["speed"] = gps.speed.kmph();
  } else {
    doc["speed"] = 0.0;
  }
  
  if (gps.course.isValid()) {
    doc["heading"] = gps.course.deg();
  } else {
    doc["heading"] = nullptr;
  }
  
  if (gps.hdop.isValid()) {
    doc["accuracy"] = gps.hdop.hdop();
  } else {
    doc["accuracy"] = nullptr;
  }
  
  if (gps.satellites.isValid()) {
    doc["satellites"] = gps.satellites.value();
  } else {
    doc["satellites"] = 0;
  }
  
  // MPU6050 Data
  doc["accel_x"] = accel.acceleration.x;
  doc["accel_y"] = accel.acceleration.y;
  doc["accel_z"] = accel.acceleration.z;
  doc["gyro_x"] = gyro.gyro.x;
  doc["gyro_y"] = gyro.gyro.y;
  doc["gyro_z"] = gyro.gyro.z;
  doc["temperature"] = temp.temperature;
  
  // Convert to JSON string
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  // Print for debugging
  Serial.println("Sending data:");
  Serial.println(jsonPayload);
  
  // Send HTTP POST request
  HTTPClient http;
  http.begin(apiUrl);
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response: ");
    Serial.println(httpResponseCode);
    String response = http.getString();
    Serial.println(response);
  } else {
    Serial.print("HTTP Error: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}
