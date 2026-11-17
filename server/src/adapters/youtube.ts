import { Innertube, Log, YTNodes } from 'youtubei.js'
import type { Helpers, YT } from 'youtubei.js'
import type { CustomEmoji, YouTubeConfig } from '../../../shared/types.js'
import {
  type Connector,
  type ConnectorOptions,
  createDedupe,
  createStatusHolder,
  errorMessage,
} from './connector.js'

// youtubei.js logs a lot of harmless parser warnings when YouTube adds new UI nodes
Log.setLevel(Log.Level.NONE)

type LiveChat = ReturnType<YT.VideoInfo['getLiveChat']>
type ChatAction = Helpers.YTNode

interface YouTubeConnectorOptions extends ConnectorOptions, YouTubeConfig {
  /** How often we check whether the channel is live (ms). */
  pollIntervalMs?: number
}

/** While connected, re-check /live periodically to follow a new broadcast. */
const WATCHDOG_INTERVAL_MS = 120_000
const MAX_BACKOFF_MS = 5 * 60_000

export function createYouTubeConnector({
  channelId,
  pollIntervalMs = 20_000,
  onMessage,
  onStatusChange,
}: YouTubeConnectorOptions): Connector {
  const status = createStatusHolder('youtube', channelId, onStatusChange)
  const isDuplicate = createDedupe()

  let client: Innertube | null = null
  let chat: LiveChat | null = null
  let videoId: string | null = null
  let timer: NodeJS.Timeout | null = null
  let running = false
  let checking = false
  let failures = 0

  const clearTimer = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }

  const schedule = (ms: number) => {
    clearTimer()
    if (running) timer = setTimeout(() => void check(), ms)
  }

  const getClient = async (): Promise<Innertube> => {
    if (!client) {
      client = await Innertube.create({ retrieve_player: false, lang: 'fr', location: 'FR' })
    }
    return client
  }

  /** Returns the currently *live* video of the channel, or null. */
  const findLive = async (): Promise<{ id: string; info: YT.VideoInfo } | null> => {
    const yt = await getClient()
    const endpoint = await yt.resolveURL(`https://www.youtube.com/channel/${channelId}/live`)
    const id = endpoint?.payload?.videoId as string | undefined
    if (!id) return null // /live redirects to the channel page: nothing live

    const info = await yt.getInfo(id)
    // Ignore scheduled (upcoming) broadcasts and finished lives (replays)
    if (!info.basic_info.is_live) return null
    return { id, info }
  }

  const disconnectChat = () => {
    const current = chat
    chat = null
    videoId = null
    if (current) {
      current.removeAllListeners()
      try {
        current.stop()
      } catch (error) {
        console.warn('[youtube] error while stopping chat:', errorMessage(error))
      }
    }
  }

  const connectChat = (id: string, info: YT.VideoInfo) => {
    disconnectChat()
    const title = info.basic_info.title ?? id
    status.set('connecting', `Live found: ${title}`, id)

    const liveChat = info.getLiveChat()
    chat = liveChat
    videoId = id

    liveChat.on('start', () => {
      if (chat !== liveChat) return
      status.set('connected', `Live: ${title}`, id)
    })

    liveChat.on('chat-update', (action) => {
      if (chat !== liveChat) return
      try {
        handleAction(action)
      } catch (error) {
        console.error('[youtube] message processing error:', errorMessage(error))
      }
    })

    liveChat.on('error', (error) => {
      // youtubei.js retries by itself and emits 'end' when it gives up
      console.warn('[youtube] live chat error:', errorMessage(error))
    })

    liveChat.on('end', () => {
      if (chat !== liveChat) return
      disconnectChat()
      status.set('waiting', 'Stream ended - waiting for the next live')
      // Check again soon: if the stream was just restarted, reconnect quickly
      schedule(5_000)
    })

    liveChat.start()
  }

  const handleAction = (action: ChatAction) => {
    if (!action.is(YTNodes.AddChatItemAction)) return
    const item = action.item

    if (item.is(YTNodes.LiveChatTextMessage)) {
      emit(item.id, item.author, item.message)
    } else if (item.is(YTNodes.LiveChatPaidMessage)) {
      emit(item.id, item.author, item.message, `Super Chat ${item.purchase_amount}`)
    } else if (item.is(YTNodes.LiveChatPaidSticker)) {
      emit(item.id, item.author, undefined, `Super Sticker ${item.purchase_amount}`)
    } else if (item.is(YTNodes.LiveChatMembershipItem)) {
      const header = item.header_primary_text?.toString() || item.header_subtext?.toString()
      emit(item.id, item.author, item.message, header || 'New member')
    }
  }

  type Author = YTNodes.LiveChatTextMessage['author']
  type Text = YTNodes.LiveChatTextMessage['message']

  const emit = (id: string, author: Author, text?: Text, highlight?: string) => {
    if (isDuplicate(id)) return
    const { message, customEmojis } = parseText(text)
    if (!message && !highlight) return

    const badges = (author?.badges ?? [])
      .map((badge) => (badge.is(YTNodes.LiveChatAuthorBadge) ? badge.tooltip : null))
      .filter((label): label is string => Boolean(label))

    onMessage({
      id: `yt-${id}`,
      username: author?.name || 'unknown',
      message,
      badges,
      customEmojis,
      highlight,
      raw: {
        authorId: author?.id,
        isModerator: author?.is_moderator,
        isOwner: author?.is_creator,
        videoId,
      },
    })
  }

  const check = async () => {
    if (!running || checking) return
    checking = true
    clearTimer()
    try {
      const live = await findLive()
      failures = 0
      if (live && (live.id !== videoId || !chat)) {
        connectChat(live.id, live.info)
      } else if (!live && !chat) {
        status.set('waiting', 'Waiting for the stream to go live')
      }
    } catch (error) {
      failures++
      client = null // start from a fresh session next time
      if (!chat) status.set('error', `Live check failed (${errorMessage(error)}), retrying automatically`)
      else console.warn('[youtube] watchdog check failed:', errorMessage(error))
    } finally {
      checking = false
      const backoff = Math.min(pollIntervalMs * 2 ** Math.min(failures, 4), MAX_BACKOFF_MS)
      schedule(chat ? WATCHDOG_INTERVAL_MS : failures ? backoff : pollIntervalMs)
    }
  }

  return {
    start() {
      if (running) return
      running = true
      status.set('waiting', 'Checking whether the channel is live...')
      void check()
    },
    async stop() {
      running = false
      clearTimer()
      disconnectChat()
    },
    async refresh() {
      if (!running || checking) return
      // Manual reconnect: drop the current chat and check from scratch
      disconnectChat()
      failures = 0
      status.set('waiting', 'Manual refresh: checking whether the channel is live...')
      await check()
    },
    getStatus: status.get,
  }
}

/**
 * Converts YouTube text runs into plain text. Custom (channel) emojis are
 * replaced by their shortcut surrounded by spaces, and returned in
 * `customEmojis` so the client can render them as images.
 */
function parseText(text?: { runs?: unknown[]; toString(): string }): {
  message: string
  customEmojis: CustomEmoji[]
} {
  const customEmojis: CustomEmoji[] = []
  if (!text) return { message: '', customEmojis }
  if (!Array.isArray(text.runs)) return { message: text.toString(), customEmojis }

  const parts = text.runs.map((run) => {
    const r = run as {
      text?: string
      emoji?: { is_custom?: boolean; shortcuts?: string[]; image?: { url: string }[] }
    }
    if (r.emoji?.is_custom) {
      const shortcut = r.emoji.shortcuts?.[0] || r.text || ''
      const url = r.emoji.image?.[r.emoji.image.length - 1]?.url ?? r.emoji.image?.[0]?.url
      if (shortcut && url && !customEmojis.some((e) => e.text === shortcut)) {
        customEmojis.push({ text: shortcut, url })
      }
      return ` ${shortcut} `
    }
    return r.text ?? ''
  })

  return { message: parts.join('').replace(/\s{2,}/g, ' ').trim(), customEmojis }
}
