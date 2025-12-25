import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MessageBubble from '../components/MessageBubble';
import ContactList from '../components/ContactList';
import websocket from '../services/websocket';
import { logOut, getToken, getCurrentUser } from '../services/authService';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation messages when contact is selected
  useEffect(() => {
    if (!selectedContact) {
      setMessages([]);
      return;
    }

    // Clear previous chat thread before loading new ones
    setMessages([]);

    const token = getToken();
    if (!token) {
      navigate('/login');
      return;
    }

    // Fetch conversation history
    axios.get(`${API_URL}/api/messages/conversation/${selectedContact._id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        setMessages(res.data);
      })
      .catch((err) => {
        console.error('Failed to load conversation:', err);
        setError('Failed to load conversation history');
      });
  }, [selectedContact, navigate]);

  // Connect to WebSocket
  useEffect(() => {
    const token = getToken();

    if (!token) {
      navigate('/login');
      return;
    }

    // Connect to WebSocket
    websocket.connect(token);

    // WebSocket event handlers
    websocket.on('open', () => {
      setConnected(true);
      setError('');
    });

    websocket.on('connected', (data) => {
      console.log('Connected as:', data.username);
    });

    // Note: We use a ref or functional update to access latest state inside event handler
    // without adding dependencies that would cause reconnection
    websocket.on('message', (data) => {
      setMessages((prev) => {
        // Prevent duplicates
        const isDuplicate = prev.some(msg => msg.id === data.id);
        if (isDuplicate) return prev;

        // If we have a pending message with same text and recipient, replace it
        const pendingIndex = prev.findIndex(msg => 
          msg.pending && 
          msg.text === data.text && 
          msg.recipientId === data.recipientId
        );

        if (pendingIndex !== -1) {
          const newMessages = [...prev];
          newMessages[pendingIndex] = data;
          return newMessages;
        }

        return [...prev, data];
      });
    });

    websocket.on('error', () => {
      setConnected(false);
      setError('Connection error. Reconnecting...');
    });

    websocket.on('close', () => {
      setConnected(false);
      setError('Disconnected. Reconnecting...');
    });

    websocket.on('max_reconnect_reached', () => {
      setError('Failed to reconnect. Please refresh the page.');
    });

    // Cleanup on unmount
    return () => {
      websocket.disconnect();
    };
  }, [navigate]); // Removed selectedContact and currentUser to prevent reconnection loops

  // Filter messages for display based on selected contact
  const displayMessages = messages.filter(msg => {
    if (!selectedContact) return false;
    return (msg.senderId === currentUser?.id && msg.recipientId === selectedContact._id) ||
           (msg.senderId === selectedContact._id && msg.recipientId === currentUser?.id);
  });

  const handleSend = (e) => {
    e.preventDefault();

    if (!inputText.trim() || !connected || !selectedContact) return;

    const messageText = inputText.trim();
    
    // 1. Add to local state immediately (Optimistic UI)
    const tempMessage = {
      type: 'message',
      id: `temp-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      recipientId: selectedContact._id,
      recipientName: selectedContact.displayName,
      text: messageText,
      createdAt: new Date().toISOString(),
      pending: true
    };
    
    setMessages(prev => [...prev, tempMessage]);

    // 2. Send via WebSocket
    websocket.sendMessage(messageText, selectedContact._id, selectedContact.displayName);
    
    setInputText('');
  };

  const handleLogout = async () => {
    await logOut();
    websocket.disconnect();
    navigate('/login');
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name) => {
    const colors = [
      'from-purple-500 to-pink-500',
      'from-blue-500 to-cyan-500',
      'from-green-500 to-teal-500',
      'from-orange-500 to-red-500',
      'from-indigo-500 to-purple-500',
      'from-pink-500 to-rose-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Left Sidebar - Contact List */}
      <div className="w-80 border-r border-gray-800 flex flex-col">
        <ContactList
          currentUser={currentUser}
          selectedContact={selectedContact}
          onSelectContact={setSelectedContact}
        />
      </div>

      {/* Right Panel - Chat Area */}
      <div className="flex-1 flex flex-col">
        {!selectedContact ? (
          /* No contact selected - Welcome screen */
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 text-gray-400">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-900 to-indigo-900 rounded-full flex items-center justify-center mb-6 shadow-2xl">
              <svg className="w-16 h-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">ChatApp</h2>
            <p className="text-gray-500">Select a contact to start chatting</p>
            <button
              onClick={handleLogout}
              className="mt-8 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${getAvatarColor(
                    selectedContact.displayName
                  )} rounded-full flex items-center justify-center shadow-lg`}
                >
                  <span className="text-white font-bold text-sm">
                    {getInitials(selectedContact.displayName)}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedContact.displayName}</h2>
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        connected ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <span className="text-gray-400">
                      {connected ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
              >
                Logout
              </button>
            </div>

            {/* Error banner */}
            {error && (
              <div className="bg-yellow-900 border-l-4 border-yellow-500 text-yellow-200 px-6 py-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-gray-900">
              {displayMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-900 to-indigo-900 rounded-full flex items-center justify-center mb-4 shadow-lg">
                    <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-lg font-medium">No messages yet</p>
                  <p className="text-gray-500 text-sm mt-1">Start the conversation!</p>
                </div>
              ) : (
                displayMessages.map((msg) => (
                  <MessageBubble
                    key={msg.id || msg._id}
                    message={msg}
                    isOwn={msg.senderId === currentUser?.uid}
                    currentUserName={currentUser?.displayName}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
              <form onSubmit={handleSend} className="flex gap-3 items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message..."
                  disabled={!connected}
                  className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all text-white placeholder-gray-400"
                  maxLength={1000}
                />
                <button
                  type="submit"
                  disabled={!connected || !inputText.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
