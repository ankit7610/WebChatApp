import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ContactList = ({ currentUser, selectedContact, onSelectContact, unreadCounts = {} }) => {
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsersAndConversations();
  }, []);

  const fetchUsersAndConversations = async () => {
    try {
      const token = localStorage.getItem('chatToken');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // Fetch all users and conversations in parallel
      const [usersRes, conversationsRes] = await Promise.all([
        axios.get(`${API_URL}/api/messages/users`, config),
        axios.get(`${API_URL}/api/messages/conversations`, config)
      ]);

      setUsers(usersRes.data);
      setConversations(conversationsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch users/conversations:', error);
      setError('Failed to load contacts');
      setLoading(false);
    }
  };

  const getConversationInfo = (userId) => {
    const conv = conversations.find(c => c.userId === userId);
    return {
      unreadCount: unreadCounts[userId] || conv?.unreadCount || 0,
      lastMessage: conv?.lastMessage?.text,
      lastMessageTime: conv?.lastMessage?.createdAt
    };
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

  const filteredUsers = users.filter(user =>
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900/50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading contacts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/50 text-red-400 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="font-medium mb-2">{error}</p>
        <button 
          onClick={fetchUsersAndConversations}
          className="mt-4 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-white text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-white placeholder-slate-500 transition-all text-sm"
          />
        </div>
      </div>

      {/* Section title */}
      <div className="px-4 pb-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          All Contacts ({filteredUsers.length})
        </h3>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto px-3">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">No contacts found</p>
            <p className="text-slate-500 text-sm mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-1 pb-4">
            {filteredUsers.map((user) => {
              const convInfo = getConversationInfo(user._id);
              const isSelected = selectedContact?._id === user._id;
              const hasUnread = convInfo.unreadCount > 0;

              return (
                <button
                  key={user._id}
                  onClick={() => onSelectContact(user)}
                  className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all duration-200 group ${
                    isSelected 
                      ? 'bg-violet-500/20 border border-violet-500/30' 
                      : 'hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(user.displayName)} flex items-center justify-center shadow-lg ${
                        isSelected ? 'ring-2 ring-violet-400/50 ring-offset-2 ring-offset-slate-900' : ''
                      }`}
                    >
                      <span className="text-white font-bold text-sm">
                        {getInitials(user.displayName)}
                      </span>
                    </div>
                    {/* Online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={`font-semibold truncate ${isSelected ? 'text-violet-200' : 'text-white'}`}>
                        {user.displayName}
                      </h3>
                      {convInfo.lastMessageTime && (
                        <span className={`text-xs ml-2 flex-shrink-0 ${hasUnread ? 'text-violet-400 font-medium' : 'text-slate-500'}`}>
                          {formatTime(convInfo.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${hasUnread ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                        {convInfo.lastMessage || 'No messages yet'}
                      </p>
                      {hasUnread && (
                        <span className="ml-2 flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg shadow-violet-500/25">
                          {convInfo.unreadCount > 99 ? '99+' : convInfo.unreadCount}
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
    </div>
  );
};

export default ContactList;
