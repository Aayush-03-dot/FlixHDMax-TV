import type { HomeItem } from '../types/home'

export type TVCastMember = {
  name: string
  profile_path?: string | null
}

export type TVRelatedItem = HomeItem

export type TVMovieDetail = {
  id: string
  title: string
  description?: string | null
  embed_code?: string | null
  poster_url?: string | null
  backdrop_url?: string | null
  release_date?: string | null
  rating?: number | string | null
  director?: string | null
  genre?: string | null
  genre_list?: string[]
  content_type: 'movie'
  display_thumbnail?: string | null
  poster_display?: string | null
  backdrop_display?: string | null
  video_source_type?: 'iframe' | 'hosted'
  hosted_video_id?: string | null
  hosted_watch_url?: string | null
}

export type TVEpisode = {
  id: number
  number: number
  title: string
  embed_code?: string | null
  video_source_type?: 'iframe' | 'hosted'
  hosted_video_id?: string | null
  hosted_watch_url?: string | null
}

export type TVSeason = {
  id: number
  title: string
  episodes: TVEpisode[]
}

export type TVSeriesDetail = {
  id: string
  title: string
  description?: string | null
  poster_url?: string | null
  backdrop_url?: string | null
  release_date?: string | null
  rating?: number | string | null
  director?: string | null
  genre?: string | null
  genre_list?: string[]
  content_type: 'series'
  display_thumbnail?: string | null
  poster_display?: string | null
  backdrop_display?: string | null
  seasons: TVSeason[]
}

export type TVMovieDetailResponse = {
  success: boolean
  item: TVMovieDetail
  cast: TVCastMember[]
  related_items: TVRelatedItem[]
}

export type TVSeriesDetailResponse = {
  success: boolean
  item: TVSeriesDetail
  cast: TVCastMember[]
  related_items: TVRelatedItem[]
}

export type TVMyListItem = HomeItem & {
  display_thumbnail?: string
  thumbnail?: string
  poster_url?: string
  backdrop_url?: string
}

export type TVMyListResponse = {
  success: boolean
  items: TVMyListItem[]
}
