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

  // Status Icon Component
  const StatusIcon = () => {
    if (isPending) {
      return (
        <svg className="w-3 h-3 text-violet-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }

    if (message.seen) {
      // Double Blue Tick
      return (
        <div className="flex relative w-[19px] h-3.5">
          <svg className="w-3.5 h-3.5 text-[#53bdeb] absolute left-0 bottom-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <svg className="w-3.5 h-3.5 text-[#53bdeb] absolute left-[5px] bottom-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }

    // Single Grey/White Tick (Sent)
    return (
      <svg className="w-3.5 h-3.5 text-violet-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
      </svg>
    );
  };

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
            className={`relative px-4 py-2 shadow-lg transition-all ${
              isOwn
                ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-2xl rounded-br-md'
                : isDark
                  ? 'bg-slate-800 text-white rounded-2xl rounded-bl-md border border-slate-700'
                  : 'bg-white text-gray-900 rounded-2xl rounded-bl-md border border-gray-200 shadow-md'
            } ${isPending ? 'opacity-70 scale-95' : 'scale-100'}`}
          >
            {/* Message text */}
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap max-w-prose pr-2">
              {message.text}
            </p>

            {/* Time and status */}
            <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <span className={`text-[10px] font-medium ${
                isOwn 
                  ? 'text-violet-200' 
                  : isDark ? 'text-slate-500' : 'text-gray-500'
              }`}>
                {formatTime(message.timestamp)}
              </span>
              {isOwn && (
                <div className="ml-0.5">
                  <StatusIcon />
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
