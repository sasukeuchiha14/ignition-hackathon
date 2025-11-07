"""
ESP32 #2 - CHEST SENSOR (MicroPython)
Reads data from:
- NEO-6M GPS Module
- MPU6050 IMU (Accelerometer + Gyroscope + Temperature)

Sends data to backend API every 2 seconds

Wiring:
NEO-6M GPS:
  - TX → GPIO16 (RX2)
  - RX → GPIO17 (TX2)
  - VCC → 3.3V
  - GND → GND

MPU6050:
  - SDA → GPIO21
  - SCL → GPIO22
  - VCC → 3.3V
  - GND → GND

Installation:
1. Flash MicroPython firmware to ESP32
2. Install required libraries via Thonny package manager:
   - mpu6050 (or use the included MPU6050 class)
3. Update WiFi credentials and API URL
4. Upload this file to ESP32 via Thonny
"""

import machine
import time
import network
import urequests as requests
import ujson as json
from machine import Pin, I2C, UART
import gc

# WiFi Configuration
WIFI_SSID = "Sasuke Uchiha"
WIFI_PASSWORD = "sasukeuchiha"

# Backend API URL
API_URL = "https://oracle-apis.hardikgarg.me/ignition-hackathon/api/esp32-chest"

# Timing
SEND_INTERVAL = 2000  # 2 seconds in milliseconds

class MPU6050:
    """Simple MPU6050 driver for MicroPython"""
    
    def __init__(self, i2c, addr=0x68):
        self.i2c = i2c
        self.addr = addr
        # Wake up the MPU6050
        self.i2c.writeto_mem(self.addr, 0x6B, bytes([0]))
        time.sleep(0.1)
        
    def read_raw_data(self, addr):
        """Read raw 16-bit data from MPU6050"""
        high = self.i2c.readfrom_mem(self.addr, addr, 1)[0]
        low = self.i2c.readfrom_mem(self.addr, addr + 1, 1)[0]
        value = (high << 8) | low
        if value >= 32768:
            value = value - 65536
        return value
    
    def get_accel_data(self):
        """Get accelerometer data in m/s²"""
        accel_x = self.read_raw_data(0x3B)
        accel_y = self.read_raw_data(0x3D)
        accel_z = self.read_raw_data(0x3F)
        
        # Convert to m/s² (±8g range, 16-bit ADC)
        accel_scale = 8.0 * 9.81 / 32768.0
        return {
            'x': accel_x * accel_scale,
            'y': accel_y * accel_scale,
            'z': accel_z * accel_scale
        }
    
    def get_gyro_data(self):
        """Get gyroscope data in rad/s"""
        gyro_x = self.read_raw_data(0x43)
        gyro_y = self.read_raw_data(0x45)
        gyro_z = self.read_raw_data(0x47)
        
        # Convert to rad/s (±500°/s range, 16-bit ADC)
        gyro_scale = 500.0 * 3.14159 / (180.0 * 32768.0)
        return {
            'x': gyro_x * gyro_scale,
            'y': gyro_y * gyro_scale,
            'z': gyro_z * gyro_scale
        }
    
    def get_temp_data(self):
        """Get temperature data in Celsius"""
        temp_raw = self.read_raw_data(0x41)
        # Convert to Celsius
        temp_c = (temp_raw / 340.0) + 36.53
        return temp_c

