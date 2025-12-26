export default function MessageBubble({ message, isOwn, senderName: propSenderName, theme }) {
  const isDark = theme === 'dark';

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  const senderName = propSenderName || message.senderName || message.username || 'Unknown';
  const isPending = message.pending;

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`flex gap-2.5 max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar - only show for received messages */}
        {!isOwn && (
          <div className="flex-shrink-0 self-end">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg bg-gradient-to-br ${getAvatarColor(senderName)}`}
            >
              {getInitials(senderName)}
            </div>
          </div>
        )}

        {/* Message Content */}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Sender name - only for received messages */}
          {!isOwn && (
            <span className={`text-xs font-medium mb-1 ml-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              {senderName}
            </span>
          )}

          {/* Message Bubble */}
          <div
            className={`relative px-4 py-2.5 shadow-lg transition-all ${
              isOwn
                ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-2xl rounded-br-md'
                : isDark
                  ? 'bg-slate-800 text-white rounded-2xl rounded-bl-md border border-slate-700'
                  : 'bg-white text-gray-900 rounded-2xl rounded-bl-md border border-gray-200 shadow-md'
            } ${isPending ? 'opacity-70 scale-95' : 'scale-100'}`}
          >
            {/* Message text */}
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap max-w-prose">
              {message.text}
            </p>

            {/* Time and status */}
            <div className={`flex items-center gap-1.5 mt-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <span className={`text-[10px] font-medium ${
                isOwn 
                  ? 'text-violet-200' 
                  : isDark ? 'text-slate-500' : 'text-gray-500'
              }`}>
                {formatTime(message.timestamp)}
              </span>
              {isOwn && (
                <div className="flex items-center">
                  {isPending ? (
                    <svg className="w-3.5 h-3.5 text-violet-200 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-violet-200" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              )}
            </div>

            {/* Message tail - Speech bubble effect */}
            {isOwn && (
              <div className={`absolute -right-1.5 bottom-0 w-4 h-4 overflow-hidden ${isPending ? 'opacity-70' : ''}`}>
                <div className="absolute w-4 h-4 bg-purple-600 rotate-45 transform origin-bottom-left rounded-sm" />
              </div>
            )}

            {!isOwn && (
              <div className="absolute -left-1.5 bottom-0 w-4 h-4 overflow-hidden">
                <div className={`absolute w-4 h-4 rotate-45 transform origin-bottom-right rounded-sm ${
                  isDark ? 'bg-slate-800 border-l border-b border-slate-700' : 'bg-white border-l border-b border-gray-200'
                }`} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
