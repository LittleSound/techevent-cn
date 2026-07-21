/** Repository the site is built from; used for the GitHub link and PR guide. */
export const repoUrl = 'https://github.com/LittleSound/techevent-cn'

/** Link contributors land on when they want to add an event. */
export const newEventUrl = `${repoUrl}/blob/master/CONTRIBUTING.md`

/** Published iCalendar feed for subscription. */
export const calendarUrl = '/events.ics'

/** Canonical production origin, no trailing slash. Used for OG/canonical/JSON-LD/sitemap. */
export const siteUrl = 'https://event.rizumu.me'

/** GitHub web-editor deep link for one event's JSON file; GitHub auto-forks for non-collaborators. */
export function eventEditUrl(id: string): string {
  return `${repoUrl}/edit/master/data/events/${id}.json`
}