class SimpleGPS:
    """Simple GPS parser for NEO-6M"""
    
    def __init__(self, uart):
        self.uart = uart
        self.latitude = None
        self.longitude = None
        self.altitude = None
        self.speed = None
        self.heading = None
        self.satellites = 0
        self.hdop = None
        self.fix_quality = 0
        
    def update(self):
        """Read and parse GPS data"""
        try:
            if self.uart.any():
                line = self.uart.readline()
                if line:
                    sentence = line.decode('ascii').strip()
                    self.parse_nmea(sentence)
        except:
            pass
    
    def parse_nmea(self, sentence):
        """Parse NMEA sentences"""
        try:
            if sentence.startswith('$GPGGA') or sentence.startswith('$GNGGA'):
                self.parse_gga(sentence)
            elif sentence.startswith('$GPRMC') or sentence.startswith('$GNRMC'):
                self.parse_rmc(sentence)
            elif sentence.startswith('$GPVTG') or sentence.startswith('$GNVTG'):
                self.parse_vtg(sentence)
        except:
            pass
    
    def parse_gga(self, sentence):
        """Parse GGA sentence (GPS fix data)"""
        try:
            parts = sentence.split(',')
            if len(parts) >= 15:
                # Latitude
                if parts[2] and parts[3]:
                    lat = float(parts[2])
                    lat_deg = int(lat / 100)
                    lat_min = lat % 100
                    self.latitude = lat_deg + lat_min / 60.0
                    if parts[3] == 'S':
                        self.latitude = -self.latitude
                
                # Longitude
                if parts[4] and parts[5]:
                    lon = float(parts[4])
                    lon_deg = int(lon / 100)
                    lon_min = lon % 100
                    self.longitude = lon_deg + lon_min / 60.0
                    if parts[5] == 'W':
                        self.longitude = -self.longitude
                
                # Fix quality
                if parts[6]:
                    self.fix_quality = int(parts[6])
                
                # Satellites
                if parts[7]:
                    self.satellites = int(parts[7])
                
                # HDOP
                if parts[8]:
                    self.hdop = float(parts[8])
                
                # Altitude
                if parts[9]:
                    self.altitude = float(parts[9])
        except:
            pass
    
    def parse_rmc(self, sentence):
        """Parse RMC sentence (recommended minimum)"""
        try:
            parts = sentence.split(',')
            if len(parts) >= 10:
                # Speed (knots to km/h)
                if parts[7]:
                    speed_knots = float(parts[7])
                    self.speed = speed_knots * 1.852
                
                # Course/Heading
                if parts[8]:
                    self.heading = float(parts[8])
        except:
            pass
    
    def parse_vtg(self, sentence):
        """Parse VTG sentence (velocity made good)"""
        try:
            parts = sentence.split(',')
            if len(parts) >= 10:
                # Speed in km/h
                if parts[7]:
                    self.speed = float(parts[7])
                
                # Course
                if parts[1]:
                    self.heading = float(parts[1])
        except:
            pass
    
    def is_valid(self):
        """Check if GPS has valid fix"""
        return (self.fix_quality > 0 and 
                self.latitude is not None and 
                self.longitude is not None)

def connect_wifi():
    """Connect to WiFi network"""
    print("ESP32 Chest Sensor - Initializing...")
    
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    
    if not wlan.isconnected():
        print(f"Connecting to WiFi: {WIFI_SSID}")
        wlan.connect(WIFI_SSID, WIFI_PASSWORD)
        
        timeout = 0
        while not wlan.isconnected() and timeout < 20:
            print(".", end="")
            time.sleep(1)
            timeout += 1
        
        if wlan.isconnected():
            print(f"\nWiFi connected!")
            print(f"IP Address: {wlan.ifconfig()[0]}")
        else:
            print("\nFailed to connect to WiFi!")
            return False
    return True

def initialize_sensors():
    """Initialize GPS and MPU6050 sensors"""
    try:
        # Initialize GPS UART
        gps_uart = UART(2, baudrate=9600, tx=17, rx=16)
        gps = SimpleGPS(gps_uart)
        print("GPS initialized")
        
        # Initialize I2C for MPU6050
        i2c = I2C(0, scl=Pin(22), sda=Pin(21), freq=400000)
        print("I2C initialized")
        
        # Scan for devices
        devices = i2c.scan()
        print(f"I2C devices found: {[hex(device) for device in devices]}")
        
        # Initialize MPU6050
        if 0x68 in devices:
            mpu = MPU6050(i2c)
            print("MPU6050 initialized")
            return gps, mpu
        else:
            print("MPU6050 not found!")
            return gps, None
    except Exception as e:
        print(f"Error initializing sensors: {e}")
        return None, None

