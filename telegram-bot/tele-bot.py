"""
Telegram Bot for Ignition Hackathon - Rider Telemetry System
Features:
- User registration with PIN linking
- Real-time accident/fall alerts
- Harsh brake/acceleration notifications
- System status monitoring
"""

from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from os import getenv
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime, timedelta
import logging
import random
import string

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Configuration
BOT_TOKEN = getenv("TELEGRAM_BOT_TOKEN")
SUPABASE_URL = getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = getenv("SUPABASE_SERVICE_ROLE_KEY")

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# =============================================
# HELPER FUNCTIONS
# =============================================

def generate_pin():
    """Generate 6-digit PIN code"""
    return ''.join(random.choices(string.digits, k=6))


async def cleanup_expired_pins():
    """Remove expired PINs from database"""
    try:
        supabase.table("telegram_pins")\
            .delete()\
            .lt("expires_at", datetime.now().isoformat())\
            .execute()
    except Exception as e:
        logger.error(f"Error cleaning up PINs: {e}")


# =============================================
# COMMAND HANDLERS
# =============================================

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command"""
    welcome_message = """
🏍️ *Welcome to Rider Telemetry Bot!*

This bot sends you real-time alerts about:
• 🚨 Accident/fall detection
• ⚠️ Harsh braking
• ⚡ Harsh acceleration
• 📊 Ride statistics

*Available Commands:*
/register - Link your account
/status - Check system status
/unlink - Unlink your account
/help - Show this message

To get started, use /register
"""
    
    await update.message.reply_text(
        welcome_message,
        parse_mode='Markdown'
    )


async def register(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /register command - Generate PIN for linking"""
    try:
        chat_id = update.effective_chat.id
        user = update.effective_user
        
        # Check if already linked
        existing_user = supabase.table("telegram_users")\
            .select("*")\
            .eq("telegram_chat_id", chat_id)\
            .execute()
        
        if existing_user.data and existing_user.data[0].get('is_linked'):
            await update.message.reply_text(
                "✅ You are already registered!\n\n"
                "Use /unlink if you want to unregister."
            )
            return
        
        # Clean up old expired PINs
        await cleanup_expired_pins()
        
        # Generate new PIN
        pin = generate_pin()
        expires_at = datetime.now() + timedelta(minutes=10)
        
        # Store PIN in database
        pin_data = {
            "pin_code": pin,
            "telegram_chat_id": chat_id,
            "expires_at": expires_at.isoformat()
        }
        supabase.table("telegram_pins").insert(pin_data).execute()
        
        # Create or update user record
        user_data = {
            "telegram_chat_id": chat_id,
            "telegram_username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name
        }
        
        if existing_user.data:
            supabase.table("telegram_users")\
                .update(user_data)\
                .eq("telegram_chat_id", chat_id)\
                .execute()
        else:
            supabase.table("telegram_users").insert(user_data).execute()
        
        message = f"""
🔐 *Registration PIN Generated*

Your PIN code is: `{pin}`

⏰ Valid for: 10 minutes
📱 Enter this PIN in the dashboard to link your account

The PIN will expire at: {expires_at.strftime('%H:%M:%S')}
"""
        
        await update.message.reply_text(message, parse_mode='Markdown')
        logger.info(f"PIN generated for chat_id {chat_id}: {pin}")
        
    except Exception as e:
        logger.error(f"Error in register command: {e}")
        await update.message.reply_text(
            "❌ Error generating PIN. Please try again later."
        )


