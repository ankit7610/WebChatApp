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
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showMobileContacts, setShowMobileContacts] = useState(true);
  const messagesEndRef = useRef(null);
  const selectedContactRef = useRef(null);
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  // Keep ref in sync with state
  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

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

    // Clear unread count for this contact
    setUnreadCounts(prev => ({ ...prev, [selectedContact._id]: 0 }));

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

      // Update unread count if message is from someone other than selected contact
      const currentSelected = selectedContactRef.current;
      if (data.senderId !== currentUser?.id && data.senderId !== currentSelected?._id) {
        setUnreadCounts(prev => ({
          ...prev,
          [data.senderId]: (prev[data.senderId] || 0) + 1
        }));
      }
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
  }, [navigate, currentUser?.id]);

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
    
    // Add to local state immediately (Optimistic UI)
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

    // Send via WebSocket
    websocket.sendMessage(messageText, selectedContact._id, selectedContact.displayName);
    
    setInputText('');
  };

  const handleLogout = async () => {
    await logOut();
    websocket.disconnect();
    navigate('/login');
  };

  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
    setShowMobileContacts(false);
    // Clear unread count for this contact
    setUnreadCounts(prev => ({ ...prev, [contact._id]: 0 }));
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
      'from-violet-500 to-purple-600',
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-amber-600',
      'from-pink-500 to-rose-600',
      'from-cyan-500 to-blue-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Left Sidebar - Contact List */}
      <div className={`${showMobileContacts ? 'flex' : 'hidden'} md:flex w-full md:w-96 border-r border-slate-800/50 flex-col bg-slate-900/50 backdrop-blur-xl`}>
        {/* App Header */}
        <div className="p-5 border-b border-slate-800/50 bg-gradient-to-r from-slate-900 to-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">ChatApp</h1>
                <p className="text-xs text-slate-400">Secure messaging</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs text-slate-400">{connected ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* Current User */}
        <div className="p-4 border-b border-slate-800/50">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(currentUser?.displayName || 'U')} flex items-center justify-center shadow-lg`}>
              <span className="text-white font-bold text-sm">
                {getInitials(currentUser?.displayName || 'User')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{currentUser?.displayName}</p>
              <p className="text-xs text-slate-400 truncate">{currentUser?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-slate-700 transition-colors group"
              title="Logout"
            >
              <svg className="w-5 h-5 text-slate-400 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contact List */}
        <ContactList
          currentUser={currentUser}
          selectedContact={selectedContact}
          onSelectContact={handleSelectContact}
          unreadCounts={unreadCounts}
        />
      </div>

      {/* Right Panel - Chat Area */}
      <div className={`${!showMobileContacts ? 'flex' : 'hidden'} md:flex flex-1 flex-col`}>
        {!selectedContact ? (
          /* No contact selected - Welcome screen */
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-400 p-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-600/20 rounded-full blur-3xl" />
              <div className="relative w-32 h-32 bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-violet-500/25 transform rotate-3">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mt-8 mb-3">Welcome to ChatApp</h2>
            <p className="text-slate-400 text-center max-w-md mb-2">
              Start a conversation by selecting a contact from the list.
            </p>
            <p className="text-slate-500 text-sm">
              Your messages are private and secure.
            </p>
            <div className="flex gap-4 mt-8">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-slate-300">End-to-end encrypted</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50">
                <svg className="w-4 h-4 text-violet-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-slate-300">Secure connection</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                {/* Mobile back button */}
                <button
                  onClick={() => setShowMobileContacts(true)}
                  className="md:hidden p-2 -ml-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="relative">
                  <div className={`w-12 h-12 bg-gradient-to-br ${getAvatarColor(selectedContact.displayName)} rounded-full flex items-center justify-center shadow-lg`}>
                    <span className="text-white font-bold text-sm">
                      {getInitials(selectedContact.displayName)}
                    </span>
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${connected ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedContact.displayName}</h2>
                  <p className="text-sm text-slate-400">
                    {connected ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active now
                      </span>
                    ) : (
                      'Offline'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2.5 rounded-xl hover:bg-slate-800 transition-colors group">
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-violet-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </button>
                <button className="p-2.5 rounded-xl hover:bg-slate-800 transition-colors group">
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-violet-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button className="p-2.5 rounded-xl hover:bg-slate-800 transition-colors group">
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-violet-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-200 px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-amber-500/20">
                    <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-gradient-to-b from-slate-950 to-slate-900">
              {displayMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                    <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-slate-300 text-lg font-medium">No messages yet</p>
                  <p className="text-slate-500 text-sm mt-1">Send a message to start the conversation</p>
                </div>
              ) : (
                <>
                  {/* Date separator */}
                  <div className="flex items-center justify-center">
                    <div className="px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50">
                      <span className="text-xs text-slate-400">Today</span>
                    </div>
                  </div>
                  {displayMessages.map((msg) => (
                    <MessageBubble
                      key={msg.id || msg._id}
                      message={msg}
                      isOwn={msg.senderId === currentUser?.id}
                      currentUserName={currentUser?.displayName}
                    />
                  ))}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-slate-800/50 bg-slate-900/80 backdrop-blur-xl">
              <form onSubmit={handleSend} className="flex gap-3 items-end">
                {/* Attachment button */}
                <button
                  type="button"
                  className="p-3 rounded-xl hover:bg-slate-800 transition-colors group flex-shrink-0"
                >
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-violet-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                {/* Input field */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    disabled={!connected}
                    className="w-full px-5 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-2xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 disabled:bg-slate-800/30 disabled:cursor-not-allowed transition-all text-white placeholder-slate-500 pr-12"
                    maxLength={1000}
                  />
                  {/* Emoji button */}
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>

                {/* Send button */}
                <button
                  type="submit"
                  disabled={!connected || !inputText.trim()}
                  className="p-3.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transform hover:scale-105 disabled:transform-none disabled:shadow-none flex-shrink-0"
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
