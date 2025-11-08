# Flask Backend for Ignition Hackathon - Rider Telemetry
# Port: 7777 (internal) → /ignition-hackathon/ (via NGINX)

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime, timedelta
import logging
import math

# Load environment variables
load_dotenv()

# Initialize Flask
app = Flask(__name__)
CORS(app)

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Telegram Configuration
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Settings
HARSH_BRAKE_THRESHOLD = -8.0  # m/s²
HARSH_ACCEL_THRESHOLD = 6.0   # m/s²
FALL_DETECTION_THRESHOLD = 15.0  # Combined sensor difference


# =============================================
# HELPER FUNCTIONS
# =============================================

def calculate_acceleration_magnitude(accel_x, accel_y, accel_z):
    """Calculate total acceleration magnitude"""
    return math.sqrt(accel_x**2 + accel_y**2 + accel_z**2)


def detect_activity_type(leg_data, chest_data):
    """
    Detect if rider is walking, on scooter, motorcycle, or stationary
    Based on:
    - Speed (from chest GPS)
    - Gyroscope magnitude (leg movement intensity)
    - Posture difference (chest vs leg orientation)
    """
    try:
        # Get speed from chest GPS (ensure it's a number)
        speed = float(chest_data.get('speed', 0) or 0)
        
        # Calculate gyroscope magnitude for leg (movement detection)
        leg_gyro_magnitude = math.sqrt(
            (leg_data.get('gyro_x', 0) or 0)**2 + 
            (leg_data.get('gyro_y', 0) or 0)**2 + 
            (leg_data.get('gyro_z', 0) or 0)**2
        )
        
        # Calculate posture difference (orientation difference)
        leg_accel = [
            leg_data.get('accel_x', 0) or 0,
            leg_data.get('accel_y', 0) or 0,
            leg_data.get('accel_z', 9.8) or 9.8  # Default to gravity
        ]
        chest_accel = [
            chest_data.get('accel_x', 0) or 0,
            chest_data.get('accel_y', 0) or 0,
            chest_data.get('accel_z', 9.8) or 9.8  # Default to gravity
        ]
        
        # Calculate angle difference (dot product approach)
        leg_mag = math.sqrt(sum(x**2 for x in leg_accel))
        chest_mag = math.sqrt(sum(x**2 for x in chest_accel))
        
        angle_diff = 0
        if leg_mag > 0.1 and chest_mag > 0.1:  # Avoid division by zero
            dot_product = sum(l*c for l, c in zip(leg_accel, chest_accel))
            cos_angle = dot_product / (leg_mag * chest_mag)
            cos_angle = max(-1, min(1, cos_angle))  # Clamp to [-1, 1]
            angle_diff = math.degrees(math.acos(cos_angle))
        
        logger.info(f"Activity Detection - Speed: {speed:.2f} km/h, Gyro: {leg_gyro_magnitude:.3f}, Angle: {angle_diff:.1f}°")
        
        # Detection logic (prioritize speed ranges)
        
        # Stationary: Very low speed
        if speed < 1:
            return 'STATIONARY'
        
        # Walking: 1-15 km/h (walking speed range)
        # Check gyro for stepping pattern, but don't require it strictly
        elif 1 <= speed <= 15:
            # If we detect stepping pattern (high gyro), definitely walking
            if leg_gyro_magnitude > 0.2:
                return 'WALKING'
            # Even without strong gyro signal, this speed range is typically walking
            else:
                return 'WALKING'  # Default to walking in this speed range
        
        # Scooter/Motorcycle: > 15 km/h (vehicle speed)
        # Differentiate by posture angle
        elif speed > 15:
            # Scooter: more upright position (< 20° difference)
            if angle_diff < 20:
                return 'SCOOTER'
            # Motorcycle: forward lean position (>= 20° difference)
            else:
                return 'MOTORCYCLE'
        
        # Fallback (should rarely happen)
        else:
            return 'WALKING'  # Default to walking instead of unknown
            
    except Exception as e:
        logger.error(f"Activity detection error: {e}")
        return 'UNKNOWN'


def check_harsh_brake(accel_x):
    """Check if harsh braking occurred"""
    return accel_x < HARSH_BRAKE_THRESHOLD


def check_harsh_acceleration(accel_x):
    """Check if harsh acceleration occurred"""
    return accel_x > HARSH_ACCEL_THRESHOLD


def check_fall_or_accident(leg_data, chest_data):
    """
    Detect potential fall or accident
    If both sensors show drastically different readings
    """
    try:
        leg_total = calculate_acceleration_magnitude(
            leg_data.get('accel_x', 0),
            leg_data.get('accel_y', 0),
            leg_data.get('accel_z', 0)
        )
        chest_total = calculate_acceleration_magnitude(
            chest_data.get('accel_x', 0),
            chest_data.get('accel_y', 0),
            chest_data.get('accel_z', 0)
        )
        
        difference = abs(leg_total - chest_total)
        
        if difference > FALL_DETECTION_THRESHOLD:
            return True, difference
        return False, difference
        
    except Exception as e:
        logger.error(f"Fall detection error: {e}")
        return False, 0


