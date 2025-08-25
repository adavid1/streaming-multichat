import React from 'react';
import type { ChatMessage as ChatMessageType } from '../../../shared/types';

interface ChatMessageProps {
  message: ChatMessageType;
  showPlatform?: boolean;
  showBadges?: boolean;
  isNew?: boolean;
}

const platformColors = {
  twitch: 'bg-purple-600',
  youtube: 'bg-red-600',
  tiktok: 'bg-pink-600',
};

const platformLabels = {
  twitch: 'Twitch',
  youtube: 'YouTube',
  tiktok: 'TikTok',
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  showPlatform = false,
  showBadges = false,
  isNew = false 
}) => {
  const { username, message: text, badges, platform, color, ts } = message;

  return (
    <div className={`
      flex gap-2 items-start px-3 rounded-2xl
      backdrop-blur-sm
      transition-all duration-200 ease-out
      ${isNew ? 'animate-fade-in' : ''}
    `}>
      {/* Timestamp */}
      <span className="text-xs leading-relaxed text-chat-muted flex-shrink-0">
        {new Date(ts).toLocaleTimeString([], { 
          hour12: false,
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </span>

        {/* Header with username, badges, and platform */}
        <div className="flex items-center gap-2 flex-wrap">
          <span 
            className="font-semibold text-sm truncate"
            style={{ color: color || undefined }}
          >
            {username}
          </span>

          {/* Platform indicator */}
          {showPlatform && (
            <span className={`
              px-2 py-0.5 text-xs rounded-full text-white font-medium
              ${platformColors[platform]}
            `}>
              {platformLabels[platform]}
            </span>
          )}

          {/* Badges */}
          {showBadges && (badges.length > 0 && (
            <div className="flex gap-1">
              {badges.map((badge, index) => (
                <span
                  key={index}
                  className="px-1.5 py-0.5 text-xs rounded bg-gray-700 text-gray-300"
                >
                  {badge}
                </span>
              ))}
            </div>
          ))}
        </div>

        {/* Message text */}
        <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
          {text}
        </div>
    </div>
  );
};