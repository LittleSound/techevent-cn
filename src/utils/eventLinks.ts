// @unocss-include
// The directive above makes UnoCSS extract the `i-*` icon classes from this
// plain .ts file (it is outside the default extraction pipeline).

import type { EventLink } from '~/types'

export interface ResolvedEventLink {
  url: string
  label: string
  icon: string
}

interface PlatformDef {
  /** Hostnames that match this entry directly or as a subdomain (e.g. `bilibili.com` also matches `space.bilibili.com`). */
  hosts: string[]
  icon: string
  label: string
}

const platforms: PlatformDef[] = [
  { hosts: ['x.com', 'twitter.com'], icon: 'i-simple-icons-x', label: 'X (Twitter)' },
  { hosts: ['github.com'], icon: 'i-simple-icons-github', label: 'GitHub' },
  { hosts: ['bilibili.com'], icon: 'i-simple-icons-bilibili', label: '哔哩哔哩' },
  { hosts: ['mp.weixin.qq.com'], icon: 'i-simple-icons-wechat', label: '微信公众号' },
  { hosts: ['youtube.com', 'youtu.be'], icon: 'i-simple-icons-youtube', label: 'YouTube' },
  { hosts: ['weibo.com'], icon: 'i-simple-icons-sinaweibo', label: '微博' },
  { hosts: ['discord.gg', 'discord.com'], icon: 'i-simple-icons-discord', label: 'Discord' },
  { hosts: ['t.me'], icon: 'i-simple-icons-telegram', label: 'Telegram' },
  { hosts: ['meetup.com'], icon: 'i-simple-icons-meetup', label: 'Meetup' },
  { hosts: ['huodongxing.com'], icon: 'i-carbon-ticket', label: '活动行' },
  { hosts: ['lu.ma'], icon: 'i-carbon-ticket', label: 'Luma' },
]

/** A hostname matches an entry if it equals it, or ends with `.<entry>` (subdomain). */
function hostMatches(hostname: string, entry: string): boolean {
  return hostname === entry || hostname.endsWith(`.${entry}`)
}

/**
 * Infer a platform icon and default label from a link's URL hostname, so
 * contributors only need to paste a URL and (optionally) override the label.
 * Falls back to a generic link icon + bare hostname for unrecognized domains,
 * and to the raw url string when the URL itself fails to parse.
 */
export function resolveEventLink(link: EventLink): ResolvedEventLink {
  let hostname: string
  try {
    hostname = new URL(link.url).hostname.replace(/^www\./, '')
  }
  catch {
    return { url: link.url, label: link.label ?? link.url, icon: 'i-carbon-link' }
  }

  // Eventbrite has region-specific TLD variants (eventbrite.com, .co.uk, …).
  if (hostname === 'eventbrite' || hostname.startsWith('eventbrite.'))
    return { url: link.url, label: link.label ?? 'Eventbrite', icon: 'i-carbon-ticket' }

  const platform = platforms.find(p => p.hosts.some(h => hostMatches(hostname, h)))
  if (platform)
    return { url: link.url, label: link.label ?? platform.label, icon: platform.icon }

  return { url: link.url, label: link.label ?? hostname, icon: 'i-carbon-link' }
}
