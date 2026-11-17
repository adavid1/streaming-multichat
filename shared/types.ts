// NOTE: this file must only contain types (no runtime values): it is imported
// with `import type` by both the server and the client.

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
  customEmojis?: CustomEmoji[];
  /** Highlighted events (YouTube Super Chat, TikTok gift, membership...) */
  highlight?: string;
}

export interface PlatformFilters {
  twitch: boolean;
  youtube: boolean;
  tiktok: boolean;
}

/**
 * Lifecycle of a platform connector:
 * - disabled:   platform not configured (missing env var)
 * - waiting:    configured, polling until the channel goes live
 * - connecting: live detected, connecting to the chat
 * - connected:  receiving chat messages
 * - error:      last attempt failed; the connector keeps retrying on its own
 */
export type ConnectorState = 'disabled' | 'waiting' | 'connecting' | 'connected' | 'error';

export interface PlatformStatus {
  status: ConnectorState;
  message?: string;
  /** Channel / username being watched */
  channel?: string;
  /** Current live identifier (YouTube video id, TikTok room id) */
  liveId?: string;
  updatedAt?: number;
}

export type YouTubeStatus = PlatformStatus;
export type TwitchStatus = PlatformStatus;
export type TikTokStatus = PlatformStatus;

export type PlatformStatuses = Record<Platform, PlatformStatus>;

export type WebSocketMessage =
  | { type: 'chat'; data: ChatMessage }
  | { type: 'history'; data: ChatMessage[] }
  | { type: 'status'; data: PlatformStatuses }
  | { type: 'badges'; data: TwitchBadgeResponse }
  | { type: 'connection'; message: string }
  | { type: 'ping'; ts: number };

export interface TwitchConfig {
  channel: string;
}

export interface YouTubeConfig {
  channelId: string;
}

export interface TikTokConfig {
  username: string;
}

export interface CustomEmoji {
  text: string;
  url: string;
}

export interface AdapterEvent {
  /** Stable platform-side id, used to de-duplicate messages across reconnects */
  id?: string;
  username: string;
  message: string;
  badges?: string[];
  color?: string | null;
  raw?: Record<string, any>;
  customEmojis?: CustomEmoji[];
  highlight?: string;
}

export interface AdapterConfig {
  onMessage: (event: AdapterEvent) => void;
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
