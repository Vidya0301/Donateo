import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiX, FiSend, FiMapPin, FiCalendar, FiClock, FiAlertTriangle } from 'react-icons/fi';
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
  const [reportMode, setReportMode] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const messagesEndRef = useRef(null);
  const previousMessageCount = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChat = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      
      const response = await chatAPI.getChatById(chatId);
      const newChat = response.data;
      
      // Only update if there are new messages
      if (!chat || newChat.messages.length !== previousMessageCount.current) {
        setChat(newChat);
        previousMessageCount.current = newChat.messages.length;
        
        // Mark as read only on initial load or new messages
        if (isInitial || newChat.messages.length > previousMessageCount.current) {
          await chatAPI.markAsRead(chatId).catch(() => {});
        }
      }
    } catch (error) {
      if (isInitial) {
        toast.error('Failed to load chat');
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [chatId, chat]);

  useEffect(() => {
    fetchChat(true);
  }, [chatId]);

  useEffect(() => {
    // Poll for new messages every 5 seconds
    const interval = setInterval(() => {
      fetchChat(false);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchChat]);

  useEffect(() => {
    // Only scroll if there are new messages
    if (chat && chat.messages.length > previousMessageCount.current) {
      scrollToBottom();
    }
  }, [chat]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const response = await chatAPI.sendMessage(chatId, message);
      setChat(response.data);
      setMessage('');
      previousMessageCount.current = response.data.messages.length;
      scrollToBottom();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    }
  };

  const handleQuickReply = async (quickReply) => {
    try {
      const response = await chatAPI.sendQuickReply(chatId, quickReply);
      setChat(response.data);
      previousMessageCount.current = response.data.messages.length;
      scrollToBottom();
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
      previousMessageCount.current = response.data.messages.length;
      toast.success('Pickup details sent!');
      scrollToBottom();
    } catch (error) {
      toast.error('Failed to send pickup details');
    }
  };

  const handleEndChat = async () => {
    if (window.confirm('Are you sure you want to end this chat? This action cannot be undone.')) {
      try {
        const response = await chatAPI.endChat(chatId);
        setChat(response.data);
        previousMessageCount.current = response.data.messages.length;
        toast.success('Chat ended successfully');
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to end chat');
      }
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast.error('Please provide a reason for reporting');
      return;
    }

    try {
      await chatAPI.reportChat(chatId, reportReason);
      setReportMode(false);
      setReportReason('');
      toast.success('Chat reported. Admin will review.');
    } catch (error) {
      toast.error('Failed to report chat');
    }
  };

  const isOwnMessage = (msg) => {
    if (!msg.sender || !user) return false;
    return msg.sender._id === user._id || msg.sender === user._id;
  };

  const isDonor = chat?.donor?._id === user?._id;
  const isChatActive = chat?.status === 'active';

  if (loading) {
    return (
      <div className="chat-modal-overlay">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="chat-header">
          <div>
            <h3>💬 {itemName}</h3>
            <p className="chat-subtitle">
              {chat?.donor?.name} ↔ {chat?.receiver?.name}
            </p>
          </div>
          <div className="chat-header-actions">
            {isChatActive && (
              <>
                {isDonor && (
                  <button 
                    onClick={handleEndChat} 
                    className="btn-header btn-end"
                    title="End this chat"
                  >
                    ✓ End Chat
                  </button>
                )}
                <button 
                  onClick={() => setReportMode(!reportMode)} 
                  className={`btn-header ${reportMode ? 'btn-report-active' : 'btn-report'}`}
                  title="Report abuse"
                >
                  {reportMode ? '🚩' : '⚠️'}
                </button>
              </>
            )}
            <button onClick={onClose} className="close-btn" title="Close chat">
              <FiX />
            </button>
          </div>
        </div>

        {/* Safety Banner */}
        <div className="safety-banner">
          <p>
            🛡️ <strong>Safe Chat:</strong> Free donations only • No contact details • No payment • Be respectful
          </p>
        </div>

        {/* Report Form */}
        {reportMode && (
          <div className="report-form">
            <h4><FiAlertTriangle /> Report this chat</h4>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Describe the issue (abuse, scam, inappropriate content, etc.)"
              className="form-control"
              rows="3"
            />
            <div className="report-actions">
              <button onClick={() => setReportMode(false)} className="btn btn-outline btn-sm">
                Cancel
              </button>
              <button onClick={handleReport} className="btn btn-primary btn-sm">
                Submit Report
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages">
          {chat?.messages.map((msg, index) => {
            const isDonorMessage = msg.sender?._id === chat.donor._id || msg.sender === chat.donor._id;
            const isReceiverMessage = msg.sender?._id === chat.receiver._id || msg.sender === chat.receiver._id;
            
            return (
              <div
                key={`${msg.timestamp}-${index}`}
                className={`message ${
                  msg.isSystem
                    ? `system-message ${isOwnMessage(msg) ? 'own-message' : ''}`
                    : msg.isBot
                    ? 'bot-message'
                    : isOwnMessage(msg)
                    ? 'own-message'
                    : 'other-message'
                }`}
              >
                <div className="message-header">
                <strong>
                  {msg.isBot && !msg.isSystem
                    ? '🤖 Assistant'
                    : msg.isSystem
                    ? (isOwnMessage(msg) ? 'You' : msg.sender?.name || 'User')
                    : isOwnMessage(msg)
                    ? 'You'
                    : msg.sender?.name || 'User'}
                </strong>
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <p className="message-content">{msg.content}</p>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {!isChatActive ? (
          <div className="chat-ended">
            <p>💚 This chat has ended. Thank you for using Donateo!</p>
          </div>
        ) : showPickupForm ? (
          <form onSubmit={handleSubmitPickupDetails} className="pickup-form">
            <h4>📍 Set Pickup Details</h4>
            <div className="form-group">
              <label><FiMapPin /> Location (General Area)</label>
              <input
                type="text"
                value={pickupForm.location}
                onChange={(e) => setPickupForm({ ...pickupForm, location: e.target.value })}
                placeholder="E.g., Anna Nagar, Chennai"
                required
                className="form-control"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label><FiCalendar /> Date</label>
                <input
                  type="date"
                  value={pickupForm.date}
                  onChange={(e) => setPickupForm({ ...pickupForm, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
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
            {/* Quick Replies */}
            <div className="quick-replies">
              <button onClick={() => handleQuickReply('ready')} className="quick-reply-btn" type="button">
                ✅ Ready
              </button>
              <button onClick={() => handleQuickReply('confirm_pickup')} className="quick-reply-btn" type="button">
                👍 Confirm
              </button>
              {!isDonor && (
                <button onClick={() => handleQuickReply('on_my_way')} className="quick-reply-btn" type="button">
                  🚗 On Way
                </button>
              )}
              <button onClick={() => handleQuickReply('thank_you')} className="quick-reply-btn" type="button">
                🙏 Thanks
              </button>
              <button onClick={() => handleQuickReply('reschedule')} className="quick-reply-btn" type="button">
                🔄 Reschedule
              </button>
            </div>

            {/* Pickup Details Button */}
            <div className="chat-actions">
              <button onClick={() => setShowPickupForm(true)} className="btn btn-secondary btn-sm" type="button">
                📍 Set Pickup Details
              </button>
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="chat-input-form">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="chat-input"
                maxLength="500"
              />
              <button type="submit" className="send-btn" disabled={!message.trim()}>
                <FiSend />
              </button>
            </form>
            <div className="char-count">{message.length}/500</div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatModal;