export type AdminUser = {
  id?: number
  username?: string
  display_name?: string | null
  email?: string
  role?: string
}

export type AdminMeResponse = {
  success: boolean
  authenticated: boolean
  is_admin: boolean
  admin_path?: string
  user?: AdminUser
  message?: string
}

export type AdminStats = {
  totalMovies: number
  totalSeries: number
  pendingRequests: number
  totalUsers: number
  pendingUsers: number
  totalNewMessages: number
}

export type ManagedContentItem = {
  id: string
  title: string
  content_type?: 'movie' | 'series'
  type?: 'movie' | 'series'
  display_thumbnail?: string | null
  thumbnail_display?: string | null
  poster_display?: string | null
  poster_url?: string | null
  thumbnail?: string | null
  release_date?: string | null
  rating?: number | string | null
  genre?: string | null
}

export type AdminContentResponse = {
  items: ManagedContentItem[]
  has_next: boolean
  next_page_number: number | null
  total_items: number
}

export type MovieRequestItem = {
  id: number
  title: string
  link?: string | null
  notes?: string | null
  status: string
  date?: string | null

  user_id?: number | null
  username?: string | null
  user_username?: string | null
  email?: string | null
  user_email?: string | null
  requested_by?: string | null
  requester?: {
    username?: string | null
    email?: string | null
  } | null
  user?: {
    username?: string | null
    email?: string | null
  } | null
}

export type CompleteRequestResponse = {
  success: boolean
  updated_request: MovieRequestItem
  message?: string
}

export type DeleteRequestResponse = {
  success: boolean
  message?: string
}

