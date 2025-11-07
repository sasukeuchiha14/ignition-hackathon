# Rider Telemetry Frontend

A real-time dashboard for monitoring ESP32 sensor data from leg and chest-mounted devices, built with React for the Ignition Hackathon.

## Features

- 🗺️ **Live GPS Tracking**: Real-time location display on Google Maps
- 📊 **Sensor Dashboard**: Monitor acceleration, gyroscope, temperature data
- 🎮 **3D Gyroscope Visualization**: Interactive 3D view of sensor orientation
- 🚨 **Event Monitoring**: Track harsh brakes, accelerations, and fall detection
- 📱 **Telegram Integration**: Link your account for instant notifications
- 🌙 **Dark Theme**: Mobile-first responsive design
- ⚡ **2-Second Updates**: Near real-time data polling

## Prerequisites

- Node.js 14.x or higher
- npm or yarn
- Google Maps API key
- Backend server running on port 7777

## Installation

1. **Clone the repository** (if not already done):
   ```bash
   cd ignition-hackathon/frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file**:
   ```env
   REACT_APP_API_URL=http://localhost:7777
   REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```

   To get a Google Maps API key:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable "Maps JavaScript API"
   - Create credentials (API key)
   - Restrict the key to your domain (optional but recommended)

## Usage

### Development Mode

Start the development server:

```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Production Build

Build the optimized production bundle:

```bash
npm run build
```

The build files will be in the `build/` directory.

### Serve Production Build

```bash
npm install -g serve
serve -s build -l 3000
```

## Project Structure

```
frontend/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── components/
│   │   ├── MapView.js      # Google Maps component
│   │   ├── MapView.css
│   │   ├── GyroscopeViz.js # 3D gyroscope visualization
│   │   ├── GyroscopeViz.css
│   │   ├── Dashboard.js    # Sensor data cards
│   │   ├── Dashboard.css
│   │   ├── TelegramLink.js # Telegram linking modal
│   │   ├── TelegramLink.css
│   │   ├── EventsPanel.js  # Events list
│   │   └── EventsPanel.css
│   ├── App.js              # Main application component
│   ├── App.css             # App-level styles
│   ├── index.js            # React entry point
│   └── index.css           # Global styles
├── .env.example            # Environment variables template
├── package.json            # Dependencies
└── README.md               # This file
```

## Components

### MapView
- Displays real-time GPS location on Google Maps
- Shows coordinates, altitude, speed, heading, satellites, accuracy
- Dark theme map styling

### GyroscopeViz
- 3D visualization using Three.js
- Shows leg and chest sensor orientation
- Calculates and displays posture difference
- Interactive camera controls (orbit, zoom, pan)

### Dashboard
- Grid of sensor data cards
- Activity status badge (WALKING/SCOOTER/MOTORCYCLE/STATIONARY)
- Acceleration, gyroscope, temperature readings
- System status indicators

### TelegramLink
- Modal dialog for linking Telegram account
- 6-digit PIN verification
- Step-by-step instructions
- Success/error messaging

### EventsPanel
- Scrollable list of events
- Color-coded by severity (LOW/MEDIUM/HIGH/CRITICAL)
- Event icons and descriptions
- Google Maps links for event locations
- Telegram notification status

## API Integration

The frontend communicates with the backend via REST API:

- `GET /api/live-data` - Fetch latest sensor data and events (polled every 2 seconds)
- `POST /api/telegram/verify-pin` - Verify Telegram PIN for account linking

## Responsive Design

The app is optimized for mobile devices:
- Touch-friendly controls
- Optimized layout for small screens
- Efficient scrolling and gesture handling
- Maximum scale prevented for better mobile experience

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Google Maps not loading
- Check if `REACT_APP_GOOGLE_MAPS_API_KEY` is set correctly
- Verify API key has "Maps JavaScript API" enabled
- Check browser console for API key errors

### Connection issues
- Ensure backend server is running on port 7777
- Check `REACT_APP_API_URL` in `.env`
- Verify CORS is enabled on backend

### Gyroscope visualization not rendering
- Check if browser supports WebGL
- Clear browser cache and reload
- Check for Three.js errors in console

## Performance Tips

- The app polls every 2 seconds - avoid increasing frequency
- Close unused browser tabs to reduce memory usage
- Use production build for better performance
- Consider lazy loading components for larger deployments

## License

MIT License - See LICENSE file for details

## Hackathon Notes

This project was built for the Ignition Hackathon with a focus on:
- Real-time rider safety monitoring
- Professional UI/UX design
- Mobile-first approach
- Integration with physical sensors (ESP32)

Built with ❤️ for safer rides!
