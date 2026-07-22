import type { HomeItem } from '../types/home'
import type { TVMyListItem } from './types'

type TVArtworkSource = {
  backdrop_display?: string | null
  backdrop_url?: string | null
  thumbnail_display?: string | null
  display_thumbnail?: string | null
  thumbnail?: string | null
  poster_display?: string | null
  poster_url?: string | null
}

export function tvPath(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized || '/'
}

export function getTVHomePath() {
  return '/'
}

export function detailPath(item: Pick<HomeItem, 'id' | 'content_type'>) {
  return tvPath(`/${item.content_type}/${item.id}`)
}

export function resolveMediaUrl(
  value?: string | null,
  fallback = '/admin-logo.png'
) {
  if (!value) return fallback

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value
  }

  if (value.startsWith('/')) return value

  return `/${value}`
}

export function getItemArtwork(item?: TVArtworkSource | null) {
  if (!item) return '/admin-logo.png'

  return resolveMediaUrl(
    item.backdrop_display ||
      item.backdrop_url ||
      item.thumbnail_display ||
      item.display_thumbnail ||
      item.thumbnail ||
      item.poster_display ||
      item.poster_url
  )
}

export function getPosterArtwork(item?: TVArtworkSource | null) {
  if (!item) return '/admin-logo.png'

  return resolveMediaUrl(
    item.poster_display ||
      item.poster_url ||
      item.display_thumbnail ||
      item.thumbnail_display ||
      item.thumbnail ||
      item.backdrop_display ||
      item.backdrop_url
  )
}

export function getYear(releaseDate?: string | null) {
  if (!releaseDate) return ''
  return releaseDate.slice(0, 4)
}

export function formatRating(rating?: number | string | null) {
  if (rating === null || rating === undefined || rating === '') return ''

  const value = Number(rating)
  return Number.isFinite(value) ? value.toFixed(1) : ''
}

export function normalizeMyListItem(item: TVMyListItem): HomeItem {
  return {
    id: item.id,
    title: item.title,
    description: item.description || '',
    release_date: item.release_date || '',
    rating: item.rating ?? null,
    content_type: item.content_type,
    thumbnail_display:
      item.backdrop_display ||
      item.backdrop_url ||
      item.thumbnail_display ||
      item.display_thumbnail ||
      item.thumbnail ||
      item.poster_display ||
      item.poster_url,
    poster_display:
      item.poster_display ||
      item.poster_url ||
      item.display_thumbnail ||
      item.thumbnail_display,
    backdrop_display:
      item.backdrop_display ||
      item.backdrop_url ||
      item.thumbnail_display ||
      item.display_thumbnail,
    in_my_list: true,
  }
}