export type AdminToast = {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

export type ConfirmDialog = {
  open: boolean
  title: string
  message: string
  confirmText: string
  danger?: boolean
  onConfirm: (() => void) | null
}

export type TmdbActor = {
  name: string
  profile_path?: string | null
}

export type TmdbFetchResponse = {
  error?: string
  not_found?: boolean
  message?: string
  title?: string
  tmdb_id?: number | string
  overview?: string
  poster_url?: string | null
  backdrop_url?: string | null
  genres?: string[]
  actors?: TmdbActor[]
  director?: string
  release_date?: string
  rating?: number | string | null
}

export type AddMovieForm = {
  tmdb_id: string
  title: string
  description: string
  genres: string
  rating: string
  poster_url: string
  backdrop_url: string
  preview_url: string
  actors: string
  actors_json: string
  director: string
  release_date: string
  video_source_type: 'iframe' | 'hosted'
  movie_embed_code: string
  hosted_video_id: string
  download_url: string
  thumbnail: File | null
}

export type AddSeriesEpisodeForm = {
  client_id: string
  episode_number: string
  title: string
  description: string
  release_date: string
  video_source_type: 'iframe' | 'hosted'
  embed_code: string
  hosted_video_id: string
  download_url: string
}

export type AddSeriesSeasonForm = {
  client_id: string
  season_number: string
  title: string
  episodes: AddSeriesEpisodeForm[]
}

export type AddSeriesForm = {
  tmdb_id: string
  title: string
  description: string
  genres: string
  rating: string
  poster_url: string
  backdrop_url: string
  preview_url: string
  actors: string
  actors_json: string
  director: string
  release_date: string
  download_url: string
  seasons: AddSeriesSeasonForm[]
}

export type MovieDetailCastMember = {
  name: string
  profile_path?: string | null
}

export type MovieDetailItem = {
  id: string
  tmdb_id?: string | number | null
  title: string
  description?: string | null
  release_date?: string | null
  rating?: number | string | null
  director?: string | null
  genre?: string | null
  genre_list?: string[]
  cast?: MovieDetailCastMember[]
  download_url?: string | null
  embed_code?: string | null
  video_source_type?: 'iframe' | 'hosted' | string | null
  hosted_video_id?: string | null
  poster_url?: string | null
  backdrop_url?: string | null
  preview_url?: string | null
  poster_display?: string | null
  backdrop_display?: string | null
  display_thumbnail?: string | null
  thumbnail_display?: string | null
  thumbnail?: string | null
  content_type?: 'movie'
}

export type MovieDetailResponse = {
  success: boolean
  item: MovieDetailItem
  cast?: MovieDetailCastMember[]
  director?: string | null
  related_items?: ManagedContentItem[]
}

export type EditMovieForm = {
  id: string
  tmdb_id: string
  title: string
  description: string
  genres: string
  rating: string
  poster_url: string
  backdrop_url: string
  preview_url: string
  actors: string
  director: string
  release_date: string
  video_source_type: 'iframe' | 'hosted'
  embed_code: string
  hosted_video_id: string
  download_url: string
  thumbnail: File | null
}

export type EditMovieResponse = {
  success: boolean
  message?: string
  item?: ManagedContentItem & {
    id: string
    title: string
    content_type?: 'movie'
    poster_url?: string | null
    poster_display?: string | null
    thumbnail_display?: string | null
    display_thumbnail?: string | null
    release_date?: string | null
    rating?: number | string | null
    genre?: string | null
  }
}

export type SeriesDetailEpisode = {
  id?: number | string | null
  number?: number | string | null
  title?: string | null
  embed_code?: string | null
  video_source_type?: 'iframe' | 'hosted' | string | null
  hosted_video_id?: string | null
  hosted_watch_url?: string | null
}

export type SeriesDetailSeason = {
  id?: number | string | null
  title?: string | null
  episodes?: SeriesDetailEpisode[]
}

export type SeriesDetailItem = {
  id: string
  tmdb_id?: string | number | null
  title: string
  description?: string | null
  rating?: number | string | null
  preview_url?: string | null
  download_url?: string | null
  seasons?: SeriesDetailSeason[]
  content_type?: 'series'
}

export type SeriesDetailResponse = {
  success: boolean
  item: SeriesDetailItem
  cast?: MovieDetailCastMember[]
  director?: string | null
}

export type EditSeriesEpisodeForm = {
  client_id: string
  id: string
  number: string
  title: string
  embed_code: string
  video_source_type: 'iframe' | 'hosted'
  hosted_video_id: string
}

export type EditSeriesSeasonForm = {
  client_id: string
  id: string
  title: string
  episodes: EditSeriesEpisodeForm[]
}

export type EditSeriesForm = {
  id: string
  title: string
  description: string
  rating: string
  preview_url: string
  download_url: string
  seasons: EditSeriesSeasonForm[]
}

export type EditSeriesResponse = {
  success: boolean
  message?: string
  redirect?: string
}

export type AdminManagedUser = {
  id: number
  username: string
  display_name?: string | null
  email: string
  role: 'user' | 'admin' | string
  is_active: boolean
  last_login_at?: string | null
  last_seen_at?: string | null
  login_count?: number
  profile_image?: string | null
  google_id?: string | null
  auth_provider?: string | null
  movie_requests_count?: number
  notifications_count?: number
  my_list_count?: number
}

export type AdminUsersResponse = {
  success?: boolean
  users?: AdminManagedUser[]
  items?: AdminManagedUser[]
  total_users?: number
  total_items?: number
  pages?: number
  current_page?: number
  page?: number
  has_next?: boolean
  next_num?: number | null
  next_page_number?: number | null
}

export type AdminUserDetail = AdminManagedUser & {
  recent_requests?: MovieRequestItem[]
  recent_notifications?: {
    id: number
    title: string
    message: string
    type?: string
    is_read?: boolean
    created_at?: string
    time_ago?: string
  }[]
}

export type AdminUserDetailResponse = {
  success?: boolean
  user?: AdminUserDetail
  item?: AdminUserDetail
}

export type AdminUserMutationResponse = {
  success: boolean
  message?: string
  user?: AdminManagedUser
  item?: AdminManagedUser
  deleted_user_id?: number
}


export type AdminNotificationItem = {
  id: number
  notification_group_id?: number
  recipient_count?: number
  is_grouped?: boolean
  user_id: number
  username?: string | null
  user_email?: string | null
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error' | string
  image_url?: string | null
  is_read?: boolean
  created_at?: string
  time_ago?: string

}

export type AdminNotificationsResponse = {
  success: boolean
  items: AdminNotificationItem[]
  total_items: number
  page: number
  has_next: boolean
  next_page_number?: number | null
}

export type SendNotificationResponse = {
  success: boolean
  message?: string
  sent_count?: number
}

export type DeleteNotificationResponse = {
  success: boolean
  message?: string
  deleted_notification_id?: number
}

export type AdminPendingUser = {
  id: number
  username: string
  email: string
  otp: string
  created_at?: string | null
  expires_at?: string | null
  age_seconds?: number
  is_expired?: boolean
}

export type AdminPendingUsersResponse = {
  success?: boolean
  items?: AdminPendingUser[]
  pending_users?: AdminPendingUser[]
  total_items?: number
  total_pending_users?: number
  page?: number
  current_page?: number
  has_next?: boolean
  next_page_number?: number | null
  next_num?: number | null
}

export type AdminPendingUserMutationResponse = {
  success: boolean
  message?: string
  user?: AdminManagedUser
  approved_pending_user_id?: number
  deleted_pending_user_id?: number
}

export type AdminContactMessage = {
  id: number
  name: string
  email: string
  subject?: string | null
  message: string
  date?: string | null
  status: 'New' | 'Read' | string
}

export type AdminMessagesResponse = {
  success?: boolean
  items?: AdminContactMessage[]
  messages?: AdminContactMessage[]
  total_items?: number
  total_messages?: number
  page?: number
  current_page?: number
  has_next?: boolean
  next_page_number?: number | null
  next_num?: number | null
}

export type AdminMessageDetailResponse = {
  success?: boolean
  item?: AdminContactMessage
  message?: AdminContactMessage
}

export type AdminMessageMutationResponse = {
  success: boolean
  message?: string
  item?: AdminContactMessage
  updated_message?: AdminContactMessage
  deleted_message_id?: number
}

export type AdminPageItem = {
  id: number
  key: string
  title: string
  slug: string
  content: string
  meta_description?: string | null
  is_published: boolean
  is_system: boolean
  show_in_footer: boolean
  updated_at?: string | null
}

export type AdminPagesListResponse =
  | AdminPageItem[]
  | {
      success?: boolean
      items?: AdminPageItem[]
      pages?: AdminPageItem[]
    }

export type AdminPageDetailResponse =
  | AdminPageItem
  | {
      success?: boolean
      item?: AdminPageItem
      page?: AdminPageItem
    }

export type AdminPageUpdateResponse = {
  success: boolean
  message?: string
  page?: AdminPageItem
  item?: AdminPageItem
}

export type AnalyticsDateRange = {
  from: string
  to: string
}

export type AnalyticsKpi = {
  total_sessions: number
  active_users: number
  pageviews: number
  watchpage_seconds: number
}

export type AnalyticsOverviewResponse = {
  ok: boolean
  range: AnalyticsDateRange
  kpi: AnalyticsKpi
}

export type AnalyticsOnlineResponse = {
  ok: boolean
  online: {
    sessions: number
    users: number
    guests: number
  }
}

export type AnalyticsSessionItem = {
  session_id: string
  user_id?: number | null
  started_at?: string | null
  last_seen_at?: string | null
  duration_seconds?: number | string | null
  pageviews?: number | string | null
  events_count?: number | string | null
  watch_time_seconds?: number | string | null
  device_type?: 'mobile' | 'desktop' | 'tablet' | 'unknown' | string | null
}

export type AnalyticsRecentSessionsResponse = {
  ok: boolean
  range: AnalyticsDateRange
  sessions: AnalyticsSessionItem[]
}

export type AnalyticsTopUserItem = {
  user_id: number
  user_name?: string | null
  sessions?: number | string | null
  watch_page_seconds?: number | string | null
  opens?: number | string | null
}

export type AnalyticsTopUsersResponse = {
  ok: boolean
  range: AnalyticsDateRange
  users: AnalyticsTopUserItem[]
}

export type AnalyticsTopContentItem = {
  content_type?: string | null
  content_id?: string | null
  approx_seconds?: number | string | null
  unique_users?: number | string | null
}

export type AnalyticsTopContentResponse = {
  ok: boolean
  range: AnalyticsDateRange
  content: AnalyticsTopContentItem[]
}

export type AnalyticsLiveNowItem = {
  session_id: string
  user_id?: number | null
  username?: string | null
  email?: string | null
  last_seen_at?: string | null
  device_type?: string | null
  last_path?: string | null
}

export type AnalyticsLiveNowResponse = {
  ok: boolean
  sessions: AnalyticsLiveNowItem[]
}

export type AnalyticsLiveFeedItem = {
  id: number
  ts?: string | null
  session_id: string
  user_id?: number | null
  username?: string | null
  email?: string | null
  event_name: string
  path?: string | null
}

export type AnalyticsLiveFeedResponse = {
  ok: boolean
  events: AnalyticsLiveFeedItem[]
}

export type AnalyticsTimelineItem = {
  ts?: string | null
  event_name: string
  path?: string | null
  referrer?: string | null
  properties?: string | null
}

export type AnalyticsTimelineResponse = {
  ok: boolean
  timeline: AnalyticsTimelineItem[]
}


export type VideoHostingStatus =
  | 'ready'
  | 'processing'
  | 'encoding'
  | 'uploading'
  | 'error'
  | 'failed'
  | 'pending'
  | string

export type VideoHostingItem = {
  id: string
  title: string
  original_name?: string | null
  description?: string | null
  tags?: string | null
  visibility?: string | null
  owner_id?: string | null
  created_at?: string | null
  updated_at?: string | null
  published_at?: string | null
  status?: VideoHostingStatus
  progress?: number | string | null
  stage?: string | null
  error?: string | null
  size_bytes?: number | string | null
  duration_sec?: number | string | null
  width?: number | string | null
  height?: number | string | null
  video_codec?: string | null
  audio_codec?: string | null
  source_bitrate?: number | string | null
  folder_id?: string | null
  hash_sha256?: string | null
  thumbnail_path?: string | null
  master_playlist_path?: string | null
  raw_deleted?: number | boolean | null
  deleted_at?: string | null
}

export type VideoHostingVideosResponse = {
  ok: boolean
  total: number
  videos: VideoHostingItem[]
  success?: boolean
  message?: string
}

export type AdminTab =
  | 'dashboard'
  | 'analytics'
  | 'add'
  | 'manage'
  | 'requests'
  | 'users'
  | 'notifications'
  | 'pending_users'
  | 'messages'
  | 'comments'
  | 'reviews'
  | 'pages'
  | 'video_hosting'



  