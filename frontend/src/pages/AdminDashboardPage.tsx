import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  API_BASE_URL,
  adminFetch,
  adminMutation,
} from '../components/admin/adminApi'
import AdminToastStack from '../components/admin/AdminToastStack'
import AdminConfirmModal from '../components/admin/AdminConfirmModal'
import AdminSidebar from '../components/admin/AdminSidebar'
import AdminTopbar from '../components/admin/AdminTopbar'
import AddContentTab from '../components/admin/AddContentTab'
import EditMovieModal from '../components/admin/EditMovieModal'
import EditSeriesModal from '../components/admin/EditSeriesModal'
import UsersTab from '../components/admin/UsersTab'
import NotificationsTab from '../components/admin/NotificationsTab'
import PendingUsersTab from '../components/admin/PendingUsersTab'
import MessagesTab from '../components/admin/MessagesTab'
import PagesTab from '../components/admin/PagesTab'
import AnalyticsTab from '../components/admin/AnalyticsTab'
import VideoHostingTab from '../components/admin/VideoHostingTab'
import type {
  AddMovieForm,
  AddSeriesEpisodeForm,
  AddSeriesForm,
  AddSeriesSeasonForm,
  AdminContentResponse,
  AdminMeResponse,
  AdminStats,
  AdminTab,
  AdminToast,
  AdminUser,
  CompleteRequestResponse,
  ConfirmDialog,
  DeleteRequestResponse,
  EditMovieForm,
  EditMovieResponse,
  EditSeriesEpisodeForm,
  EditSeriesForm,
  EditSeriesResponse,
  EditSeriesSeasonForm,
  ManagedContentItem,
  MovieDetailResponse,
  MovieRequestItem,
  SeriesDetailResponse,
  TmdbFetchResponse,
} from '../components/admin/adminTypes'
import './AdminDashboardPage.css'

const POSTER_FALLBACK =
  'https://placehold.co/300x450/f4f4f5/a1a1aa?text=No+Image'

const emptyAddMovieForm: AddMovieForm = {
  tmdb_id: '',
  title: '',
  description: '',
  genres: '',
  rating: '',
  poster_url: '',
  backdrop_url: '',
  preview_url: '',
  actors: '',
  actors_json: '',
  director: '',
  release_date: '',
  video_source_type: 'iframe',
  movie_embed_code: '',
  hosted_video_id: '',
  download_url: '',
  thumbnail: null,
}

function createClientId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createEmptySeriesEpisode(episodeNumber = 1): AddSeriesEpisodeForm {
  return {
    client_id: createClientId(),
    episode_number: String(episodeNumber),
    title: '',
    description: '',
    release_date: '',
    video_source_type: 'iframe',
    embed_code: '',
    hosted_video_id: '',
    download_url: '',
  }
}

function createEmptySeriesSeason(seasonNumber = 1): AddSeriesSeasonForm {
  return {
    client_id: createClientId(),
    season_number: String(seasonNumber),
    title: '',
    episodes: [createEmptySeriesEpisode(1)],
  }
}

function createEmptyAddSeriesForm(): AddSeriesForm {
  return {
    tmdb_id: '',
    title: '',
    description: '',
    genres: '',
    rating: '',
    poster_url: '',
    backdrop_url: '',
    preview_url: '',
    actors: '',
    actors_json: '',
    director: '',
    release_date: '',
    download_url: '',
    seasons: [createEmptySeriesSeason(1)],
  }
}

function createEmptyEditSeriesEpisode(
  episodeNumber = 1
): EditSeriesEpisodeForm {
  return {
    client_id: createClientId(),
    id: '',
    number: String(episodeNumber),
    title: '',
    embed_code: '',
    video_source_type: 'iframe',
    hosted_video_id: '',
  }
}

function createEmptyEditSeriesSeason(seasonNumber = 1): EditSeriesSeasonForm {
  return {
    client_id: createClientId(),
    id: '',
    title: `Season ${seasonNumber}`,
    episodes: [createEmptyEditSeriesEpisode(1)],
  }
}

const navGroups: {
  label?: string
  items: {
    tab: AdminTab
    label: string
    icon: string
    badgeKey?: keyof AdminStats
  }[]
}[] = [
  {
    items: [
      {
        tab: 'dashboard',
        label: 'Dashboard',
        icon: 'bi-grid-1x2-fill',
      },
      {
        tab: 'analytics',
        label: 'Analytics',
        icon: 'bi-bar-chart-fill',
      },
    ],
  },
  {
    label: 'Content',
    items: [
      {
        tab: 'add',
        label: 'Add Content',
        icon: 'bi-plus-circle-fill',
      },
      {
        tab: 'manage',
        label: 'Library',
        icon: 'bi-film',
      },
      {
        tab: 'video_hosting',
        label: 'Video Hosting',
        icon: 'bi-cloud-upload-fill',
      },
      {
        tab: 'requests',
        label: 'Requests',
        icon: 'bi-envelope-open-fill',
        badgeKey: 'pendingRequests',
      },
    ],
  },
  {
    label: 'Users',
    items: [
      {
        tab: 'users',
        label: 'User Management',
        icon: 'bi-people-fill',
      },
      {
        tab: 'notifications',
        label: 'Notifications',
        icon: 'bi-bell-fill',
      },
      {
        tab: 'pending_users',
        label: 'Pending Users',
        icon: 'bi-person-plus-fill',
        badgeKey: 'pendingUsers',
      },
      {
        tab: 'messages',
        label: 'Messages',
        icon: 'bi-chat-left-text-fill',
        badgeKey: 'totalNewMessages',
      },
    ],
  },
  {
    label: 'Moderation',
    items: [
      {
        tab: 'comments',
        label: 'Comments',
        icon: 'bi-chat-dots-fill',
      },
      {
        tab: 'reviews',
        label: 'Reviews',
        icon: 'bi-star-fill',
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        tab: 'pages',
        label: 'Pages',
        icon: 'bi-file-earmark-text-fill',
      },
    ],
  },
]

