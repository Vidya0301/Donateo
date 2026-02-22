import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiX, FiSend, FiMapPin, FiCalendar, FiClock } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import './ChatModal.css';

const ChatModal = ({ chatId, onClose, itemName }) => {
  const { user } = useAuth();
  const [chat, setChat] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [pickupForm, setPickupForm] = useState({
    location: '',
    date: '',
    time: ''
  });
  const [showPickupForm, setShowPickupForm] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchChat = useCallback(async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getChatById(chatId);
      setChat(response.data);
    } catch (error) {
      toast.error('Failed to load chat');
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    fetchChat();
  }, [fetchChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      const response = await chatAPI.sendMessage(chatId, message);
      setChat(response.data);
      setMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleSubmitPickupDetails = async (e) => {
    e.preventDefault();
    try {
      const response = await chatAPI.updatePickupDetails(chatId, pickupForm);
      setChat(response.data);
      setShowPickupForm(false);
      setPickupForm({ location: '', date: '', time: '' });
      toast.success('Pickup details sent!');
    } catch (error) {
      toast.error('Failed to send pickup details');
    }
  };

  // Determine if a message was sent by the current logged-in user
  const isOwnMessage = (msg) => {
    if (!msg.sender || !user) return false;
    return msg.sender._id === user._id || msg.sender === user._id;
  };

  if (loading) return <div className="spinner"></div>;

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-header">
          <div>
            <h3>Chat: {itemName}</h3>
            <p className="chat-subtitle">
              {chat?.donor?.name} ↔ {chat?.receiver?.name}
            </p>
          </div>
          <button onClick={onClose} className="close-btn">
            <FiX />
          </button>
        </div>

        <div className="chat-messages">
          {chat?.messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${
                msg.isBot
                  ? 'bot-message'
                  : isOwnMessage(msg)
                  ? 'own-message'
                  : 'other-message'
              }`}
            >
              <div className="message-header">
                <strong>
                  {msg.isBot
                    ? '🤖 Donateo Assistant'
                    : isOwnMessage(msg)
                    ? 'You'
                    : msg.sender?.name || 'User'}
                </strong>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="message-content">{msg.content}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {showPickupForm ? (
          <form onSubmit={handleSubmitPickupDetails} className="pickup-form">
            <h4>📍 Set Pickup Details</h4>
            <div className="form-row">
              <div className="form-group">
                <label><FiMapPin /> Location</label>
                <input
                  type="text"
                  value={pickupForm.location}
                  onChange={(e) => setPickupForm({ ...pickupForm, location: e.target.value })}
                  placeholder="123 Main St, City"
                  required
                  className="form-control"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label><FiCalendar /> Date</label>
                <input
                  type="date"
                  value={pickupForm.date}
                  onChange={(e) => setPickupForm({ ...pickupForm, date: e.target.value })}
                  required
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label><FiClock /> Time</label>
                <input
                  type="time"
                  value={pickupForm.time}
                  onChange={(e) => setPickupForm({ ...pickupForm, time: e.target.value })}
                  required
                  className="form-control"
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setShowPickupForm(false)} className="btn btn-outline">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Send Details
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="chat-actions">
              <button onClick={() => setShowPickupForm(true)} className="btn btn-secondary btn-sm">
                📍 Set Pickup Details
              </button>
            </div>
            <form onSubmit={handleSendMessage} className="chat-input-form">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="chat-input"
              />
              <button type="submit" className="send-btn">
                <FiSend />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatModal;