export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

export function joinBase(baseUrl: string, path: string): string {
  const base = normalizeBaseUrl(baseUrl)
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${base}${suffix}`
}

export function assetUrl(baseUrl: string, assetId: string): string {
  return joinBase(baseUrl, `/a/${assetId}`)
}

export function workOrderUrl(baseUrl: string, woId: string): string {
  return joinBase(baseUrl, `/w/${woId}`)
}

export interface ScanTarget {
  kind: 'asset' | 'work'
  id: string
}

/**
 * Pull an asset or work-order id out of a scanned QR payload.
 * Accepts a full URL (`https://host/a/AST-0001`, including a GitHub Pages prefix)
 * or a bare id printed on a label.
 */
export function parseScan(raw: string): ScanTarget | null {
  const text = raw.trim()
  if (!text) return null
  const path = text.match(/\/([aw])\/(AST-\d+|WO-\d+)/i)
  if (path) {
    const kind = path[1].toLowerCase() === 'a' ? 'asset' : 'work'
    const id = path[2].toUpperCase()
    if (kind === 'asset' && id.startsWith('AST-')) return { kind, id }
    if (kind === 'work' && id.startsWith('WO-')) return { kind, id }
    return null
  }
  const asset = text.match(/AST-\d+/i)
  const work = text.match(/WO-\d+/i)
  if (asset && !work) return { kind: 'asset', id: asset[0].toUpperCase() }
  if (work && !asset) return { kind: 'work', id: work[0].toUpperCase() }
  return null
}

export function defaultBaseUrl(): string {
  if (typeof window === 'undefined') return 'https://cmms.local'
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1' || host === '') return 'https://cmms.local'
  const prefix = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${window.location.origin}${prefix}`
}