function formatTabTitle(tab: AdminTab) {
  if (tab === 'dashboard') return 'Overview'

  return tab
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getContentType(item: ManagedContentItem) {
  return item.content_type || item.type || 'movie'
}

function getPoster(item: ManagedContentItem) {
  if (!item) return POSTER_FALLBACK

  const rawPoster =
    item.display_thumbnail ||
    item.thumbnail_display ||
    item.poster_display ||
    item.poster_url ||
    ''

  if (!rawPoster) return POSTER_FALLBACK

  if (
    rawPoster.startsWith('http://') ||
    rawPoster.startsWith('https://') ||
    rawPoster.startsWith('data:') ||
    rawPoster.startsWith('blob:')
  ) {
    return rawPoster
  }

  if (rawPoster.startsWith('/')) {
    return `${API_BASE_URL}${rawPoster}`
  }

  return rawPoster
}

function getRequesterName(requestItem: MovieRequestItem) {
  return (
    requestItem.requested_by ||
    requestItem.username ||
    requestItem.user_username ||
    requestItem.requester?.username ||
    requestItem.user?.username ||
    requestItem.email ||
    requestItem.user_email ||
    requestItem.requester?.email ||
    requestItem.user?.email ||
    (requestItem.user_id ? `User #${requestItem.user_id}` : 'Guest / Unknown')
  )
}

function AdminDashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { adminKey } = useParams()

  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)

  const [contentSearch, setContentSearch] = useState('')

  const [stats, setStats] = useState<AdminStats>({
    totalMovies: 0,
    totalSeries: 0,
    pendingRequests: 0,
    totalUsers: 0,
    pendingUsers: 0,
    totalNewMessages: 0,
  })

  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(false)

  const [managedContent, setManagedContent] = useState<ManagedContentItem[]>([])
  const [contentPage, setContentPage] = useState(1)
  const [contentHasNext, setContentHasNext] = useState(false)
  const [contentTotal, setContentTotal] = useState(0)
  const [contentLoading, setContentLoading] = useState(false)
  const [contentError, setContentError] = useState(false)
  const [deletingContentKey, setDeletingContentKey] = useState<string | null>(
    null
  )

  const [movieRequests, setMovieRequests] = useState<MovieRequestItem[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestsError, setRequestsError] = useState(false)
  const [actioningRequestId, setActioningRequestId] = useState<number | null>(
    null
  )

  const [toasts, setToasts] = useState<AdminToast[]>([])

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    danger: false,
    onConfirm: null,
  })

  const [addContentType, setAddContentType] = useState<'movie' | 'series'>(
    'movie'
  )

  const [tmdbTitleLookup, setTmdbTitleLookup] = useState('')
  const [tmdbIdLookup, setTmdbIdLookup] = useState('')
  const [tmdbLoading, setTmdbLoading] = useState(false)
  const [addMovieSaving, setAddMovieSaving] = useState(false)
  const [addMovieForm, setAddMovieForm] =
    useState<AddMovieForm>(emptyAddMovieForm)

  const [seriesTmdbTitleLookup, setSeriesTmdbTitleLookup] = useState('')
  const [seriesTmdbIdLookup, setSeriesTmdbIdLookup] = useState('')
  const [seriesTmdbLoading, setSeriesTmdbLoading] = useState(false)
  const [addSeriesSaving, setAddSeriesSaving] = useState(false)
  const [addSeriesForm, setAddSeriesForm] = useState<AddSeriesForm>(() =>
    createEmptyAddSeriesForm()
  )

  const [editMovieOpen, setEditMovieOpen] = useState(false)
  const [editMovieLoading, setEditMovieLoading] = useState(false)
  const [editMovieSaving, setEditMovieSaving] = useState(false)
  const [editMovieForm, setEditMovieForm] = useState<EditMovieForm | null>(null)

  const [editSeriesOpen, setEditSeriesOpen] = useState(false)
  const [editSeriesLoading, setEditSeriesLoading] = useState(false)
  const [editSeriesSaving, setEditSeriesSaving] = useState(false)
  const [editSeriesForm, setEditSeriesForm] =
    useState<EditSeriesForm | null>(null)

  const avatarLetter = useMemo(() => {
    const name = adminUser?.display_name || adminUser?.username || 'Admin'
    return name.charAt(0).toUpperCase()
  }, [adminUser])


  const dashboardTotalContent = stats.totalMovies + stats.totalSeries
  const dashboardMovieShare = dashboardTotalContent
    ? Math.round((stats.totalMovies / dashboardTotalContent) * 100)
    : 0
  const dashboardSeriesShare = dashboardTotalContent
    ? 100 - dashboardMovieShare
    : 0
  const dashboardOperationalMax = Math.max(
    stats.pendingRequests,
    stats.pendingUsers,
    stats.totalNewMessages,
    1
  )
  const dashboardRecentContent = managedContent.slice(0, 5)
  const dashboardRecentRequests = movieRequests.slice(0, 5)

  const showToast = (type: AdminToast['type'], message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)

    setToasts((currentToasts) => [
      ...currentToasts,
      {
        id,
        type,
        message,
      },
    ])

    window.setTimeout(() => {
      setToasts((currentToasts) =>
        currentToasts.filter((toast) => toast.id !== id)
      )
    }, 3800)
  }

  const closeConfirmDialog = () => {
    setConfirmDialog({
      open: false,
      title: '',
      message: '',
      confirmText: 'Confirm',
      danger: false,
      onConfirm: null,
    })
  }

  const openConfirmDialog = (dialog: Omit<ConfirmDialog, 'open'>) => {
    setConfirmDialog({
      ...dialog,
      open: true,
    })
  }

  const redirectToAdminLogin = () => {
    navigate(`/admin/login?next=${encodeURIComponent(location.pathname)}`, {
      replace: true,
    })
  }

  const loadStats = () => {
    setStatsLoading(true)
    setStatsError(false)

    adminFetch<AdminStats>('/api/stats')
      .then((response) => {
        setStats(response)
      })
      .catch(() => {
        setStatsError(true)
      })
      .finally(() => {
        setStatsLoading(false)
      })
  }

  const loadManagedContent = async (
    page = 1,
    append = false,
    searchOverride?: string
  ) => {
    setContentLoading(true)
    setContentError(false)

    const activeSearch =
      typeof searchOverride === 'string' ? searchOverride : contentSearch

    const params = new URLSearchParams()
    params.set('page', String(page))

    if (activeSearch.trim()) {
      params.set('search', activeSearch.trim())
    }

    try {
      const response = await adminFetch<AdminContentResponse>(
        `/api/content?${params.toString()}`
      )

      setManagedContent((currentItems) =>
        append
          ? [...currentItems, ...(response.items || [])]
          : response.items || []
      )

      setContentPage(page)
      setContentHasNext(Boolean(response.has_next))
      setContentTotal(response.total_items || 0)
    } catch {
      setContentError(true)
    } finally {
      setContentLoading(false)
    }
  }

  const loadRequests = async () => {
    setRequestsLoading(true)
    setRequestsError(false)

    try {
      const response = await adminFetch<MovieRequestItem[]>('/api/requests')
      setMovieRequests(response || [])
    } catch {
      setRequestsError(true)
    } finally {
      setRequestsLoading(false)
    }
  }

  const updateAddMovieField = <Key extends keyof AddMovieForm>(
    key: Key,
    value: AddMovieForm[Key]
  ) => {
    setAddMovieForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }))
  }

  const updateAddSeriesField = <Key extends keyof AddSeriesForm>(
    key: Key,
    value: AddSeriesForm[Key]
  ) => {
    setAddSeriesForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }))
  }

  const updateSeriesSeasonField = <Key extends keyof AddSeriesSeasonForm>(
    seasonClientId: string,
    key: Key,
    value: AddSeriesSeasonForm[Key]
  ) => {
    setAddSeriesForm((currentForm) => ({
      ...currentForm,
      seasons: currentForm.seasons.map((season) =>
        season.client_id === seasonClientId
          ? {
              ...season,
              [key]: value,
            }
          : season
      ),
    }))
  }

  const updateSeriesEpisodeField = <Key extends keyof AddSeriesEpisodeForm>(
    seasonClientId: string,
    episodeClientId: string,
    key: Key,
    value: AddSeriesEpisodeForm[Key]
  ) => {
    setAddSeriesForm((currentForm) => ({
      ...currentForm,
      seasons: currentForm.seasons.map((season) =>
        season.client_id === seasonClientId
          ? {
              ...season,
              episodes: season.episodes.map((episode) =>
                episode.client_id === episodeClientId
                  ? {
                      ...episode,
                      [key]: value,
                    }
                  : episode
              ),
            }
          : season
      ),
    }))
  }

  const updateEditMovieField = <Key extends keyof EditMovieForm>(
    key: Key,
    value: EditMovieForm[Key]
  ) => {
    setEditMovieForm((currentForm) =>
      currentForm
        ? {
            ...currentForm,
            [key]: value,
          }
        : currentForm
    )
  }

  const updateEditSeriesField = <Key extends keyof EditSeriesForm>(
    key: Key,
    value: EditSeriesForm[Key]
  ) => {
    setEditSeriesForm((currentForm) =>
      currentForm
        ? {
            ...currentForm,
            [key]: value,
          }
        : currentForm
    )
  }

  const updateEditSeriesSeasonField = <
    Key extends keyof EditSeriesSeasonForm,
  >(
    seasonClientId: string,
    key: Key,
    value: EditSeriesSeasonForm[Key]
  ) => {
    setEditSeriesForm((currentForm) =>
      currentForm
        ? {
            ...currentForm,
            seasons: currentForm.seasons.map((season) =>
              season.client_id === seasonClientId
                ? {
                    ...season,
                    [key]: value,
                  }
                : season
            ),
          }
        : currentForm
    )
  }

  const updateEditSeriesEpisodeField = <
    Key extends keyof EditSeriesEpisodeForm,
  >(
    seasonClientId: string,
    episodeClientId: string,
    key: Key,
    value: EditSeriesEpisodeForm[Key]
  ) => {
    setEditSeriesForm((currentForm) =>
      currentForm
        ? {
            ...currentForm,
            seasons: currentForm.seasons.map((season) =>
              season.client_id === seasonClientId
                ? {
                    ...season,
                    episodes: season.episodes.map((episode) =>
                      episode.client_id === episodeClientId
                        ? {
                            ...episode,
                            [key]: value,
                          }
                        : episode
                    ),
                  }
                : season
            ),
          }
        : currentForm
    )
  }

  const addSeriesSeason = () => {
    setAddSeriesForm((currentForm) => ({
      ...currentForm,
      seasons: [
        ...currentForm.seasons,
        createEmptySeriesSeason(currentForm.seasons.length + 1),
      ],
    }))
  }

  const removeSeriesSeason = (seasonClientId: string) => {
    setAddSeriesForm((currentForm) => ({
      ...currentForm,
      seasons:
        currentForm.seasons.length > 1
          ? currentForm.seasons.filter(
              (season) => season.client_id !== seasonClientId
            )
          : currentForm.seasons,
    }))
  }

  const addSeriesEpisode = (seasonClientId: string) => {
    setAddSeriesForm((currentForm) => ({
      ...currentForm,
      seasons: currentForm.seasons.map((season) =>
        season.client_id === seasonClientId
          ? {
              ...season,
              episodes: [
                ...season.episodes,
                createEmptySeriesEpisode(season.episodes.length + 1),
              ],
            }
          : season
      ),
    }))
  }

  const removeSeriesEpisode = (
    seasonClientId: string,
    episodeClientId: string
  ) => {
    setAddSeriesForm((currentForm) => ({
      ...currentForm,
      seasons: currentForm.seasons.map((season) =>
        season.client_id === seasonClientId
          ? {
              ...season,
              episodes:
                season.episodes.length > 1
                  ? season.episodes.filter(
                      (episode) => episode.client_id !== episodeClientId
                    )
                  : season.episodes,
            }
          : season
      ),
    }))
  }

  const addEditSeriesSeason = () => {
    setEditSeriesForm((currentForm) =>
      currentForm
        ? {
            ...currentForm,
            seasons: [
              ...currentForm.seasons,
              createEmptyEditSeriesSeason(currentForm.seasons.length + 1),
            ],
          }
        : currentForm
    )
  }

  const removeEditSeriesSeason = (seasonClientId: string) => {
    setEditSeriesForm((currentForm) =>
      currentForm
        ? {
            ...currentForm,
            seasons:
              currentForm.seasons.length > 1
                ? currentForm.seasons.filter(
                    (season) => season.client_id !== seasonClientId
                  )
                : currentForm.seasons,
          }
        : currentForm
    )
  }

  const addEditSeriesEpisode = (seasonClientId: string) => {
    setEditSeriesForm((currentForm) =>
      currentForm
        ? {
            ...currentForm,
            seasons: currentForm.seasons.map((season) =>
              season.client_id === seasonClientId
                ? {
                    ...season,
                    episodes: [
                      ...season.episodes,
                      createEmptyEditSeriesEpisode(season.episodes.length + 1),
                    ],
                  }
                : season
            ),
          }
        : currentForm
    )
  }

  const removeEditSeriesEpisode = (
    seasonClientId: string,
    episodeClientId: string
  ) => {
    setEditSeriesForm((currentForm) =>
      currentForm
        ? {
            ...currentForm,
            seasons: currentForm.seasons.map((season) =>
              season.client_id === seasonClientId
                ? {
                    ...season,
                    episodes:
                      season.episodes.length > 1
                        ? season.episodes.filter(
                            (episode) =>
                              episode.client_id !== episodeClientId
                          )
                        : season.episodes,
                  }
                : season
            ),
          }
        : currentForm
    )
  }

  const fetchMovieTmdb = async () => {
    const titleQuery = tmdbTitleLookup.trim()
    const idQuery = tmdbIdLookup.trim()

    if (!titleQuery && !idQuery) {
      showToast('error', 'Enter a movie title or TMDB ID first.')
      return
    }

    setTmdbLoading(true)

    try {
      const params = new URLSearchParams()
      params.set('type', 'movie')

      if (idQuery) {
        params.set('tmdb_id', idQuery)
      } else {
        params.set('title', titleQuery)
      }

      const data = await adminFetch<TmdbFetchResponse>(
        `/admin/fetch_tmdb_data?${params.toString()}`
      )

      if (data.error || data.not_found) {
        throw new Error(data.error || data.message || 'Movie not found on TMDB.')
      }

      const actors = data.actors || []

      setAddMovieForm((currentForm) => ({
        ...currentForm,
        tmdb_id: data.tmdb_id ? String(data.tmdb_id) : currentForm.tmdb_id,
        title: data.title || currentForm.title,
        description: data.overview || currentForm.description,
        genres: Array.isArray(data.genres)
          ? data.genres.join(', ')
          : currentForm.genres,
        rating:
          data.rating !== null && data.rating !== undefined
            ? String(data.rating)
            : currentForm.rating,
        poster_url: data.poster_url || currentForm.poster_url,
        backdrop_url: data.backdrop_url || currentForm.backdrop_url,
        actors: actors.map((actor) => actor.name).filter(Boolean).join(', '),
        actors_json:
          actors.length > 0 ? JSON.stringify(actors) : currentForm.actors_json,
        director: data.director || currentForm.director,
        release_date: data.release_date || currentForm.release_date,
      }))

      showToast('success', 'TMDB data fetched successfully.')
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Could not fetch TMDB data.'
      )
    } finally {
      setTmdbLoading(false)
    }
  }

  const fetchSeriesTmdb = async () => {
    const titleQuery = seriesTmdbTitleLookup.trim()
    const idQuery = seriesTmdbIdLookup.trim()

    if (!titleQuery && !idQuery) {
      showToast('error', 'Enter a series title or TMDB ID first.')
      return
    }

    setSeriesTmdbLoading(true)

    try {
      const params = new URLSearchParams()
      params.set('type', 'series')

      if (idQuery) {
        params.set('tmdb_id', idQuery)
      } else {
        params.set('title', titleQuery)
      }

      const data = await adminFetch<TmdbFetchResponse>(
        `/admin/fetch_tmdb_data?${params.toString()}`
      )

      if (data.error || data.not_found) {
        throw new Error(data.error || data.message || 'Series not found on TMDB.')
      }

      const actors = data.actors || []

      setAddSeriesForm((currentForm) => ({
        ...currentForm,
        tmdb_id: data.tmdb_id ? String(data.tmdb_id) : currentForm.tmdb_id,
        title: data.title || currentForm.title,
        description: data.overview || currentForm.description,
        genres: Array.isArray(data.genres)
          ? data.genres.join(', ')
          : currentForm.genres,
        rating:
          data.rating !== null && data.rating !== undefined
            ? String(data.rating)
            : currentForm.rating,
        poster_url: data.poster_url || currentForm.poster_url,
        backdrop_url: data.backdrop_url || currentForm.backdrop_url,
        actors: actors.map((actor) => actor.name).filter(Boolean).join(', '),
        actors_json:
          actors.length > 0 ? JSON.stringify(actors) : currentForm.actors_json,
        director: data.director || currentForm.director,
        release_date: data.release_date || currentForm.release_date,
      }))

      showToast('success', 'TMDB series data fetched successfully.')
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Could not fetch series data.'
      )
    } finally {
      setSeriesTmdbLoading(false)
    }
  }

  const openEditMovie = async (item: ManagedContentItem) => {
    const type = getContentType(item)

    if (type !== 'movie') return

    setEditMovieOpen(true)
    setEditMovieLoading(true)
    setEditMovieForm(null)

    try {
      const response = await adminFetch<MovieDetailResponse>(
        `/api/movie/${encodeURIComponent(item.id)}`
      )

      if (!response.success || !response.item) {
        throw new Error('Could not load movie details.')
      }

      const movie = response.item
      const castList = response.cast || movie.cast || []
      const actorsText = Array.isArray(castList)
        ? castList
            .map((actor) => actor.name)
            .filter(Boolean)
            .join(', ')
        : ''

      const sourceType =
        movie.video_source_type === 'hosted' ? 'hosted' : 'iframe'

      setEditMovieForm({
        id: movie.id,
        tmdb_id: movie.tmdb_id ? String(movie.tmdb_id) : '',
        title: movie.title || '',
        description: movie.description || '',
        genres:
          movie.genre ||
          (Array.isArray(movie.genre_list) ? movie.genre_list.join(', ') : ''),
        rating:
          movie.rating !== null && movie.rating !== undefined
            ? String(movie.rating)
            : '',
        poster_url: movie.poster_url || movie.poster_display || '',
        backdrop_url: movie.backdrop_url || movie.backdrop_display || '',
        preview_url: movie.preview_url || '',
        actors: actorsText,
        director: movie.director || response.director || '',
        release_date: movie.release_date || '',
        video_source_type: sourceType,
        embed_code: movie.embed_code || '',
        hosted_video_id: movie.hosted_video_id || '',
        download_url: movie.download_url || '',
        thumbnail: null,
      })
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Could not load movie details.'
      )
      setEditMovieOpen(false)
    } finally {
      setEditMovieLoading(false)
    }
  }

  const closeEditMovie = () => {
    if (editMovieSaving) return

    setEditMovieOpen(false)
    setEditMovieForm(null)
    setEditMovieLoading(false)
  }

  const submitEditMovie = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!editMovieForm) return

    if (!editMovieForm.title.trim()) {
      showToast('error', 'Movie title is required.')
      return
    }

    if (
      editMovieForm.video_source_type === 'iframe' &&
      !editMovieForm.embed_code.trim()
    ) {
      showToast('error', 'Embed code is required for iframe playback.')
      return
    }

    if (
      editMovieForm.video_source_type === 'hosted' &&
      !editMovieForm.hosted_video_id.trim()
    ) {
      showToast('error', 'Hosted video ID is required for hosted playback.')
      return
    }

    setEditMovieSaving(true)

    const formData = new FormData()
    formData.append('tmdb_id', editMovieForm.tmdb_id)
    formData.append('title', editMovieForm.title)
    formData.append('description', editMovieForm.description)
    formData.append('genres', editMovieForm.genres)
    formData.append('rating', editMovieForm.rating)
    formData.append('poster_url', editMovieForm.poster_url)
    formData.append('backdrop_url', editMovieForm.backdrop_url)
    formData.append('preview_url', editMovieForm.preview_url)
    formData.append('actors', editMovieForm.actors)
    formData.append('director', editMovieForm.director)
    formData.append('release_date', editMovieForm.release_date)
    formData.append('video_source_type', editMovieForm.video_source_type)
    formData.append('embed_code', editMovieForm.embed_code)
    formData.append('hosted_video_id', editMovieForm.hosted_video_id)
    formData.append('download_url', editMovieForm.download_url)

    if (editMovieForm.thumbnail) {
      formData.append('thumbnail', editMovieForm.thumbnail)
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/movie/${encodeURIComponent(editMovieForm.id)}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
          body: formData,
        }
      )

      const data = (await response.json().catch(() => null)) as
        | EditMovieResponse
        | null

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || 'Could not update movie.')
      }

      showToast('success', data?.message || 'Movie updated successfully.')

      setEditMovieOpen(false)
      setEditMovieForm(null)

      loadManagedContent(contentPage || 1, false)
      loadStats()
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Could not update movie.'
      )
    } finally {
      setEditMovieSaving(false)
    }
  }

  const openEditSeries = async (item: ManagedContentItem) => {
    const type = getContentType(item)

    if (type !== 'series') return

    setEditSeriesOpen(true)
    setEditSeriesLoading(true)
    setEditSeriesForm(null)

    try {
      const response = await adminFetch<SeriesDetailResponse>(
        `/api/series/${encodeURIComponent(item.id)}`
      )

      if (!response.success || !response.item) {
        throw new Error('Could not load series details.')
      }

      const series = response.item
      const existingSeasons = series.seasons || []

      setEditSeriesForm({
        id: series.id,
        title: series.title || '',
        description: series.description || '',
        rating:
          series.rating !== null && series.rating !== undefined
            ? String(series.rating)
            : '',
        preview_url: series.preview_url || '',
        download_url: series.download_url || '',
        seasons:
          existingSeasons.length > 0
            ? existingSeasons.map((season, seasonIndex) => ({
                client_id: createClientId(),
                id:
                  season.id !== null && season.id !== undefined
                    ? String(season.id)
                    : '',
                title: season.title || `Season ${seasonIndex + 1}`,
                episodes:
                  season.episodes && season.episodes.length > 0
                    ? season.episodes.map((episode, episodeIndex) => ({
                        client_id: createClientId(),
                        id:
                          episode.id !== null && episode.id !== undefined
                            ? String(episode.id)
                            : '',
                        number:
                          episode.number !== null &&
                          episode.number !== undefined
                            ? String(episode.number)
                            : String(episodeIndex + 1),
                        title: episode.title || `Episode ${episodeIndex + 1}`,
                        embed_code: episode.embed_code || '',
                        video_source_type:
                          episode.video_source_type === 'hosted'
                            ? 'hosted'
                            : 'iframe',
                        hosted_video_id: episode.hosted_video_id || '',
                      }))
                    : [createEmptyEditSeriesEpisode(1)],
              }))
            : [createEmptyEditSeriesSeason(1)],
      })
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Could not load series details.'
      )
      setEditSeriesOpen(false)
    } finally {
      setEditSeriesLoading(false)
    }
  }

  const closeEditSeries = () => {
    if (editSeriesSaving) return

    setEditSeriesOpen(false)
    setEditSeriesLoading(false)
    setEditSeriesForm(null)
  }

  const submitEditSeries = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!editSeriesForm) return

    if (!editSeriesForm.title.trim()) {
      showToast('error', 'Series title is required.')
      return
    }

    if (editSeriesForm.seasons.length === 0) {
      showToast('error', 'At least one season is required.')
      return
    }

    for (const season of editSeriesForm.seasons) {
      if (season.episodes.length === 0) {
        showToast(
          'error',
          `${season.title || 'Season'} needs at least one episode.`
        )
        return
      }

      for (const episode of season.episodes) {
        if (!episode.title.trim()) {
          showToast('error', 'Every episode needs a title.')
          return
        }

        if (
          episode.video_source_type === 'iframe' &&
          !episode.embed_code.trim()
        ) {
          showToast(
            'error',
            `${episode.title || 'Episode'} needs embed code for iframe playback.`
          )
          return
        }

        if (
          episode.video_source_type === 'hosted' &&
          !episode.hosted_video_id.trim()
        ) {
          showToast(
            'error',
            `${episode.title || 'Episode'} needs hosted video ID.`
          )
          return
        }
      }
    }

    setEditSeriesSaving(true)

    const payload = {
      title: editSeriesForm.title,
      description: editSeriesForm.description,
      rating: editSeriesForm.rating,
      preview_url: editSeriesForm.preview_url,
      download_url: editSeriesForm.download_url,
      seasons: editSeriesForm.seasons.map((season) => ({
        ...(season.id ? { id: season.id } : {}),
        title: season.title,
        episodes: season.episodes.map((episode) => ({
          ...(episode.id ? { id: episode.id } : {}),
          number: Number(episode.number) || 1,
          title: episode.title,
          embed_code: episode.embed_code,
          video_source_type: episode.video_source_type,
          hosted_video_id: episode.hosted_video_id,
        })),
      })),
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/edit/series/${encodeURIComponent(
          editSeriesForm.id
        )}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      const data = (await response.json().catch(() => null)) as
        | EditSeriesResponse
        | null

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || 'Could not update series.')
      }

      showToast('success', data?.message || 'Series updated successfully.')

      setEditSeriesOpen(false)
      setEditSeriesForm(null)

      loadManagedContent(contentPage || 1, false)
      loadStats()
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Could not update series.'
      )
    } finally {
      setEditSeriesSaving(false)
    }
  }

  const submitAddMovie = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!addMovieForm.title.trim()) {
      showToast('error', 'Movie title is required.')
      return
    }

    if (
      addMovieForm.video_source_type === 'iframe' &&
      !addMovieForm.movie_embed_code.trim()
    ) {
      showToast('error', 'Embed code is required for iframe playback.')
      return
    }

    if (
      addMovieForm.video_source_type === 'hosted' &&
      !addMovieForm.hosted_video_id.trim()
    ) {
      showToast('error', 'Hosted video ID is required for hosted playback.')
      return
    }

    setAddMovieSaving(true)

    const formData = new FormData()
    formData.append('content_type', 'movie')
    formData.append('tmdb_id', addMovieForm.tmdb_id)
    formData.append('title', addMovieForm.title)
    formData.append('description', addMovieForm.description)
    formData.append('genres', addMovieForm.genres)
    formData.append('rating', addMovieForm.rating)
    formData.append('poster_url', addMovieForm.poster_url)
    formData.append('backdrop_url', addMovieForm.backdrop_url)
    formData.append('preview_url', addMovieForm.preview_url)
    formData.append('actors', addMovieForm.actors)
    formData.append('actors_json', addMovieForm.actors_json)
    formData.append('director', addMovieForm.director)
    formData.append('release_date', addMovieForm.release_date)
    formData.append('video_source_type', addMovieForm.video_source_type)
    formData.append('movie_embed_code', addMovieForm.movie_embed_code)
    formData.append('hosted_video_id', addMovieForm.hosted_video_id)
    formData.append('download_url', addMovieForm.download_url)

    if (addMovieForm.thumbnail) {
      formData.append('thumbnail', addMovieForm.thumbnail)
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/add_content`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || 'Could not add movie.')
      }

      showToast('success', data?.message || 'Movie added successfully.')
      setAddMovieForm(emptyAddMovieForm)
      setTmdbTitleLookup('')
      setTmdbIdLookup('')
      setManagedContent([])
      loadStats()
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Could not add movie.'
      )
    } finally {
      setAddMovieSaving(false)
    }
  }

  const submitAddSeries = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!addSeriesForm.title.trim()) {
      showToast('error', 'Series title is required.')
      return
    }

    if (addSeriesForm.seasons.length === 0) {
      showToast('error', 'At least one season is required.')
      return
    }

    for (const season of addSeriesForm.seasons) {
      if (season.episodes.length === 0) {
        showToast(
          'error',
          `Season ${season.season_number || '?'} needs at least one episode.`
        )
        return
      }

      for (const episode of season.episodes) {
        if (!episode.title.trim()) {
          showToast(
            'error',
            `Episode ${episode.episode_number || '?'} in season ${
              season.season_number || '?'
            } needs a title.`
          )
          return
        }

        if (
          episode.video_source_type === 'iframe' &&
          !episode.embed_code.trim()
        ) {
          showToast(
            'error',
            `Episode ${episode.episode_number || '?'} needs embed code.`
          )
          return
        }

        if (
          episode.video_source_type === 'hosted' &&
          !episode.hosted_video_id.trim()
        ) {
          showToast(
            'error',
            `Episode ${episode.episode_number || '?'} needs hosted video ID.`
          )
          return
        }
      }
    }

    setAddSeriesSaving(true)

    const payload = {
      content_type: 'series',
      tmdb_id: addSeriesForm.tmdb_id,
      title: addSeriesForm.title,
      description: addSeriesForm.description,
      genres: addSeriesForm.genres,
      rating: addSeriesForm.rating,
      poster_url: addSeriesForm.poster_url,
      backdrop_url: addSeriesForm.backdrop_url,
      preview_url: addSeriesForm.preview_url,
      actors: addSeriesForm.actors,
      actors_json: addSeriesForm.actors_json,
      director: addSeriesForm.director,
      release_date: addSeriesForm.release_date,
      download_url: addSeriesForm.download_url,
      seasons: addSeriesForm.seasons.map((season) => ({
        season_number: Number(season.season_number) || 1,
        title: season.title,
        episodes: season.episodes.map((episode) => ({
          episode_number: Number(episode.episode_number) || 1,
          title: episode.title,
          description: episode.description,
          release_date: episode.release_date,
          video_source_type: episode.video_source_type,
          embed_code: episode.embed_code,
          hosted_video_id: episode.hosted_video_id,
          download_url: episode.download_url,
        })),
      })),
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/add_content`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || 'Could not add series.')
      }

      showToast('success', data?.message || 'Series added successfully.')
      setAddSeriesForm(createEmptyAddSeriesForm())
      setSeriesTmdbTitleLookup('')
      setSeriesTmdbIdLookup('')
      setManagedContent([])
      loadStats()
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Could not add series.'
      )
    } finally {
      setAddSeriesSaving(false)
    }
  }

  const deleteLibraryItem = async (item: ManagedContentItem) => {
    const type = getContentType(item)
    const contentKey = `${type}-${item.id}`

    setDeletingContentKey(contentKey)

    try {
      const response = await adminMutation<{
        success: boolean
        message?: string
      }>(`/delete/${type}/${encodeURIComponent(item.id)}`, 'DELETE')

      if (response.success === false) {
        throw new Error(response.message || `Could not delete ${type}.`)
      }

      setManagedContent((currentItems) =>
        currentItems.filter((contentItem) => {
          const currentType = getContentType(contentItem)
          return !(currentType === type && contentItem.id === item.id)
        })
      )

      setContentTotal((currentTotal) => Math.max(0, currentTotal - 1))

      showToast(
        'success',
        response.message ||
          `${type === 'series' ? 'Series' : 'Movie'} deleted successfully.`
      )

      loadStats()
    } catch (error) {
      showToast(
        'error',
        error instanceof Error
          ? error.message
          : `Could not delete ${type === 'series' ? 'series' : 'movie'}.`
      )
    } finally {
      setDeletingContentKey(null)
    }
  }

  const askDeleteLibraryItem = (item: ManagedContentItem) => {
    const type = getContentType(item)

    openConfirmDialog({
      title: `Delete this ${type === 'series' ? 'series' : 'movie'}?`,
      message: `This will permanently delete "${item.title}". This action cannot be undone.`,
      confirmText: `Delete ${type === 'series' ? 'Series' : 'Movie'}`,
      danger: true,
      onConfirm: () => {
        closeConfirmDialog()
        deleteLibraryItem(item)
      },
    })
  }

  const completeMovieRequest = async (requestId: number) => {
    setActioningRequestId(requestId)

    try {
      const response = await adminMutation<CompleteRequestResponse>(
        `/api/admin/requests/${requestId}/complete`,
        'POST'
      )

      setMovieRequests((currentRequests) =>
        currentRequests.map((requestItem) =>
          requestItem.id === requestId
            ? response.updated_request || {
                ...requestItem,
                status: 'Completed',
              }
            : requestItem
        )
      )

      showToast('success', 'Request marked as completed.')
      loadStats()
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Could not complete request.'
      )
    } finally {
      setActioningRequestId(null)
    }
  }

  const askCompleteMovieRequest = (requestItem: MovieRequestItem) => {
    openConfirmDialog({
      title: 'Mark request as completed?',
      message: `This will mark "${requestItem.title}" as completed.`,
      confirmText: 'Mark Completed',
      danger: false,
      onConfirm: () => {
        closeConfirmDialog()
        completeMovieRequest(requestItem.id)
      },
    })
  }

  const deleteMovieRequest = async (requestId: number) => {
    setActioningRequestId(requestId)

    try {
      await adminMutation<DeleteRequestResponse>(
        `/api/admin/requests/${requestId}/delete`,
        'POST'
      )

      setMovieRequests((currentRequests) =>
        currentRequests.filter((requestItem) => requestItem.id !== requestId)
      )

      showToast('success', 'Request deleted successfully.')
      loadStats()
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Could not delete request.'
      )
    } finally {
      setActioningRequestId(null)
    }
  }

  const askDeleteMovieRequest = (requestItem: MovieRequestItem) => {
    openConfirmDialog({
      title: 'Delete this request?',
      message: `This will permanently delete "${requestItem.title}". This action cannot be undone.`,
      confirmText: 'Delete Request',
      danger: true,
      onConfirm: () => {
        closeConfirmDialog()
        deleteMovieRequest(requestItem.id)
      },
    })
  }

  useEffect(() => {
    let alive = true

    const routeKey = encodeURIComponent(adminKey || '')

    adminFetch<AdminMeResponse>(`/api/admin/me?route_key=${routeKey}`)
      .then((response) => {
        if (!alive) return

        if (!response.authenticated || !response.is_admin) {
          redirectToAdminLogin()
          return
        }

        setAdminUser(response.user || null)
      })
      .catch(() => {
        if (!alive) return
        redirectToAdminLogin()
      })
      .finally(() => {
        if (alive) setCheckingAuth(false)
      })

    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey])

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    if (
      (currentTab === 'manage' || currentTab === 'dashboard') &&
      managedContent.length === 0
    ) {
      loadManagedContent(1, false)
    }

    if (
      (currentTab === 'requests' || currentTab === 'dashboard') &&
      movieRequests.length === 0
    ) {
      loadRequests()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab])

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/admin/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      })
    } finally {
      navigate('/', { replace: true })
    }
  }

  if (checkingAuth) {
    return (
      <div className="admin-boot-screen">
        <div className="admin-boot-card">
          <div className="admin-boot-spinner"></div>
          <span>Checking admin session...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`admin-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminToastStack
        toasts={toasts}
        onDismiss={(toastId) => {
          setToasts((currentToasts) =>
            currentToasts.filter((toast) => toast.id !== toastId)
          )
        }}
      />

      <AdminConfirmModal
        confirmDialog={confirmDialog}
        onCancel={closeConfirmDialog}
      />

      <EditMovieModal
        open={editMovieOpen}
        loading={editMovieLoading}
        saving={editMovieSaving}
        form={editMovieForm}
        onClose={closeEditMovie}
        onSubmit={submitEditMovie}
        onFieldChange={updateEditMovieField}
      />

      <EditSeriesModal
        open={editSeriesOpen}
        loading={editSeriesLoading}
        saving={editSeriesSaving}
        form={editSeriesForm}
        onClose={closeEditSeries}
        onSubmit={submitEditSeries}
        onFieldChange={updateEditSeriesField}
        onSeasonFieldChange={updateEditSeriesSeasonField}
        onEpisodeFieldChange={updateEditSeriesEpisodeField}
        onAddSeason={addEditSeriesSeason}
        onRemoveSeason={removeEditSeriesSeason}
        onAddEpisode={addEditSeriesEpisode}
        onRemoveEpisode={removeEditSeriesEpisode}
      />

      <AdminSidebar
        sidebarOpen={sidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        navGroups={navGroups}
        currentTab={currentTab}
        stats={stats}
        onTabChange={(tab) => {
          setCurrentTab(tab)
          setSidebarOpen(false)
        }}
        onToggleSidebarCollapsed={() => {
          setSidebarCollapsed((collapsed) => !collapsed)
        }}
      />

      {sidebarOpen && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        ></button>
      )}

      <main className="admin-main">
        <AdminTopbar
          title={formatTabTitle(currentTab)}
          avatarLetter={avatarLetter}
          adminUser={adminUser}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          onLogout={handleLogout}
        />

        <section className="admin-content">
          {currentTab === 'dashboard' && (
            <div className="admin-fade-up admin-overview-page">
              <div className="admin-page-header admin-overview-header">
                <div>
                  <h1>Overview</h1>
                  <p>Current library and account activity.</p>
                </div>

                <div className="admin-overview-date">
                  <i className="bi bi-calendar3"></i>
                  <span>
                    {new Intl.DateTimeFormat(undefined, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    }).format(new Date())}
                  </span>
                </div>
              </div>

              {statsError && (
                <div className="admin-alert-error">
                  Dashboard statistics are temporarily unavailable.
                </div>
              )}

              <div className="admin-stat-grid admin-overview-stat-grid">
                <article className="admin-stat-card tone-orange">
                  <div className="admin-stat-card-top">
                    <span className="admin-stat-label">Movies</span>
                    <span className="admin-stat-icon">
                      <i className="bi bi-film"></i>
                    </span>
                  </div>
                  <div className="admin-stat-val">
                    {statsLoading ? '—' : stats.totalMovies}
                  </div>
                  <div className="admin-stat-note">Library titles</div>
                </article>

                <article className="admin-stat-card tone-purple">
                  <div className="admin-stat-card-top">
                    <span className="admin-stat-label">Series</span>
                    <span className="admin-stat-icon">
                      <i className="bi bi-tv"></i>
                    </span>
                  </div>
                  <div className="admin-stat-val">
                    {statsLoading ? '—' : stats.totalSeries}
                  </div>
                  <div className="admin-stat-note">Shows in library</div>
                </article>

                <article className="admin-stat-card tone-blue">
                  <div className="admin-stat-card-top">
                    <span className="admin-stat-label">Users</span>
                    <span className="admin-stat-icon">
                      <i className="bi bi-people"></i>
                    </span>
                  </div>
                  <div className="admin-stat-val">
                    {statsLoading ? '—' : stats.totalUsers}
                  </div>
                  <div className="admin-stat-note">Registered accounts</div>
                </article>

                <article className="admin-stat-card tone-green">
                  <div className="admin-stat-card-top">
                    <span className="admin-stat-label">Open requests</span>
                    <span className="admin-stat-icon">
                      <i className="bi bi-inbox"></i>
                    </span>
                  </div>
                  <div className="admin-stat-val">
                    {statsLoading ? '—' : stats.pendingRequests}
                  </div>
                  <div className="admin-stat-note">Waiting for review</div>
                </article>
              </div>

              <div className="admin-overview-analytics-grid">
                <section className="admin-overview-panel admin-library-chart-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <h2>Library balance</h2>
                      <p>Movies and series currently available.</p>
                    </div>
                    <button
                      type="button"
                      className="admin-panel-link"
                      onClick={() => setCurrentTab('manage')}
                    >
                      Open library
                      <i className="bi bi-arrow-right"></i>
                    </button>
                  </div>

                  <div className="admin-library-chart-body">
                    <div
                      className="admin-donut-chart"
                      style={{
                        background: dashboardTotalContent
                          ? `conic-gradient(var(--admin-orange) 0 ${dashboardMovieShare}%, var(--admin-purple) ${dashboardMovieShare}% 100%)`
                          : undefined,
                      }}
                    >
                      <div>
                        <span>{dashboardTotalContent}</span>
                        <small>titles</small>
                      </div>
                    </div>

                    <div className="admin-chart-legend">
                      <div>
                        <span className="legend-dot movie"></span>
                        <span>Movies</span>
                        <em>{stats.totalMovies}</em>
                        <small>{dashboardMovieShare}%</small>
                      </div>
                      <div>
                        <span className="legend-dot series"></span>
                        <span>Series</span>
                        <em>{stats.totalSeries}</em>
                        <small>{dashboardSeriesShare}%</small>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="admin-overview-panel admin-operations-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <h2>Operational queue</h2>
                      <p>Items currently waiting for action.</p>
                    </div>
                  </div>

                  <div className="admin-horizontal-chart">
                    <button type="button" onClick={() => setCurrentTab('requests')}>
                      <span className="admin-horizontal-chart-label">
                        <i className="bi bi-inbox"></i>
                        Requests
                      </span>
                      <span className="admin-horizontal-chart-track">
                        <span
                          className="orange"
                          style={{
                            width: `${Math.max(
                              stats.pendingRequests
                                ? (stats.pendingRequests / dashboardOperationalMax) * 100
                                : 0,
                              stats.pendingRequests ? 8 : 0
                            )}%`,
                          }}
                        ></span>
                      </span>
                      <em>{stats.pendingRequests}</em>
                    </button>

                    <button type="button" onClick={() => setCurrentTab('pending_users')}>
                      <span className="admin-horizontal-chart-label">
                        <i className="bi bi-person-plus"></i>
                        Pending users
                      </span>
                      <span className="admin-horizontal-chart-track">
                        <span
                          className="blue"
                          style={{
                            width: `${Math.max(
                              stats.pendingUsers
                                ? (stats.pendingUsers / dashboardOperationalMax) * 100
                                : 0,
                              stats.pendingUsers ? 8 : 0
                            )}%`,
                          }}
                        ></span>
                      </span>
                      <em>{stats.pendingUsers}</em>
                    </button>

                    <button type="button" onClick={() => setCurrentTab('messages')}>
                      <span className="admin-horizontal-chart-label">
                        <i className="bi bi-chat-left-text"></i>
                        New messages
                      </span>
                      <span className="admin-horizontal-chart-track">
                        <span
                          className="green"
                          style={{
                            width: `${Math.max(
                              stats.totalNewMessages
                                ? (stats.totalNewMessages / dashboardOperationalMax) * 100
                                : 0,
                              stats.totalNewMessages ? 8 : 0
                            )}%`,
                          }}
                        ></span>
                      </span>
                      <em>{stats.totalNewMessages}</em>
                    </button>
                  </div>
                </section>
              </div>

              <div className="admin-overview-lists-grid">
                <section className="admin-overview-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <h2>Recent library</h2>
                      <p>Latest titles from the current library result.</p>
                    </div>
                    <button
                      type="button"
                      className="admin-panel-link"
                      onClick={() => setCurrentTab('manage')}
                    >
                      View all
                    </button>
                  </div>

                  <div className="admin-recent-media-list">
                    {contentLoading && dashboardRecentContent.length === 0 && (
                      <div className="admin-compact-empty">Loading library</div>
                    )}

                    {!contentLoading && dashboardRecentContent.length === 0 && (
                      <div className="admin-compact-empty">No library titles</div>
                    )}

                    {dashboardRecentContent.map((item) => {
                      const type = getContentType(item)

                      return (
                        <button
                          type="button"
                          key={`${type}-${item.id}`}
                          onClick={() => {
                            if (type === 'series') openEditSeries(item)
                            else openEditMovie(item)
                          }}
                        >
                          <img
                            src={getPoster(item)}
                            alt=""
                            onError={(event) => {
                              event.currentTarget.src = POSTER_FALLBACK
                            }}
                          />
                          <span>
                            <span>{item.title}</span>
                            <small>
                              {type === 'series' ? 'Series' : 'Movie'}
                              {item.release_date
                                ? ` · ${String(item.release_date).slice(0, 4)}`
                                : ''}
                            </small>
                          </span>
                          <i className="bi bi-chevron-right"></i>
                        </button>
                      )
                    })}
                  </div>
                </section>

                <section className="admin-overview-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <h2>Recent requests</h2>
                      <p>Newest requests loaded from the request queue.</p>
                    </div>
                    <button
                      type="button"
                      className="admin-panel-link"
                      onClick={() => setCurrentTab('requests')}
                    >
                      View all
                    </button>
                  </div>

                  <div className="admin-recent-request-list">
                    {requestsLoading && dashboardRecentRequests.length === 0 && (
                      <div className="admin-compact-empty">Loading requests</div>
                    )}

                    {!requestsLoading && dashboardRecentRequests.length === 0 && (
                      <div className="admin-compact-empty">No requests</div>
                    )}

                    {dashboardRecentRequests.map((requestItem) => (
                      <button
                        type="button"
                        key={requestItem.id}
                        onClick={() => setCurrentTab('requests')}
                      >
                        <span className="admin-request-list-icon">
                          <i className="bi bi-film"></i>
                        </span>
                        <span>
                          <span>{requestItem.title}</span>
                          <small>{getRequesterName(requestItem)}</small>
                        </span>
                        <em
                          className={
                            requestItem.status === 'Completed'
                              ? 'completed'
                              : 'pending'
                          }
                        >
                          {requestItem.status}
                        </em>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {currentTab === 'add' && (
            <AddContentTab
              addContentType={addContentType}
              addMovieForm={addMovieForm}
              addMovieSaving={addMovieSaving}
              tmdbTitleLookup={tmdbTitleLookup}
              tmdbIdLookup={tmdbIdLookup}
              tmdbLoading={tmdbLoading}
              addSeriesForm={addSeriesForm}
              addSeriesSaving={addSeriesSaving}
              seriesTmdbTitleLookup={seriesTmdbTitleLookup}
              seriesTmdbIdLookup={seriesTmdbIdLookup}
              seriesTmdbLoading={seriesTmdbLoading}
              onContentTypeChange={setAddContentType}
              onAddMovieFieldChange={updateAddMovieField}
              onTmdbTitleLookupChange={setTmdbTitleLookup}
              onTmdbIdLookupChange={setTmdbIdLookup}
              onFetchMovieTmdb={fetchMovieTmdb}
              onSubmitAddMovie={submitAddMovie}
              onResetAddMovie={() => {
                setAddMovieForm(emptyAddMovieForm)
                setTmdbTitleLookup('')
                setTmdbIdLookup('')
              }}
              onAddSeriesFieldChange={updateAddSeriesField}
              onSeriesTmdbTitleLookupChange={setSeriesTmdbTitleLookup}
              onSeriesTmdbIdLookupChange={setSeriesTmdbIdLookup}
              onFetchSeriesTmdb={fetchSeriesTmdb}
              onSubmitAddSeries={submitAddSeries}
              onResetAddSeries={() => {
                setAddSeriesForm(createEmptyAddSeriesForm())
                setSeriesTmdbTitleLookup('')
                setSeriesTmdbIdLookup('')
              }}
              onAddSeason={addSeriesSeason}
              onRemoveSeason={removeSeriesSeason}
              onUpdateSeasonField={updateSeriesSeasonField}
              onAddEpisode={addSeriesEpisode}
              onRemoveEpisode={removeSeriesEpisode}
              onUpdateEpisodeField={updateSeriesEpisodeField}
            />
          )}

          {currentTab === 'manage' && (
            <div className="admin-fade-up admin-library-page">
              <div className="admin-page-header">
                <div>
                  <span className="admin-page-kicker">Content</span>
                  <h1>Library</h1>
                </div>

                <form
                  className="admin-library-search"
                  onSubmit={(event) => {
                    event.preventDefault()
                    loadManagedContent(1, false)
                  }}
                >
                  <i className="bi bi-search"></i>
                  <input
                    type="text"
                    value={contentSearch}
                    onChange={(event) => setContentSearch(event.target.value)}
                    placeholder="Search titles"
                  />
                  {contentSearch.trim() && (
                    <button
                      type="button"
                      className="admin-search-clear"
                      onClick={() => {
                        setContentSearch('')
                        loadManagedContent(1, false, '')
                      }}
                      aria-label="Clear search"
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  )}
                </form>
              </div>

              {contentError && (
                <div className="admin-alert-error">
                  Library content is temporarily unavailable.
                </div>
              )}

              <div className="admin-library-summary">
                <span>{contentLoading && managedContent.length === 0 ? 'Loading' : `${contentTotal} titles`}</span>
                <div>
                  <span className="movie">Movies</span>
                  <span className="series">Series</span>
                </div>
              </div>

              {contentLoading && managedContent.length === 0 ? (
                <div className="admin-media-grid admin-media-grid-compact">
                  {Array.from({ length: 14 }).map((_, index) => (
                    <div className="admin-media-card skeleton" key={`skeleton-${index}`}></div>
                  ))}
                </div>
              ) : managedContent.length === 0 ? (
                <div className="admin-empty-state">
                  <i className="bi bi-film"></i>
                  <h3>No titles found</h3>
                  <p>Add a movie or series to start your library.</p>
                </div>
              ) : (
                <>
                  <div className="admin-media-grid admin-media-grid-compact">
                    {managedContent.map((item) => {
                      const type = getContentType(item)
                      const contentKey = `${type}-${item.id}`

                      return (
                        <article
                                  className="admin-library-poster-card"
                                  key={contentKey}
                                >
                                  <img
                                    className="admin-library-poster-image"
                                    src={getPoster(item)}
                                    alt={item.title}
                                    loading="lazy"
                                    onError={(event) => {
                                      event.currentTarget.src = POSTER_FALLBACK
                                    }}
                                  />

                                  <div className="admin-library-poster-shade" />

                                  <div className="admin-library-poster-actions">
                                    <button
                                      type="button"
                                      className="admin-library-edit-button"
                                      onClick={() => {
                                        if (type === 'series') {
                                          openEditSeries(item)
                                        } else {
                                          openEditMovie(item)
                                        }
                                      }}
                                    >
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      className="admin-library-delete-button"
                                      title={`Delete ${type}`}
                                      aria-label={`Delete ${item.title}`}
                                      disabled={deletingContentKey === contentKey}
                                      onClick={() => askDeleteLibraryItem(item)}
                                    >
                                      {deletingContentKey === contentKey ? (
                                        <span className="admin-library-delete-loading">...</span>
                                      ) : (
                                        <i className="bi bi-trash3">Delete</i>
                                      )}
                                    </button>
                                  </div>
                                </article>
                      )
                    })}
                  </div>

                  {contentHasNext && (
                    <div className="admin-load-more-wrap">
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost"
                        disabled={contentLoading}
                        onClick={() => loadManagedContent(contentPage + 1, true)}
                      >
                        {contentLoading ? 'Loading' : 'Load more'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {currentTab === 'requests' && (
            <div className="admin-fade-up admin-requests-page">
              <div className="admin-page-header">
                <div>
                  <span className="admin-page-kicker">Content</span>
                  <h1>Requests</h1>
                </div>
                <span className="admin-page-count">{movieRequests.length} loaded</span>
              </div>

              {requestsError && (
                <div className="admin-alert-error">
                  Content requests are temporarily unavailable.
                </div>
              )}

              <div className="admin-card admin-request-card">
                <div className="admin-table-wrap">
                  <table className="admin-dt admin-request-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Requested by</th>
                        <th>Notes</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {requestsLoading && movieRequests.length === 0 && (
                        <tr>
                          <td colSpan={5} className="admin-table-empty">Loading requests</td>
                        </tr>
                      )}

                      {!requestsLoading && movieRequests.length === 0 && (
                        <tr>
                          <td colSpan={5} className="admin-table-empty">No requests found</td>
                        </tr>
                      )}

                      {movieRequests.map((requestItem) => (
                        <tr key={requestItem.id}>
                          <td>
                            <div className="admin-table-title">{requestItem.title}</div>
                            {requestItem.link && (
                              <a
                                href={requestItem.link}
                                target="_blank"
                                rel="noreferrer"
                                className="admin-table-link"
                              >
                                Open reference
                              </a>
                            )}
                          </td>
                          <td>{getRequesterName(requestItem)}</td>
                          <td className="admin-notes-cell">{requestItem.notes || '—'}</td>
                          <td>
                            <span className={`admin-badge ${
                              requestItem.status === 'Completed'
                                ? 'admin-badge-green'
                                : 'admin-badge-amber'
                            }`}>
                              {requestItem.status}
                            </span>
                          </td>
                          <td>
                            <div className="admin-row-actions admin-request-actions">
                              <button
                                type="button"
                                className="admin-row-text-btn"
                                disabled={
                                  requestItem.status === 'Completed' ||
                                  actioningRequestId === requestItem.id
                                }
                                onClick={() => askCompleteMovieRequest(requestItem)}
                              >
                                {actioningRequestId === requestItem.id ? 'Working' : 'Complete'}
                              </button>
                              <button
                                type="button"
                                className="admin-row-text-btn danger"
                                disabled={actioningRequestId === requestItem.id}
                                onClick={() => askDeleteMovieRequest(requestItem)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'users' && (
            <UsersTab
              currentAdminId={adminUser?.id ?? null}
              onShowToast={showToast}
              onStatsRefresh={loadStats}
              onConfirmAction={(dialog) => {
                openConfirmDialog({
                  ...dialog,
                  onConfirm: () => {
                    closeConfirmDialog()
                    dialog.onConfirm?.()
                  },
                })
              }}
            />
          )}

          {currentTab === 'notifications' && (
            <NotificationsTab
              onShowToast={showToast}
              onStatsRefresh={loadStats}
              onConfirmAction={(dialog) => {
                openConfirmDialog({
                  ...dialog,
                  onConfirm: () => {
                    closeConfirmDialog()
                    dialog.onConfirm?.()
                  },
                })
              }}
            />
          )}


          {currentTab === 'pending_users' && (
              <PendingUsersTab
                onShowToast={showToast}
                onStatsRefresh={loadStats}
                onConfirmAction={(dialog) => {
                  openConfirmDialog({
                    ...dialog,
                    onConfirm: () => {
                      closeConfirmDialog()
                      dialog.onConfirm?.()
                    },
                  })
                }}
              />
            )}


          {currentTab === 'messages' && (
              <MessagesTab
                onShowToast={showToast}
                onStatsRefresh={loadStats}
                onConfirmAction={(dialog) => {
                  openConfirmDialog({
                    ...dialog,
                    onConfirm: () => {
                      closeConfirmDialog()
                      dialog.onConfirm?.()
                    },
                  })
                }}
              />
            )}
            {currentTab === 'pages' && (
              <PagesTab onShowToast={showToast} />
            )}
            {currentTab === 'analytics' && (
              <AnalyticsTab onShowToast={showToast} />
            )}
            {currentTab === 'video_hosting' && (
              <VideoHostingTab onShowToast={showToast} />
            )}

          {currentTab !== 'dashboard' &&
            currentTab !== 'add' &&
            currentTab !== 'manage' &&
            currentTab !== 'requests' &&
            currentTab !== 'users' &&
            currentTab !== 'notifications' && 
            currentTab !== 'pending_users' && 
            currentTab !== 'messages' && 
            currentTab !== 'pages' && 
            currentTab !== 'analytics' && 
            currentTab !== 'video_hosting' && (
              <div className="admin-empty-state admin-moderation-empty">
                <i className="bi bi-chat-square-text"></i>
                <h3>No {formatTabTitle(currentTab).toLowerCase()} to review</h3>
                <p>New activity will appear here when it is available.</p>
              </div>
            )}
        </section>
      </main>
    </div>
  )
}

export default AdminDashboardPage