def create_event(event_type, severity, leg_data, chest_data, description=""):
    """Create event in database and trigger Telegram alert if needed"""
    try:
        event_data = {
            "event_type": event_type,
            "severity": severity,
            "latitude": chest_data.get('latitude'),  # GPS is on chest now
            "longitude": chest_data.get('longitude'),
            "speed": chest_data.get('speed'),
            "leg_accel_x": leg_data.get('accel_x'),
            "leg_accel_y": leg_data.get('accel_y'),
            "leg_accel_z": leg_data.get('accel_z'),
            "chest_accel_x": chest_data.get('accel_x'),
            "chest_accel_y": chest_data.get('accel_y'),
            "chest_accel_z": chest_data.get('accel_z'),
            "description": description
        }
        
        result = supabase.table("events").insert(event_data).execute()
        
        # Trigger Telegram notification for critical events
        if severity in ['HIGH', 'CRITICAL']:
            notify_telegram(event_type, event_data)
        
        return result
        
    except Exception as e:
        logger.error(f"Error creating event: {e}")
        return None


def notify_telegram(event_type, event_data):
    """Send notification to linked Telegram users"""
    try:
        import requests
        
        # Get all linked users with notifications enabled
        users = supabase.table("telegram_users")\
            .select("telegram_chat_id")\
            .eq("is_linked", True)\
            .eq("notifications_enabled", True)\
            .execute()
        
        if not users.data:
            return
        
        # Prepare message
        message = f"🚨 *{event_type.replace('_', ' ')}*\n\n"
        message += f"⚠️ Severity: {event_data['severity']}\n"
        
        if event_data.get('latitude') and event_data.get('longitude'):
            lat = event_data['latitude']
            lon = event_data['longitude']
            message += f"📍 Location: [{lat:.6f}, {lon:.6f}](https://maps.google.com/?q={lat},{lon})\n"
        
        if event_data.get('speed'):
            message += f"🏍️ Speed: {event_data['speed']:.1f} km/h\n"
        
        if event_data.get('description'):
            message += f"\n{event_data['description']}"
        
        message += f"\n\n⏰ Time: {datetime.now().strftime('%H:%M:%S')}"
        
        # Send to all users
        for user in users.data:
            chat_id = user['telegram_chat_id']
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "Markdown"
            }
            requests.post(url, json=payload, timeout=5)
        
        # Update event as notified
        supabase.table("events")\
            .update({"telegram_notified": True, "telegram_sent_at": datetime.now().isoformat()})\
            .eq("id", event_data.get('id'))\
            .execute()
        
    except Exception as e:
        logger.error(f"Telegram notification error: {e}")


# =============================================
# API ENDPOINTS
# =============================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "ignition-hackathon-backend"
    }), 200