def send_sensor_data(gps, mpu):
    """Read sensors and send data to backend"""
    try:
        # Check WiFi connection
        wlan = network.WLAN(network.STA_IF)
        if not wlan.isconnected():
            print("WiFi not connected!")
            return False
        
        # Update GPS data
        gps.update()
        
        # Read MPU6050 data
        accel_data = mpu.get_accel_data()
        gyro_data = mpu.get_gyro_data()
        temp_data = mpu.get_temp_data()
        
        # Prepare JSON payload
        payload = {
            # GPS Data
            "latitude": gps.latitude,
            "longitude": gps.longitude,
            "altitude": gps.altitude,
            "speed": round(gps.speed, 1) if gps.speed else 0.0,
            "heading": gps.heading,
            "accuracy": gps.hdop,
            "satellites": gps.satellites,
            
            # MPU6050 Data
            "accel_x": round(accel_data['x'], 3),
            "accel_y": round(accel_data['y'], 3),
            "accel_z": round(accel_data['z'], 3),
            "gyro_x": round(gyro_data['x'], 3),
            "gyro_y": round(gyro_data['y'], 3),
            "gyro_z": round(gyro_data['z'], 3),
            "temperature": round(temp_data, 2)
        }
        
        print("Sending data:")
        print(json.dumps(payload))
        
        # Send HTTP POST request
        headers = {'Content-Type': 'application/json'}
        response = requests.post(API_URL, json=payload, headers=headers, timeout=5)
        
        print(f"HTTP Response: {response.status_code}")
        if response.status_code == 200 or response.status_code == 201:
            print("Data sent successfully!")
            print(response.text)
        else:
            print(f"HTTP Error: {response.status_code}")
            print(response.text)
        
        response.close()
        return True
        
    except Exception as e:
        print(f"Error sending data: {e}")
        return False

def main():
    """Main execution loop"""
    print("=" * 40)
    print("ESP32 Chest Sensor Starting...")
    print("=" * 40)
    
    # Connect to WiFi
    if not connect_wifi():
        print("Cannot continue without WiFi!")
        return
    
    # Initialize sensors
    gps, mpu = initialize_sensors()
    if not mpu:
        print("Cannot continue without MPU6050!")
        return
    
    print("System ready!")
    print("Waiting for GPS fix...")
    print("=" * 40)
    
    last_send_time = 0
    gps_status_printed = False
    
    try:
        while True:
            current_time = time.ticks_ms()
            
            # Continuously update GPS
            if gps:
                gps.update()
                
                # Print GPS status once
                if not gps_status_printed:
                    if gps.is_valid():
                        print(f"GPS Fix acquired! Lat: {gps.latitude}, Lon: {gps.longitude}")
                        print(f"Satellites: {gps.satellites}, HDOP: {gps.hdop}")
                        gps_status_printed = True
                    elif gps.satellites > 0:
                        print(f"GPS searching... Satellites: {gps.satellites}")
            
            # Send data every 2 seconds
            if time.ticks_diff(current_time, last_send_time) >= SEND_INTERVAL:
                last_send_time = current_time
                
                success = send_sensor_data(gps, mpu)
                
                # Force garbage collection to free memory
                gc.collect()
                
                if success:
                    print(f"Free memory: {gc.mem_free()} bytes")
                
                # Reset GPS status flag for periodic updates
                gps_status_printed = False
            
            # Small delay to prevent watchdog timeout
            time.sleep(0.1)
            
    except KeyboardInterrupt:
        print("\nProgram stopped by user")
    except Exception as e:
        print(f"Unexpected error: {e}")
    finally:
        print("Cleaning up...")

# Auto-run when uploaded to ESP32
if __name__ == "__main__":
    main()