async def status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /status command - Show system status"""
    try:
        chat_id = update.effective_chat.id
        
        # Check if user is linked
        user_result = supabase.table("telegram_users")\
            .select("*")\
            .eq("telegram_chat_id", chat_id)\
            .execute()
        
        if not user_result.data or not user_result.data[0].get('is_linked'):
            await update.message.reply_text(
                "⚠️ You are not registered yet!\n\n"
                "Use /register to get started."
            )
            return
        
        # Get latest sensor data
        chest_data = supabase.table("esp32_chest_data")\
            .select("*")\
            .order("timestamp", desc=True)\
            .limit(1)\
            .execute()
        
        leg_data = supabase.table("esp32_leg_data")\
            .select("*")\
            .order("timestamp", desc=True)\
            .limit(1)\
            .execute()
        
        # Get recent events count
        events = supabase.table("events")\
            .select("event_type", count="exact")\
            .execute()
        
        # Build status message
        status_msg = "📊 *System Status*\n\n"
        
        if chest_data.data:
            chest = chest_data.data[0]
            status_msg += f"📍 GPS: {chest.get('latitude', 'N/A')}, {chest.get('longitude', 'N/A')}\n"
            status_msg += f"🏍️ Speed: {chest.get('speed', 0):.1f} km/h\n"
            status_msg += f"🛰️ Satellites: {chest.get('satellites', 0)}\n"
            status_msg += f"🎯 Accuracy: {chest.get('accuracy', 0):.1f}m\n"
            
            last_update = datetime.fromisoformat(chest['timestamp'].replace('Z', '+00:00'))
            time_diff = (datetime.now(last_update.tzinfo) - last_update).seconds
            status_msg += f"⏰ Last update: {time_diff}s ago\n"
        else:
            status_msg += "⚠️ No GPS data available\n"
        
        status_msg += f"\n📊 Total events: {len(events.data) if events.data else 0}\n"
        status_msg += f"🔔 Notifications: {'ON' if user_result.data[0].get('notifications_enabled') else 'OFF'}\n"
        
        await update.message.reply_text(status_msg, parse_mode='Markdown')
        
    except Exception as e:
        logger.error(f"Error in status command: {e}")
        await update.message.reply_text(
            "❌ Error fetching status. Please try again."
        )


async def unlink(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /unlink command - Unlink account"""
    try:
        chat_id = update.effective_chat.id
        
        result = supabase.table("telegram_users")\
            .update({"is_linked": False, "notifications_enabled": False})\
            .eq("telegram_chat_id", chat_id)\
            .execute()
        
        if result.data:
            await update.message.reply_text(
                "✅ Account unlinked successfully!\n\n"
                "You will no longer receive notifications.\n"
                "Use /register to link again."
            )
        else:
            await update.message.reply_text(
                "⚠️ You are not registered."
            )
        
    except Exception as e:
        logger.error(f"Error in unlink command: {e}")
        await update.message.reply_text(
            "❌ Error unlinking account. Please try again."
        )


async def toggle_notifications(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /notifications command - Toggle notifications on/off"""
    try:
        chat_id = update.effective_chat.id
        
        # Get current status
        user_result = supabase.table("telegram_users")\
            .select("notifications_enabled")\
            .eq("telegram_chat_id", chat_id)\
            .eq("is_linked", True)\
            .execute()
        
        if not user_result.data:
            await update.message.reply_text(
                "⚠️ You are not registered. Use /register first."
            )
            return
        
        # Toggle status
        current_status = user_result.data[0].get('notifications_enabled', True)
        new_status = not current_status
        
        supabase.table("telegram_users")\
            .update({"notifications_enabled": new_status})\
            .eq("telegram_chat_id", chat_id)\
            .execute()
        
        status_text = "enabled ✅" if new_status else "disabled ❌"
        await update.message.reply_text(
            f"🔔 Notifications {status_text}"
        )
        
    except Exception as e:
        logger.error(f"Error toggling notifications: {e}")
        await update.message.reply_text(
            "❌ Error changing notification settings."
        )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command"""
    help_text = """
🏍️ *Rider Telemetry Bot - Help*

*Available Commands:*

/start - Welcome message
/register - Generate PIN to link your account
/status - Check system status and latest data
/notifications - Toggle alerts on/off
/unlink - Unlink your account
/help - Show this help message

*What alerts do I get?*
• 🚨 Accident/fall detection (CRITICAL)
• ⚠️ Harsh braking events
• ⚡ Harsh acceleration events
• 📍 Location included in all alerts

*How to link account:*
1. Use /register here
2. Copy the 6-digit PIN
3. Go to the dashboard
4. Enter PIN in "Link Telegram" section
5. Done! You'll receive alerts

*Need support?*
Check the dashboard or contact the admin.
"""
    
    await update.message.reply_text(help_text, parse_mode='Markdown')


# =============================================
# MAIN
# =============================================

def main():
    """Start the bot"""
    if not BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN not found in environment variables")
        return
    
    # Build application
    application = ApplicationBuilder().token(BOT_TOKEN).build()
    
    # Add command handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("register", register))
    application.add_handler(CommandHandler("status", status))
    application.add_handler(CommandHandler("unlink", unlink))
    application.add_handler(CommandHandler("notifications", toggle_notifications))
    application.add_handler(CommandHandler("help", help_command))
    
    # Start bot
    logger.info("🤖 Rider Telemetry Bot is starting...")
    application.run_polling()


if __name__ == '__main__':
    main()
