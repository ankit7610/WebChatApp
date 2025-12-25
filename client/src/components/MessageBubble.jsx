export default function MessageBubble({ message, isOwn, currentUserName }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name) => {
    return name?.charAt(0).toUpperCase() || '?';
  };

  const getAvatarColor = (name) => {
    const colors = [
      'from-red-400 to-red-600',
      'from-blue-400 to-blue-600',
      'from-green-400 to-green-600',
      'from-yellow-400 to-yellow-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-indigo-400 to-indigo-600',
      'from-teal-400 to-teal-600',
    ];
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  // Get sender name based on new message structure
  const senderName = message.senderName || message.username;

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`flex gap-3 max-w-lg ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end`}>
        {/* Avatar */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0 bg-gradient-to-br ${
            isOwn ? 'from-indigo-500 to-purple-500' : getAvatarColor(senderName)
          }`}
        >
          {getInitials(isOwn ? currentUserName : senderName)}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-md`}>
          {/* Username (only for others) */}
          {!isOwn && (
            <span className="text-xs font-semibold text-gray-400 mb-1 px-1">
              {senderName}
            </span>
          )}

          {/* Message Bubble */}
          <div
            className={`rounded-2xl px-5 py-3 shadow-md transform transition-all hover:scale-102 ${
              isOwn
                ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-sm'
                : 'bg-gray-800 text-white rounded-bl-sm border border-gray-700'
            }`}
          >
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.text}</p>
            <div className="flex items-center justify-end gap-1.5 mt-2">
              <p
                className={`text-xs ${
                  isOwn ? 'text-indigo-100' : 'text-gray-400'
                }`}
              >
                {formatTime(message.createdAt)}
              </p>
              {isOwn && (
                <svg className="w-4 h-4 text-indigo-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
