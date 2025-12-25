import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ContactList = ({ currentUser, selectedContact, onSelectContact }) => {
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      unreadCount: conv?.unreadCount || 0,
      lastMessage: conv?.lastMessage,
      lastMessageTime: conv?.lastMessageTime
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

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-red-400 p-4 text-center">
        <p>{error}</p>
        <button 
          onClick={fetchUsersAndConversations}
          className="mt-4 px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 text-white text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-xl font-bold text-white mb-1">Messages</h2>
        <p className="text-sm text-gray-400">
          {currentUser?.displayName || currentUser?.email}
        </p>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto">
        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No other users available</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {users.map((user) => {
              const convInfo = getConversationInfo(user._id);
              const isSelected = selectedContact?._id === user._id;

              return (
                <button
                  key={user._id}
                  onClick={() => onSelectContact(user)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-gray-800 transition-colors ${
                    isSelected ? 'bg-gray-800' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(
                      user.displayName
                    )} flex items-center justify-center flex-shrink-0`}
                  >
                    <span className="text-white font-bold text-sm">
                      {getInitials(user.displayName)}
                    </span>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-white truncate">
                        {user.displayName}
                      </h3>
                      {convInfo.lastMessageTime && (
                        <span className="text-xs text-gray-500 ml-2">
                          {formatTime(convInfo.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-400 truncate">
                        {convInfo.lastMessage || 'No messages yet'}
                      </p>
                      {convInfo.unreadCount > 0 && (
                        <span className="ml-2 bg-purple-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                          {convInfo.unreadCount}
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
