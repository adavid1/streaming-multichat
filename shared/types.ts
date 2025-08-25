export type Platform = 'twitch' | 'youtube' | 'tiktok';

export interface ChatMessage {
  id: string;
  ts: number;
  platform: Platform;
  username: string;
  message: string;
  badges: string[];
  color: string | null;
  raw: Record<string, any>;
}

export interface PlatformFilters {
  twitch: boolean;
  youtube: boolean;
  tiktok: boolean;
}

export interface WebSocketMessage {
  type: 'chat' | 'connection' | 'error';
  data?: ChatMessage;
  message?: string;
}

export interface TwitchConfig {
  username: string;
  oauth: string;
  channels: string[];
}

export interface YouTubeConfig {
  channelId: string; // UC... channel id for youtube-chat
  retryWhenOffline: boolean;
}

export interface TikTokConfig {
  username: string;
}

export interface AdapterEvent {
  username: string;
  message: string;
  badges?: string[];
  color?: string | null;
  raw?: Record<string, any>;
}

export interface AdapterConfig {
  onMessage: (event: AdapterEvent) => void;
  debug?: boolean;
}

export type StopFunction = () => Promise<void> | void;