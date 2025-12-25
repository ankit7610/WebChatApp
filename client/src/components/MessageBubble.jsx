export default function MessageBubble({ message, isOwn, currentUserName }) {
  const formatTime = (timestamp) => {
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

  const senderName = message.senderName || message.username;
  const isPending = message.pending;

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`flex gap-3 max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
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
            <span className="text-xs font-medium text-slate-400 mb-1 ml-1">
              {senderName}
            </span>
          )}

          {/* Message Bubble */}
          <div
            className={`relative px-4 py-2.5 shadow-lg ${
              isOwn
                ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-2xl rounded-br-md'
                : 'bg-slate-800 text-white rounded-2xl rounded-bl-md border border-slate-700/50'
            } ${isPending ? 'opacity-70' : ''}`}
          >
            {/* Message text */}
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
              {message.text}
            </p>

            {/* Time and status */}
            <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <span className={`text-[10px] ${isOwn ? 'text-violet-200' : 'text-slate-500'}`}>
                {formatTime(message.createdAt)}
              </span>
              {isOwn && (
                <div className="flex items-center">
                  {isPending ? (
                    <svg className="w-3.5 h-3.5 text-violet-200 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-violet-200" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              )}
            </div>

            {/* Tail for own messages */}
            {isOwn && (
              <div className="absolute -right-1 bottom-0 w-3 h-3 overflow-hidden">
                <div className="absolute w-4 h-4 bg-purple-600 rotate-45 transform origin-bottom-left" />
              </div>
            )}

            {/* Tail for received messages */}
            {!isOwn && (
              <div className="absolute -left-1 bottom-0 w-3 h-3 overflow-hidden">
                <div className="absolute w-4 h-4 bg-slate-800 rotate-45 transform origin-bottom-right border-l border-b border-slate-700/50" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
