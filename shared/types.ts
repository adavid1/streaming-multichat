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
  status: 'stopped' | 'connecting' | 'connected' | 'error';
  message?: string;
  isRunning?: boolean;
  success?: boolean;
}

export interface TwitchStatus {
  status: 'stopped' | 'connecting' | 'connected' | 'disconnected' | 'error';
  message?: string;
  channel?: string;
}

export interface TikTokStatus {
  status: 'stopped' | 'connecting' | 'connected' | 'error';
  message?: string;
  isRunning?: boolean;
  success?: boolean;
}

export interface WebSocketMessage {
  type: 'chat' | 'connection' | 'error' | 'badges' | 'youtube-status' | 'twitch-status' | 'tiktok-status';
  data?: ChatMessage | TwitchBadgeResponse | YouTubeStatus | TwitchStatus | TikTokStatus;
  message?: string;
}

export interface TwitchConfig {
  channel: string;
}

export interface YouTubeConfig {
  channelId: string;
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
  getStatus: () => 'stopped' | 'connecting' | 'connected' | 'error';
}

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