# Ignition Hackathon - Rider Telemetry System

A comprehensive IoT-based rider safety monitoring system using dual ESP32 sensors, real-time data analytics, and instant notifications via Telegram bot.

## 🎯 Overview

This system monitors rider activity using two ESP32 microcontrollers equipped with sensors:
- **Leg Sensor**: NEO-6M GPS + MPU6050 IMU
- **Chest Sensor**: MPU6050 IMU

Data is collected every 2 seconds, analyzed for safety events (harsh braking, acceleration, falls), and displayed on a real-time web dashboard with Telegram notifications for critical events.

## 🏗️ Architecture

```
┌─────────────┐         ┌─────────────┐
│  ESP32 Leg  │         │ ESP32 Chest │
│  GPS + IMU  │         │     IMU     │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │      WiFi             │
       └───────┬───────────────┘
               │
       ┌───────▼────────┐
       │  Flask Backend │
       │  (Port 7777)   │
       └───────┬────────┘
               │
       ┌───────▼────────┐
       │    Supabase    │
       │   PostgreSQL   │
       └───────┬────────┘
               │
       ┌───────▼────────────┐
       │  React Frontend    │
       │  Google Maps       │
       │  3D Visualization  │
       └────────────────────┘
               │
       ┌───────▼────────┐
       │  Telegram Bot  │
       │  Notifications │
       └────────────────┘
```

## ✨ Features

### 📡 Real-Time Monitoring
- 2-second data polling from dual ESP32 sensors
- Live GPS tracking with Google Maps integration
- 3D gyroscope visualization showing posture difference
- Comprehensive sensor dashboard (acceleration, gyroscope, temperature)

### 🚨 Safety Detection
- **Harsh Braking**: Detects deceleration < -8.0 m/s²
- **Harsh Acceleration**: Detects acceleration > 6.0 m/s²
- **Fall Detection**: Monitors posture difference > 15.0°/s
- **Activity Classification**: WALKING, SCOOTER, MOTORCYCLE, STATIONARY

### 📱 Telegram Integration
- Real-time notifications for critical events
- PIN-based account linking
- `/status` command for current ride stats
- `/register`, `/unlink`, `/help` commands

### 🎨 Professional UI/UX
- Mobile-first responsive design
- Dark theme optimized for readability
- Interactive 3D sensor visualization
- Color-coded event severity (LOW/MEDIUM/HIGH/CRITICAL)

## 📁 Project Structure

```
ignition-hackathon/
├── supabase/
│   └── setup.sql              # Database schema
├── backend/
│   ├── server.py              # Flask API
│   ├── requirements.txt
│   ├── nginx.conf
│   └── .env.example
├── telegram-bot/
│   ├── tele-bot.py           # Telegram bot
│   ├── requirements.txt
│   └── .env.example
├── esp32-code/
│   ├── esp32-leg-sensor.ino  # Leg sensor code
│   ├── esp32-chest-sensor.ino # Chest sensor code
│   └── README.md             # Wiring instructions
└── frontend/
    ├── src/
    │   ├── components/       # React components
    │   ├── App.js
    │   └── index.js
    ├── package.json
    ├── .env.example
    └── README.md
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 14+
- PostgreSQL (or Supabase account)
- Arduino IDE (for ESP32 programming)
- 2x ESP32 boards
- NEO-6M GPS module
- 2x MPU6050 IMU sensors

### 1. Database Setup

```bash
# Create a Supabase project or use local PostgreSQL
psql -U postgres -d your_database -f supabase/setup.sql
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database credentials
python server.py
```

Backend runs on `http://localhost:7777`

### 3. Telegram Bot Setup

```bash
cd telegram-bot
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Telegram Bot Token
python tele-bot.py
```

Get a bot token from [@BotFather](https://t.me/botfather) on Telegram.

### 4. ESP32 Setup

1. Open Arduino IDE
2. Install required libraries (see `esp32-code/README.md`)
3. Configure WiFi credentials in the `.ino` files
4. Set `BACKEND_URL` to your Flask server
5. Upload code to respective ESP32 boards
6. Wire sensors as per wiring diagram

### 5. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with Google Maps API key
npm start
```

Frontend runs on `http://localhost:3000`

## 📊 Database Schema

### Tables
- **esp32_leg_data**: GPS + IMU data from leg sensor
- **esp32_chest_data**: IMU data from chest sensor
- **ride_sessions**: Ride tracking
- **events**: Safety events (harsh brake/accel, falls)
- **telegram_users**: Linked Telegram accounts
- **telegram_pins**: Temporary PINs for linking

### Views
- **latest_sensor_data**: Real-time sensor readings
- **recent_events**: Last 100 events

## 🔧 Configuration

### Backend (`.env`)
```env
DATABASE_URL=postgresql://user:pass@host:port/db
PORT=7777
```

### Telegram Bot (`.env`)
```env
TELEGRAM_BOT_TOKEN=your_token_here
DATABASE_URL=postgresql://user:pass@host:port/db
```

### Frontend (`.env`)
```env
REACT_APP_API_URL=http://localhost:7777
REACT_APP_GOOGLE_MAPS_API_KEY=your_key_here
```

### ESP32 Code
```cpp
const char* ssid = "YourWiFiSSID";
const char* password = "YourWiFiPassword";
const char* serverName = "http://your-server:7777/api/esp32-leg";
```

## 📱 API Endpoints

### Backend
- `GET /health` - Health check
- `POST /api/esp32-leg` - Receive leg sensor data
- `POST /api/esp32-chest` - Receive chest sensor data
- `GET /api/live-data` - Get latest sensor data + events
- `POST /api/telegram/verify-pin` - Verify Telegram PIN
- `GET /api/events/recent` - Get recent events

### Telegram Bot Commands
- `/start` - Welcome message
- `/register` - Generate 6-digit PIN for linking
- `/status` - Get current ride stats
- `/unlink` - Unlink Telegram account
- `/notifications` - Toggle notifications
- `/help` - Show help

## 🎮 Usage

1. **Power on ESP32 sensors** and mount them (leg and chest)
2. **Open the React dashboard** in your browser
3. **Link your Telegram account**:
   - Click "Link Telegram" button
   - Send `/register` to the bot
   - Enter the 6-digit PIN
4. **Start riding** - Data updates every 2 seconds
5. **Monitor events** - Critical events trigger Telegram notifications

## 🐛 Troubleshooting

### ESP32 not connecting
- Check WiFi credentials
- Verify backend URL is accessible from ESP32 network
- Monitor Serial output (115200 baud)

### Frontend not loading data
- Verify backend is running on port 7777
- Check CORS configuration
- Inspect browser console for errors

### Telegram notifications not working
- Ensure bot token is correct
- Check database connection
- Verify user is linked via PIN

### GPS not getting fix
- Ensure NEO-6M has clear sky view
- Wait 1-2 minutes for initial fix
- Check antenna connection

## 🏆 Hackathon Highlights

- **Built in 48 hours** for Ignition Hackathon
- **Full-stack IoT solution** from hardware to web app
- **Real-time safety monitoring** with instant notifications
- **Professional UI/UX** with 3D visualizations
- **Scalable architecture** ready for production

## 📄 License

MIT License - See individual component licenses for details

## 🤝 Contributing

This is a hackathon project. Feel free to fork and improve!

## 📧 Contact

For questions or issues, please open a GitHub issue.

---

Built with ❤️ for rider safety | Ignition Hackathon 2024
