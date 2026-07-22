import type { TVMyListResponse } from './types'
import { apiGet } from '../services/api'

export async function isInMyList(contentType: 'movie' | 'series', contentId: string) {
  const response = await apiGet<TVMyListResponse>('/api/my-list')

  return (response.items || []).some(
    (item) => item.content_type === contentType && String(item.id) === String(contentId)
  )
}

export async function toggleTVMyList(
  contentType: 'movie' | 'series',
  contentId: string
) {
  const response = await fetch('/api/my-list/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      content_type: contentType,
      content_id: contentId,
    }),
  })

  const data = (await response.json()) as {
    success?: boolean
    in_list?: boolean
    message?: string
  }

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Could not update My List.')
  }

  return Boolean(data.in_list)
}