@app.route('/api/esp32-leg', methods=['POST'])
def receive_leg_data():
    """
    Receive data from ESP32 at leg (MPU6050 only)
    Expected JSON:
    {
        "accel_x": 0.5,
        "accel_y": 0.2,
        "accel_z": 9.8,
        "gyro_x": 0.1,
        "gyro_y": 0.05,
        "gyro_z": 0.02,
        "temperature": 28.5
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Add timestamp if not provided
        if 'timestamp' not in data:
            data['timestamp'] = datetime.now().isoformat()
        
        # Insert into database
        result = supabase.table("esp32_leg_data").insert(data).execute()
        
        logger.info(f"Leg data received: Accel({data.get('accel_x')}, {data.get('accel_y')}, {data.get('accel_z')})")
        
        return jsonify({
            "status": "success",
            "message": "Leg sensor data recorded",
            "id": result.data[0]['id'] if result.data else None
        }), 201
        
    except Exception as e:
        logger.error(f"Error receiving leg data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/esp32-chest', methods=['POST'])
def receive_chest_data():
    """
    Receive data from ESP32 at chest (GPS + MPU6050)
    Expected JSON:
    {
        "latitude": 12.9716,
        "longitude": 77.5946,
        "altitude": 920.5,
        "speed": 25.3,
        "heading": 180.5,
        "accuracy": 4.2,
        "satellites": 8,
        "accel_x": 0.3,
        "accel_y": 0.1,
        "accel_z": 9.7,
        "gyro_x": 0.05,
        "gyro_y": 0.02,
        "gyro_z": 0.01,
        "temperature": 27.8
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Add timestamp if not provided
        if 'timestamp' not in data:
            data['timestamp'] = datetime.now().isoformat()
        
        # Insert into database
        result = supabase.table("esp32_chest_data").insert(data).execute()
        
        logger.info(f"Chest data received: GPS({data.get('latitude')}, {data.get('longitude')}), Speed: {data.get('speed')}")
        
        # Check for events (harsh brake, acceleration, fall detection)
        # Get latest leg data to compare
        leg_data_result = supabase.table("esp32_leg_data")\
            .select("*")\
            .order("timestamp", desc=True)\
            .limit(1)\
            .execute()
        
        if leg_data_result.data:
            leg_data = leg_data_result.data[0]
            chest_data = data
            
            # Check harsh braking
            if check_harsh_brake(leg_data.get('accel_x', 0)):
                create_event(
                    "HARSH_BRAKE",
                    "MEDIUM",
                    leg_data,
                    chest_data,
                    f"Harsh braking detected: {leg_data.get('accel_x')} m/s²"
                )
            
            # Check harsh acceleration
            if check_harsh_acceleration(leg_data.get('accel_x', 0)):
                create_event(
                    "HARSH_ACCEL",
                    "LOW",
                    leg_data,
                    chest_data,
                    f"Harsh acceleration detected: {leg_data.get('accel_x')} m/s²"
                )
            
            # Check fall/accident
            is_fall, difference = check_fall_or_accident(leg_data, chest_data)
            if is_fall:
                create_event(
                    "FALL_DETECTED",
                    "CRITICAL",
                    leg_data,
                    chest_data,
                    f"Potential fall or accident detected! Sensor difference: {difference:.2f}"
                )
        
        return jsonify({
            "status": "success",
            "message": "Chest sensor data recorded",
            "id": result.data[0]['id'] if result.data else None
        }), 201
        
    except Exception as e:
        logger.error(f"Error receiving chest data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/live-data', methods=['GET'])
def get_live_data():
    """
    Get latest combined sensor data for frontend
    Returns matched data from both sensors (within 2 seconds)
    """
    try:
        # Get latest leg data
        leg_result = supabase.table("esp32_leg_data")\
            .select("*")\
            .order("timestamp", desc=True)\
            .limit(1)\
            .execute()
        
        # Get latest chest data
        chest_result = supabase.table("esp32_chest_data")\
            .select("*")\
            .order("timestamp", desc=True)\
            .limit(1)\
            .execute()
        
        leg_data = leg_result.data[0] if leg_result.data else {}
        chest_data = chest_result.data[0] if chest_result.data else {}
        
        # Detect activity type
        activity = detect_activity_type(leg_data, chest_data) if leg_data and chest_data else 'UNKNOWN'
        
        # Get recent events
        events_result = supabase.table("events")\
            .select("*")\
            .order("timestamp", desc=True)\
            .limit(10)\
            .execute()
        
        response = {
            "timestamp": datetime.now().isoformat(),
            "leg_sensor": leg_data,
            "chest_sensor": chest_data,
            "activity_type": activity,
            "recent_events": events_result.data if events_result.data else []
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error fetching live data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/telegram/verify-pin', methods=['POST'])
def verify_telegram_pin():
    """
    Verify PIN code for Telegram linking
    Expected JSON: {"pin": "123456"}
    """
    try:
        data = request.get_json()
        pin = data.get('pin')
        
        if not pin:
            return jsonify({"success": False, "message": "PIN is required"}), 400
        
        # Check if PIN exists and not expired
        pin_result = supabase.table("telegram_pins")\
            .select("*")\
            .eq("pin_code", pin)\
            .eq("is_used", False)\
            .gt("expires_at", datetime.now().isoformat())\
            .execute()
        
        if not pin_result.data:
            return jsonify({"success": False, "message": "Invalid or expired PIN"}), 404
        
        pin_data = pin_result.data[0]
        chat_id = pin_data['telegram_chat_id']
        
        # Mark PIN as used
        supabase.table("telegram_pins")\
            .update({"is_used": True, "used_at": datetime.now().isoformat()})\
            .eq("pin_code", pin)\
            .execute()
        
        # Link user
        supabase.table("telegram_users")\
            .update({"is_linked": True, "linked_at": datetime.now().isoformat()})\
            .eq("telegram_chat_id", chat_id)\
            .execute()
        
        logger.info(f"Telegram account linked: chat_id={chat_id}, pin={pin}")
        
        return jsonify({
            "success": True,
            "message": "Telegram account linked successfully"
        }), 200
        
    except Exception as e:
        logger.error(f"Error verifying PIN: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500


@app.route('/api/events/recent', methods=['GET'])
def get_recent_events():
    """Get recent events with optional filtering"""
    try:
        limit = request.args.get('limit', 50, type=int)
        event_type = request.args.get('type', None)
        
        query = supabase.table("events").select("*")
        
        if event_type:
            query = query.eq("event_type", event_type)
        
        result = query.order("timestamp", desc=True).limit(limit).execute()
        
        return jsonify({
            "events": result.data if result.data else [],
            "count": len(result.data) if result.data else 0
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching events: {e}")
        return jsonify({"error": str(e)}), 500


# =============================================
# RUN SERVER
# =============================================

if __name__ == '__main__':
    port = int(os.getenv('PORT', 7777))
    app.run(host='0.0.0.0', port=port, debug=True)
