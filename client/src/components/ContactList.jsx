import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ContactList = ({ currentUser, selectedContact, onSelectContact, unreadCounts = {}, lastMessageTime, theme }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add Contact Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  const isDark = theme === 'dark';

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [lastMessageTime]); // Re-fetch when a new message arrives

  // Re-fetch when unreadCounts change (to update order if needed)
  useEffect(() => {
    if (conversations.length > 0) {
      // Optional: re-sort locally if needed, but fetching is safer to get latest messages
      // fetchConversations(); 
    }
  }, [unreadCounts]);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('chatToken');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const res = await axios.get(`${API_URL}/api/messages/conversations`, config);
      setConversations(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      setError('Failed to load contacts');
      setLoading(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    setAdding(true);
    setAddError('');

    try {
      const token = localStorage.getItem('chatToken');
      await axios.post(`${API_URL}/api/messages/contacts`, { email: addEmail }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await fetchConversations();
      setShowAddModal(false);
      setAddEmail('');
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to add contact');
    } finally {
      setAdding(false);
    }
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

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 6) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'now';
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter(c =>
    c.user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort: Unread > Last Message Time > Name
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    // Use prop unreadCounts if available (real-time), fallback to API data
    const unreadA = unreadCounts[a.user._id] || a.unreadCount || 0;
    const unreadB = unreadCounts[b.user._id] || b.unreadCount || 0;

    if (unreadA !== unreadB) return unreadB - unreadA;

    const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;

    if (timeA !== timeB) return timeB - timeA;

    return a.user.displayName.localeCompare(b.user.displayName);
  });

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Header with Add Button */}
      <div className="p-4 flex items-center gap-2">
        <div className="relative flex-1">
          <svg className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none text-sm transition-all ${
              isDark 
                ? 'bg-slate-800 border border-slate-700 text-white placeholder-slate-500' 
                : 'bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="p-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all hover:scale-105"
          title="Add New Contact"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Section title */}
      <div className="px-4 pb-2">
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
          Chats ({sortedConversations.length})
        </h3>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-3">
        {sortedConversations.length === 0 ? (
          <div className="p-8 text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
              <svg className={`w-8 h-8 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className={`font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>No chats yet</p>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
              Click the + button to start a new chat
            </p>
          </div>
        ) : (
          <div className="space-y-1 pb-4">
            {sortedConversations.map((conv) => {
              const user = conv.user;
              const isSelected = selectedContact?._id === user._id;
              const unreadCount = unreadCounts[user._id] || conv.unreadCount || 0;
              const hasUnread = unreadCount > 0;

              return (
                <button
                  key={user._id}
                  onClick={() => onSelectContact(user)}
                  className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all duration-200 group ${
                    isSelected 
                      ? isDark 
                        ? 'bg-violet-500/20 border border-violet-500/30' 
                        : 'bg-violet-50 border border-violet-200'
                      : isDark
                        ? 'hover:bg-slate-800 border border-transparent'
                        : 'hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(user.displayName)} flex items-center justify-center shadow-lg ${
                        isSelected 
                          ? isDark 
                            ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-slate-900' 
                            : 'ring-2 ring-violet-400 ring-offset-2 ring-offset-white'
                          : ''
                      }`}
                    >
                      <span className="text-white font-bold text-sm">
                        {getInitials(user.displayName)}
                      </span>
                    </div>
                    {/* Online indicator (mock) */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 ${isDark ? 'border-slate-900' : 'border-white'}`} />
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={`font-semibold truncate ${
                        isSelected 
                          ? isDark ? 'text-violet-200' : 'text-violet-700'
                          : isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {user.displayName}
                      </h3>
                      {conv.lastMessage && (
                        <span className={`text-xs ml-2 flex-shrink-0 ${
                          hasUnread 
                            ? 'text-violet-500 font-medium' 
                            : isDark ? 'text-slate-500' : 'text-gray-500'
                        }`}>
                          {formatTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate pr-2 ${
                        hasUnread
                          ? isDark ? 'text-white font-medium' : 'text-gray-900 font-medium'
                          : isDark ? 'text-slate-400' : 'text-gray-500'
                      }`}>
                        {conv.lastMessage ? conv.lastMessage.text : 'Start a conversation'}
                      </p>
                      
                      {hasUnread && (
                        <span className="flex-shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-violet-500/30 animate-bounce-in">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl transform transition-all scale-100 ${
            isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'
          }`}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Start New Chat
            </h3>
            
            <form onSubmit={handleAddContact}>
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                  User Email
                </label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="Enter email address"
                  className={`w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-800 border border-slate-700 text-white placeholder-slate-500' 
                      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500'
                  }`}
                  required
                />
              </div>

              {addError && (
                <p className="text-red-500 text-sm mb-4 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  {addError}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setAddError('');
                    setAddEmail('');
                  }}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium hover:shadow-lg hover:shadow-violet-500/30 transition-all disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Start Chat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactList;
