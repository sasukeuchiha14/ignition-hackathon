# ESP32 Arduino Libraries Required

## For Both ESP32s:
- WiFi (Built-in)
- HTTPClient (Built-in)
- Wire (Built-in)
- Adafruit MPU6050 by Adafruit
- Adafruit Unified Sensor by Adafruit
- ArduinoJson by Benoit Blanchon

## For ESP32 #1 (Leg - with GPS):
- TinyGPSPlus by Mikal Hart

## Installation via Arduino IDE:
1. Open Arduino IDE
2. Go to Sketch → Include Library → Manage Libraries
3. Search and install each library above

## Board Manager:
- ESP32 by Espressif Systems

## Pin Configuration:

### ESP32 #1 (Leg):
- GPS RX: GPIO16
- GPS TX: GPIO17
- MPU6050 SDA: GPIO21
- MPU6050 SCL: GPIO22

### ESP32 #2 (Chest):
- MPU6050 SDA: GPIO21
- MPU6050 SCL: GPIO22

## Before Uploading:
1. Update WiFi credentials in both .ino files
2. Update backend API URL to your actual domain
3. Select "ESP32 Dev Module" as board
4. Select correct COM port
5. Upload to each ESP32

## Testing:
- Open Serial Monitor (115200 baud)
- Check GPS lock (may take 1-2 minutes outdoors)
- Verify HTTP response codes (201 = success)
