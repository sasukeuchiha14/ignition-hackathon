import React, { useState } from 'react';
import axios from 'axios';
import './TelegramLink.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:7777';

const TelegramLink = ({ isOpen, onClose }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (pin.length !== 6) {
      setMessage({ type: 'error', text: 'PIN must be 6 digits' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(`${API_URL}/api/telegram/verify-pin`, { pin });
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Successfully linked to Telegram!' });
        setTimeout(() => {
          setPin('');
          onClose();
        }, 2000);
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Invalid or expired PIN' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to verify PIN. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(value);
    setMessage({ type: '', text: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="modal-header">
          <span className="modal-icon">📱</span>
          <h2 className="modal-title">Link Telegram Account</h2>
        </div>

        <div className="modal-body">
          <div className="instructions">
            <h3>How to link your Telegram:</h3>
            <ol>
              <li>Open Telegram app on your phone</li>
              <li>Search for <strong>@YourBotUsername</strong> (your bot name)</li>
              <li>Start a chat and send <code>/register</code> command</li>
              <li>Bot will reply with a 6-digit PIN</li>
              <li>Enter the PIN below within 10 minutes</li>
            </ol>
            <div className="info-box">
              <strong>⏰ Note:</strong> The PIN expires after 10 minutes for security.
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="pin" className="form-label">
                Enter 6-Digit PIN
              </label>
              <input
                type="text"
                id="pin"
                className="form-input"
                placeholder="000000"
                value={pin}
                onChange={handlePinChange}
                maxLength={6}
                pattern="[0-9]{6}"
                required
                autoFocus
              />
            </div>

            {message.text && (
              <div className={`message ${message.type}`}>
                {message.type === 'success' ? '✅' : '❌'} {message.text}
              </div>
            )}

            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading || pin.length !== 6}
            >
              {loading ? 'Verifying...' : 'Link Account'}
            </button>
          </form>

          <div className="help-text">
            <p>
              💡 <strong>Tip:</strong> Make sure you've started a chat with the bot before 
              using the /register command.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramLink;
