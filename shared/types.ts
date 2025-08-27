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

export interface YouTubeStatus {
  status: 'stopped' | 'connecting' | 'connected' | 'error' | 'retrying';
  message?: string;
  isRunning?: boolean;
  action?: 'start' | 'stop';
  success?: boolean;
}

export interface WebSocketMessage {
  type: 'chat' | 'connection' | 'error' | 'badges' | 'youtube-status';
  data?: ChatMessage | TwitchBadgeResponse | YouTubeStatus;
  message?: string;
}

export interface TwitchConfig {
  channel: string;
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

export interface YouTubeAdapterController {
  start: () => Promise<boolean>;
  stop: () => Promise<void>;
  isRunning: () => boolean;
  getStatus: () => 'stopped' | 'connecting' | 'connected' | 'error' | 'retrying';
}

export type StopFunction = () => Promise<void> | void;

export interface TwitchBadge {
  set_id: string;
  versions: Array<{
    id: string;
    image_url_1x: string;
    image_url_2x: string;
    image_url_4x: string;
  }>;
}

export interface TwitchBadges {
  data: TwitchBadge[];
}

export interface TwitchBadgeResponse {
  badge_sets: Record<string, {
    versions: Record<string, {
      image_url_1x: string;
      image_url_2x: string;
      image_url_4x: string;
    }>;
  }>;
}

export interface SubscriptionBadgeInfo {
  months: number;
  imageUrl: string;
}