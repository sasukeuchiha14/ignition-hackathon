# MicroPython ESP32 Setup Guide

This guide helps you set up and run the MicroPython versions of the ESP32 sensor scripts using Thonny IDE.

## Hardware Wiring

### ESP32 #1 - Leg Sensor (MPU6050 only)
```
MPU6050:
  - SDA → GPIO21
  - SCL → GPIO22  
  - VCC → 3.3V
  - GND → GND
```

### ESP32 #2 - Chest Sensor (MPU6050 + GPS)
```
MPU6050:
  - SDA → GPIO21
  - SCL → GPIO22
  - VCC → 3.3V
  - GND → GND

NEO-6M GPS:
  - TX → GPIO16 (RX2)
  - RX → GPIO17 (TX2)
  - VCC → 3.3V
  - GND → GND
```

## Software Setup

### 1. Install MicroPython Firmware

1. **Download ESP32 MicroPython Firmware:**
   - Go to: https://micropython.org/download/esp32/
   - Download the latest stable version (e.g., `esp32-20240222-v1.22.2.bin`)

2. **Install esptool (if not already installed):**
   ```bash
   pip install esptool
   ```

3. **Flash MicroPython to ESP32:**
   ```bash
   # Erase existing firmware
   esptool --chip esp32 --port COM3 erase_flash
   
   # Flash MicroPython (adjust COM port and firmware path)
   esptool --chip esp32 --port COM3 --baud 460800 write_flash -z 0x1000 esp32-20240222-v1.22.2.bin
   ```

   **Note:** Replace `COM3` with your actual COM port (Windows) or `/dev/ttyUSB0` (Linux/Mac)

### 2. Install Thonny IDE

1. **Download Thonny:**
   - Go to: https://thonny.org/
   - Download and install for your operating system

2. **Configure Thonny for ESP32:**
   - Open Thonny
   - Go to `Tools` → `Options` → `Interpreter`
   - Select `MicroPython (ESP32)`
   - Choose the correct COM port
   - Click `OK`

3. **Test Connection:**
   - In Thonny's shell, you should see:
   ```
   MicroPython v1.22.2 on 2024-02-22; ESP32 module with ESP32
   Type "help()" for more information.
   >>>
   ```

### 3. Install Required Libraries

The scripts use built-in MicroPython libraries, but you may need to install `urequests` if not available:

1. **In Thonny Shell:**
   ```python
   import upip
   upip.install('micropython-urequests')
   ```

   Or manually download and upload the `urequests.py` file to your ESP32.

## Configuration

### 1. Update WiFi Credentials

Edit both scripts and update these lines:
```python
WIFI_SSID = "Your_WiFi_Name"
WIFI_PASSWORD = "Your_WiFi_Password"
```

### 2. Update API URLs (if needed)

The scripts are configured for the production API:
```python
# Leg sensor
API_URL = "https://oracle-apis.hardikgarg.me/ignition-hackathon/api/esp32-leg"

# Chest sensor  
API_URL = "https://oracle-apis.hardikgarg.me/ignition-hackathon/api/esp32-chest"
```

For local development, change to:
```python
API_URL = "http://192.168.1.100:7777/api/esp32-leg"  # Your local IP
```

## Running the Scripts

### Method 1: Direct Run in Thonny

1. **Open Script:**
   - In Thonny, open `micropython_leg_sensor.py` or `micropython_chest_sensor.py`

2. **Upload to ESP32:**
   - Click `File` → `Save as...`
   - Choose `MicroPython device`
   - Save as `main.py` (will auto-run on boot) or keep original name

3. **Run Script:**
   - Press F5 or click the green "Run" button
   - Monitor output in the shell

### Method 2: Upload and Auto-Run

1. **Save as main.py:**
   - Save your chosen script as `main.py` on the ESP32
   - The script will automatically run when the ESP32 boots

2. **Manual Boot:**
   - Press the reset button on ESP32
   - Or use Ctrl+D in Thonny shell to soft reset

## Monitoring and Debugging

### Serial Monitor in Thonny
- The shell window shows all print statements
- Use this to monitor sensor readings and debug issues

### Common Debug Commands
```python
# Check WiFi status
import network
wlan = network.WLAN(network.STA_IF)
print("Connected:", wlan.isconnected())
print("IP:", wlan.ifconfig()[0])

# Check I2C devices
from machine import Pin, I2C
i2c = I2C(0, scl=Pin(22), sda=Pin(21))
print("I2C devices:", [hex(x) for x in i2c.scan()])

# Test GPS (chest sensor only)
from machine import UART
uart = UART(2, baudrate=9600, tx=17, rx=16)
while True:
    if uart.any():
        print(uart.readline())
```

## Troubleshooting

### WiFi Connection Issues
- **Wrong credentials:** Double-check SSID and password
- **Network range:** Ensure ESP32 is close to router
- **2.4GHz only:** ESP32 doesn't support 5GHz networks

### Sensor Issues
- **MPU6050 not found:** Check I2C wiring (SDA/SCL)
- **GPS no fix:** Move to outdoor location, wait 2-3 minutes
- **Memory errors:** Restart ESP32, the scripts include garbage collection

### API Connection Issues
- **HTTP errors:** Check backend server status
- **Timeout:** Increase timeout in `requests.post(timeout=10)`
- **SSL errors:** Use HTTP instead of HTTPS for local testing

## File Structure on ESP32

After setup, your ESP32 should contain:
```
/
├── boot.py          (MicroPython default)
├── main.py          (Your sensor script - runs on boot)
└── lib/             (Additional libraries if needed)
    └── urequests.py
```

## Performance Notes

- **Memory Usage:** ESP32 has limited RAM, scripts include `gc.collect()`
- **Timing:** 2-second intervals match the Arduino versions
- **Error Handling:** Scripts continue running even with temporary errors
- **GPS Fix Time:** First GPS fix can take 30-60 seconds outdoors

## Switching Between Arduino and MicroPython

You can easily switch between development environments:

1. **Arduino → MicroPython:**
   - Flash MicroPython firmware
   - Upload MicroPython script

2. **MicroPython → Arduino:**
   - Flash Arduino sketch directly (overwrites MicroPython)
   - Or use Arduino IDE to upload

Both versions send identical JSON payloads to the same API endpoints, ensuring compatibility with your existing backend and frontend.