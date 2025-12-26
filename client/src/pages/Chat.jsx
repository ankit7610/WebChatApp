import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MessageBubble from '../components/MessageBubble';
import ContactList from '../components/ContactList';
import websocket from '../services/websocket';
import { logOut, getToken, getCurrentUser } from '../services/authService';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessageTime, setLastMessageTime] = useState(Date.now());
  const [showMobileContacts, setShowMobileContacts] = useState(true);
  const messagesEndRef = useRef(null);
  const selectedContactRef = useRef(null);
  const currentUserRef = useRef(getCurrentUser()); // Use ref to hold currentUser
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Update currentUser ref on render, but don't trigger effects
  currentUserRef.current = getCurrentUser();
  const currentUser = currentUserRef.current;

  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Refresh unread counts from server
  const refreshUnreadCounts = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await axios.get(`${API_URL}/api/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const counts = {};
      response.data.forEach(conv => {
        if (conv.unreadCount > 0) {
          counts[conv.userId] = conv.unreadCount;
        }
      });
      setUnreadCounts(counts);
    } catch (err) {
      console.error('Failed to refresh unread counts:', err);
    }
  }, []);

  // Auto-refresh unread counts every 1 second
  useEffect(() => {
    refreshUnreadCounts();
    const interval = setInterval(refreshUnreadCounts, 1000);
    return () => clearInterval(interval);
  }, [refreshUnreadCounts]);

  useEffect(() => {
    if (!selectedContact) {
      setMessages([]);
      return;
    }

    setMessages([]);

    const token = getToken();
    if (!token) {
      navigate('/login');
      return;
    }

    setUnreadCounts(prev => ({ ...prev, [selectedContact._id]: 0 }));

    // Normalize contact id (prefer firebaseUid when present)
    const contactId = selectedContact.firebaseUid || selectedContact._id || selectedContact.id;

    // Use new API endpoint: /api/messages/:peerUid
    axios.get(`${API_URL}/api/messages/${contactId}`, {
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

  // WebSocket Connection Effect
  useEffect(() => {
    const token = getToken();

    if (!token) {
      navigate('/login');
      return;
    }

    console.log('Connecting to WebSocket...');
    websocket.connect(token);

    // Define handlers
    const handleOpen = () => {
      console.log('WebSocket open event received');
      setConnected(true);
      setError('');
      refreshUnreadCounts();
    };

    const handleConnected = (data) => {
      console.log('Connected as:', data.username);
    };

    const handleMessage = (data) => {
      console.log('📨 Received message:', data);

      if (data.type === 'contact_added') {
        console.log('New contact added, refreshing list...');
        setLastMessageTime(Date.now()); // Triggers ContactList refresh
        return;
      }

      setMessages((prev) => {
        // Check if we already have this message (by ID or clientId)
        // If we find a match that is NOT pending, it's a duplicate -> ignore
        const existingIndex = prev.findIndex(msg => msg.id === data.id || (data.clientId && msg.id === data.clientId));
        
        if (existingIndex !== -1) {
          // If the existing message is pending, we want to replace it (it's the confirmation)
          if (prev[existingIndex].pending) {
             const newMessages = [...prev];
             newMessages[existingIndex] = { ...data }; // Replace pending with confirmed
             return newMessages;
          }
          // Otherwise it's a true duplicate
          return prev;
        }

        // Fallback: match by text + receiverId (older heuristic) if clientId didn't match
        const pendingIndex = prev.findIndex(msg => 
          msg.pending && 
          msg.text === data.text && 
          (msg.receiverId === data.receiverId)
        );

        if (pendingIndex !== -1) {
          const newMessages = [...prev];
          newMessages[pendingIndex] = { ...data };
          return newMessages;
        }

        return [...prev, data];
      });

      setLastMessageTime(Date.now());

      const currentSelected = selectedContactRef.current;
      const currentUser = currentUserRef.current;
      
      // Use _id or firebaseUid or id, whichever is available
      const currentUserId = currentUser?.firebaseUid || currentUser?.id || currentUser?._id;

      if (data.senderId !== currentUserId && data.senderId !== currentSelected?._id) {
        setUnreadCounts(prev => ({
          ...prev,
          [data.senderId]: (prev[data.senderId] || 0) + 1
        }));
      }
    };

    const handleError = () => {
      console.log('WebSocket error event');
      setConnected(false);
      setError('Connection error. Reconnecting...');
    };

    const handleClose = () => {
      console.log('WebSocket close event');
      setConnected(false);
      setError('Disconnected. Reconnecting...');
    };

    const handleMaxReconnect = () => {
      setError('Failed to reconnect. Please refresh the page.');
    };

    // Attach listeners
    websocket.on('open', handleOpen);
    websocket.on('connected', handleConnected);
    websocket.on('message', handleMessage);
    websocket.on('error', handleError);
    websocket.on('close', handleClose);
    websocket.on('max_reconnect_reached', handleMaxReconnect);

    // Cleanup
    return () => {
      console.log('Chat useEffect cleanup - removing listeners and disconnecting');
      websocket.off('open', handleOpen);
      websocket.off('connected', handleConnected);
      websocket.off('message', handleMessage);
      websocket.off('error', handleError);
      websocket.off('close', handleClose);
      websocket.off('max_reconnect_reached', handleMaxReconnect);
      websocket.disconnect();
    };
  }, [navigate, refreshUnreadCounts]); // Removed currentUser from dependencies

  const displayMessages = messages.filter(msg => {
    if (!selectedContact) return false;
    // Use ref for current user to avoid dependency issues
    const user = currentUserRef.current;
    const userId = user?.firebaseUid || user?.id || user?._id;
    const contactId = selectedContact.firebaseUid || selectedContact._id || selectedContact.id;

    // Check both directions: Me -> Contact OR Contact -> Me
    return (msg.senderId === userId && msg.receiverId === contactId) ||
           (msg.senderId === contactId && msg.receiverId === userId);
  });

  const handleSend = (e) => {
    e.preventDefault();

    if (!inputText.trim() || !connected || !selectedContact) return;

    const messageText = inputText.trim();
    const user = currentUserRef.current;
    const userId = user?.id || user?._id || user?.firebaseUid;
    
    const contactId = selectedContact.firebaseUid || selectedContact._id || selectedContact.id;

    const tempMessage = {
      type: 'message',
      id: `temp-${Date.now()}`,
      senderId: userId,
      receiverId: contactId,
      text: messageText,
      timestamp: Date.now(),
      pending: true
    };
    
    setMessages(prev => [...prev, tempMessage]);
    websocket.sendMessage(messageText, contactId, tempMessage.id);
    
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

  const isDark = theme === 'dark';

  return (
    <div className={`flex h-screen ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
      {/* Left Sidebar - Contact List */}
      <div className={`${showMobileContacts ? 'flex' : 'hidden'} md:flex w-full md:w-96 border-r ${isDark ? 'border-slate-800' : 'border-gray-200'} flex-col ${isDark ? 'bg-slate-900' : 'bg-white'} shadow-xl`}>
        {/* App Header */}
        <div className={`p-5 border-b ${isDark ? 'border-slate-800 bg-slate-800' : 'border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>ChatApp</h1>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Private & Secure</p>
              </div>
            </div>
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl transition-all duration-300 ${
                isDark 
                  ? 'bg-slate-700 hover:bg-slate-600 text-yellow-400' 
                  : 'bg-white hover:bg-gray-100 text-gray-700 shadow-md'
              }`}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Current User */}
        <div className={`p-4 border-b ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
          <div className={`flex items-center gap-3 p-3 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-gradient-to-r from-violet-50 to-purple-50'}`}>
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(currentUser?.displayName || 'U')} flex items-center justify-center shadow-lg`}>
              <span className="text-white font-bold text-sm">
                {getInitials(currentUser?.displayName || 'User')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{currentUser?.displayName}</p>
              <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{currentUser?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className={`p-2 rounded-lg transition-colors group ${isDark ? 'hover:bg-slate-700' : 'hover:bg-white'}`}
              title="Logout"
            >
              <svg className={`w-5 h-5 transition-colors ${isDark ? 'text-slate-400 group-hover:text-red-400' : 'text-gray-500 group-hover:text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          lastMessageTime={lastMessageTime}
          theme={theme}
        />
      </div>

      {/* Right Panel - Chat Area */}
      <div className={`${!showMobileContacts ? 'flex' : 'hidden'} md:flex flex-1 flex-col`}>
        {!selectedContact ? (
          /* Welcome screen */
          <div className={`flex-1 flex flex-col items-center justify-center p-8 ${isDark ? 'bg-slate-950' : 'bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50'}`}>
            <div className="relative animate-bounce-in">
              <div className={`absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-600/20 rounded-full blur-3xl ${!isDark && 'opacity-50'}`} />
              <div className="relative w-32 h-32 bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-violet-500/30 transform rotate-3">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <h2 className={`text-4xl font-bold mt-8 mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Welcome to ChatApp</h2>
            <p className={`text-center max-w-md mb-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              Select a contact from the list to start chatting.
            </p>
            <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
              Your messages are private and secure.
            </p>
            <div className="flex gap-4 mt-8">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200 shadow-md'}`}>
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>End-to-end encrypted</span>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200 shadow-md'}`}>
                <svg className="w-4 h-4 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Secure connection</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className={`px-6 py-4 flex items-center justify-between border-b ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'} shadow-sm`}>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setShowMobileContacts(true);
                    setSelectedContact(null);
                  }}
                  className={`p-2 -ml-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}
                  title="Back to contacts"
                >
                  <svg className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="relative">
                  <div className={`w-12 h-12 bg-gradient-to-br ${getAvatarColor(selectedContact.displayName)} rounded-full flex items-center justify-center shadow-lg`}>
                    <span className="text-white font-bold text-sm">
                      {getInitials(selectedContact.displayName)}
                    </span>
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 ${isDark ? 'border-slate-900' : 'border-white'} ${connected ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedContact.displayName}</h2>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
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
                <button className={`p-2.5 rounded-xl transition-colors group ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
                  <svg className={`w-5 h-5 transition-colors ${isDark ? 'text-slate-400 group-hover:text-violet-400' : 'text-gray-500 group-hover:text-violet-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </button>
                <button className={`p-2.5 rounded-xl transition-colors group ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
                  <svg className={`w-5 h-5 transition-colors ${isDark ? 'text-slate-400 group-hover:text-violet-400' : 'text-gray-500 group-hover:text-violet-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className={`border-b px-6 py-3 ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-full ${isDark ? 'bg-amber-500/20' : 'bg-amber-200'}`}>
                    <svg className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto px-6 py-6 space-y-4 ${isDark ? 'bg-slate-950' : 'bg-gradient-to-b from-violet-50/30 to-purple-50/30'}`}>
              {displayMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <svg className={`w-10 h-10 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className={`text-lg font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>No messages yet</p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Send a message to start the conversation</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center">
                    <div className={`px-4 py-1.5 rounded-full ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
                      <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Today</span>
                    </div>
                  </div>
                  {displayMessages.map((msg) => (
                    <MessageBubble
                      key={msg.id || msg._id}
                      message={msg}
                      isOwn={msg.senderId === (currentUser?.id || currentUser?._id || currentUser?.firebaseUid)}
                      senderName={selectedContact.displayName}
                      theme={theme}
                    />
                  ))}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`px-6 py-4 border-t ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'} shadow-lg`}>
              <form onSubmit={handleSend} className="flex gap-3 items-end">
                <button
                  type="button"
                  className={`p-3 rounded-xl transition-colors group flex-shrink-0 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}
                >
                  <svg className={`w-5 h-5 transition-colors ${isDark ? 'text-slate-400 group-hover:text-violet-400' : 'text-gray-500 group-hover:text-violet-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    disabled={!connected}
                    className={`w-full px-5 py-3.5 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:outline-none disabled:cursor-not-allowed transition-all pr-12 ${
                      isDark 
                        ? 'bg-slate-800 border border-slate-700 text-white placeholder-slate-500 disabled:bg-slate-800/50' 
                        : 'bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-500 disabled:bg-gray-100/50'
                    }`}
                    maxLength={1000}
                  />
                  <button
                    type="button"
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
                  >
                    <svg className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!connected || !inputText.trim()}
                  className="p-3.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transform hover:scale-105 disabled:transform-none disabled:shadow-none flex-shrink-0"
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
