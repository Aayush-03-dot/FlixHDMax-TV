import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import type {
  AdminToast,
  VideoHostingItem,
  VideoHostingVideosResponse,
} from './adminTypes'

type Props = {
  onShowToast: (type: AdminToast['type'], message: string) => void
}

type VideoHostingFolder = {
  id: string
  name: string
  parent_id?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type VideoHostingFoldersResponse = {
  ok?: boolean
  success?: boolean
  folders?: VideoHostingFolder[]
  message?: string
  error?: string
}

type VideoHostingBasicResponse = {
  ok?: boolean
  success?: boolean
  message?: string
  error?: string
  watch_url?: string
  url?: string
  link?: string
}

type EditVideoState = {
  title: string
  description: string
  tags: string
  visibility: string
}

type MoveVideoState = {
  folder_id: string
}

type MenuPosition = {
  top: number
  left: number
}

let cachedCsrfToken: string | null = null

async function getCsrfToken() {
  if (cachedCsrfToken) {
    return cachedCsrfToken
  }

  const response = await fetch('/api/csrf-token', {
    credentials: 'include',
  })

  const data = (await response.json().catch(() => ({}))) as {
    csrf_token?: string
  }

  if (!response.ok || !data.csrf_token) {
    throw new Error('Could not load CSRF token.')
  }

  cachedCsrfToken = data.csrf_token
  return cachedCsrfToken
}

async function videoHostingFetch<T>(
  endpoint: string,
  options: RequestInit = {}
) {
  const method = (options.method || 'GET').toUpperCase()
  const needsCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method)
  const csrfToken = needsCsrf ? await getCsrfToken() : null

  const headers: HeadersInit = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(csrfToken
      ? {
          'X-CSRFToken': csrfToken,
          'X-CSRF-Token': csrfToken,
        }
      : {}),
    ...(options.headers || {}),
  }

  const response = await fetch(endpoint, {
    credentials: 'include',
    ...options,
    headers,
  })

  const data = (await response.json().catch(() => ({}))) as T

  if (!response.ok) {
    if (response.status === 400 && needsCsrf) {
      cachedCsrfToken = null
    }

    const message =
      (data as { message?: string; error?: string }).message ||
      (data as { message?: string; error?: string }).error ||
      `Request failed with status ${response.status}`

    throw new Error(message)
  }

  return data
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatBytes(value: number | string | null | undefined) {
  const bytes = toNumber(value)

  if (!bytes) return '-'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size >= 10 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`
}

function formatDuration(value: number | string | null | undefined) {
  const totalSeconds = Math.max(0, Math.floor(toNumber(value)))

  if (!totalSeconds) return '-'

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`

  return `${seconds}s`
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function getStatusTone(status?: string | null) {
  const cleanStatus = (status || '').toLowerCase()

  if (cleanStatus === 'ready' || cleanStatus === 'published') {
    return 'success'
  }

  if (
    cleanStatus === 'error' ||
    cleanStatus === 'failed' ||
    cleanStatus === 'deleted'
  ) {
    return 'danger'
  }

  return 'warning'
}

function isVideoBusy(status?: string | null) {
  return ['processing', 'encoding', 'uploading', 'pending', 'queued'].includes(
    (status || '').toLowerCase()
  )
}

function canRetryVideo(status?: string | null) {
  return ['error', 'failed', 'canceled'].includes((status || '').toLowerCase())
}

function getStatusLabel(video: VideoHostingItem) {
  const status = video.status || 'unknown'
  const progress = video.progress

  if (progress === null || progress === undefined || progress === '') {
    return status
  }

  const progressNumber = toNumber(progress)

  if (!progressNumber || status.toLowerCase() === 'ready') {
    return status
  }

  return `${status} ${Math.round(progressNumber)}%`
}

function getVideoTitle(video: VideoHostingItem) {
  return video.title || video.original_name || video.id
}


function getVideoThumbnail(video: VideoHostingItem) {
  const value = video.thumbnail_path?.trim()

  if (!value) return ''

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('/')
  ) {
    return value
  }

  return ''
}

function getVideoField(video: VideoHostingItem, key: string) {
  const value = (video as unknown as Record<string, unknown>)[key]

  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
}

function isSuccessResponse(response: VideoHostingBasicResponse) {
  return response.success !== false && response.ok !== false && !response.error
}

function VideoHostingTab({ onShowToast }: Props) {
  const [videos, setVideos] = useState<VideoHostingItem[]>([])
  const [folders, setFolders] = useState<VideoHostingFolder[]>([])
  const [allFolders, setAllFolders] = useState<VideoHostingFolder[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folderStack, setFolderStack] = useState<VideoHostingFolder[]>([])

  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [total, setTotal] = useState(0)

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  const [editingVideo, setEditingVideo] = useState<VideoHostingItem | null>(
    null
  )
  const [editForm, setEditForm] = useState<EditVideoState>({
    title: '',
    description: '',
    tags: '',
    visibility: 'private',
  })

  const [movingVideo, setMovingVideo] = useState<VideoHostingItem | null>(null)
  const [moveForm, setMoveForm] = useState<MoveVideoState>({
    folder_id: 'null',
  })

  const [deleteVideo, setDeleteVideo] = useState<VideoHostingItem | null>(null)

  const activeMenuVideo = useMemo(() => {
    return videos.find((video) => video.id === activeMenuId) || null
  }, [activeMenuId, videos])

  const hasBusyVideos = useMemo(() => {
    return videos.some((video) => isVideoBusy(video.status))
  }, [videos])

  const stats = useMemo(() => {
    return {
      total: total || videos.length,
      ready: videos.filter((video) => video.status?.toLowerCase() === 'ready')
        .length,
      processing: videos.filter((video) => isVideoBusy(video.status)).length,
      failed: videos.filter((video) =>
        ['error', 'failed'].includes((video.status || '').toLowerCase())
      ).length,
    }
  }, [total, videos])

  const closeActionMenu = () => {
    setActiveMenuId(null)
    setMenuPosition(null)
  }

  const openActionMenu = (
    event: MouseEvent<HTMLButtonElement>,
    videoId: string
  ) => {
    event.stopPropagation()

    if (activeMenuId === videoId) {
      closeActionMenu()
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const menuWidth = 190
    const viewportPadding = 12

    const left = Math.min(
      window.innerWidth - menuWidth - viewportPadding,
      Math.max(viewportPadding, rect.right - menuWidth)
    )

    const top = Math.min(
      window.innerHeight - viewportPadding - 260,
      rect.bottom + 8
    )

    setMenuPosition({
      top: Math.max(viewportPadding, top),
      left,
    })
    setActiveMenuId(videoId)
  }

  const loadFlatFolders = async () => {
    try {
      const response = await videoHostingFetch<VideoHostingFoldersResponse>(
        '/api/admin/video-hosting/folders?mode=flat_tree'
      )

      if (response.success === false || response.ok === false) {
        throw new Error(response.message || 'Could not load folders.')
      }

      setAllFolders(response.folders || [])
    } catch {
      setAllFolders([])
    }
  }

  const loadVideos = async (
    searchOverride = activeSearch,
    folderIdOverride = currentFolderId
  ) => {
    setLoading(true)
    setError(false)

    const videoParams = new URLSearchParams()

    if (searchOverride.trim()) {
      videoParams.set('search', searchOverride.trim())
    }

    if (folderIdOverride) {
      videoParams.set('folder_id', folderIdOverride)
    }

    const videoQuery = videoParams.toString()
    const videosEndpoint = `/api/admin/video-hosting/videos${
      videoQuery ? `?${videoQuery}` : ''
    }`

    const folderParams = new URLSearchParams()

    if (folderIdOverride) {
      folderParams.set('parent_id', folderIdOverride)
    }

    const folderQuery = folderParams.toString()
    const foldersEndpoint = `/api/admin/video-hosting/folders${
      folderQuery ? `?${folderQuery}` : ''
    }`

    try {
      const [videosResponse, foldersResponse] = await Promise.all([
        videoHostingFetch<VideoHostingVideosResponse>(videosEndpoint),
        videoHostingFetch<VideoHostingFoldersResponse>(foldersEndpoint),
      ])

      if (videosResponse.success === false || videosResponse.ok === false) {
        throw new Error(videosResponse.message || 'Video hosting request failed.')
      }

      if (foldersResponse.success === false || foldersResponse.ok === false) {
        throw new Error(foldersResponse.message || 'Could not load folders.')
      }

      const nextVideos = videosResponse.videos || []
      const nextFolders = foldersResponse.folders || []

      setVideos(nextVideos)
      setFolders(nextFolders)
      setTotal(videosResponse.total ?? nextVideos.length)
      setCurrentFolderId(folderIdOverride || null)
    } catch (caughtError) {
      setError(true)
      setVideos([])
      setFolders([])
      setTotal(0)
      onShowToast(
        'error',
        caughtError instanceof Error
          ? caughtError.message
          : 'Could not load video hosting data.'
      )
    } finally {
      setLoading(false)
    }
  }

  const reloadCurrentView = () => {
    closeActionMenu()
    loadVideos(activeSearch, currentFolderId)
    loadFlatFolders()
  }

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const cleanSearch = search.trim()
    setActiveSearch(cleanSearch)
    loadVideos(cleanSearch, currentFolderId)
  }

  const clearSearch = () => {
    setSearch('')
    setActiveSearch('')
    loadVideos('', currentFolderId)
  }

  const openFolder = (folder: VideoHostingFolder) => {
    setSearch('')
    setActiveSearch('')
    setFolderStack((currentStack) => [...currentStack, folder])
    closeActionMenu()
    loadVideos('', folder.id)
  }

  const goToRootFolder = () => {
    setSearch('')
    setActiveSearch('')
    setFolderStack([])
    closeActionMenu()
    loadVideos('', null)
  }

  const goToFolderIndex = (index: number) => {
    const nextStack = folderStack.slice(0, index + 1)
    const targetFolder = nextStack[nextStack.length - 1]

    setSearch('')
    setActiveSearch('')
    setFolderStack(nextStack)
    closeActionMenu()
    loadVideos('', targetFolder?.id || null)
  }

  const copyText = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value)
      onShowToast('success', message)
    } catch {
      onShowToast('error', 'Could not copy.')
    }
  }

  const copyVideoId = (videoId: string) => {
    copyText(videoId, 'Video ID copied.')
    closeActionMenu()
  }

  const copyWatchLink = async (video: VideoHostingItem) => {
    const actionKey = `copy-link-${video.id}`
    setBusyAction(actionKey)

    try {
      const response = await videoHostingFetch<VideoHostingBasicResponse>(
        `/api/admin/video-hosting/watch-link/${video.id}`,
        {
          method: 'POST',
          body: JSON.stringify({ ttl: 86400 }),
        }
      )

      if (!isSuccessResponse(response)) {
        throw new Error(
          response.message || response.error || 'Could not create watch link.'
        )
      }

      const link = response.watch_url || response.url || response.link

      if (!link) {
        throw new Error('Watch link was not returned by the hosting service.')
      }

      await copyText(link, 'Watch link copied.')
    } catch (caughtError) {
      onShowToast(
        'error',
        caughtError instanceof Error
          ? caughtError.message
          : 'Could not copy watch link.'
      )
    } finally {
      setBusyAction(null)
      closeActionMenu()
    }
  }

  const openHostedWatch = (video: VideoHostingItem) => {
    const title = encodeURIComponent(getVideoTitle(video))
    const back = encodeURIComponent('/admin/login')

    window.open(
      `/watch/hosted/${video.id}?back=${back}&title=${title}`,
      '_blank',
      'noopener,noreferrer'
    )

    closeActionMenu()
  }

  const openEditModal = (video: VideoHostingItem) => {
    setEditingVideo(video)
    setEditForm({
      title: getVideoTitle(video),
      description: getVideoField(video, 'description'),
      tags: getVideoField(video, 'tags'),
      visibility: getVideoField(video, 'visibility') || 'private',
    })
    closeActionMenu()
  }

  const closeEditModal = () => {
    setEditingVideo(null)
    setEditForm({
      title: '',
      description: '',
      tags: '',
      visibility: 'private',
    })
  }

  const saveEditVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!editingVideo) return

    const cleanTitle = editForm.title.trim()

    if (!cleanTitle) {
      onShowToast('error', 'Video title is required.')
      return
    }

    const actionKey = `edit-${editingVideo.id}`
    setBusyAction(actionKey)

    try {
      const response = await videoHostingFetch<VideoHostingBasicResponse>(
        `/api/admin/video-hosting/videos/${editingVideo.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            title: cleanTitle,
            description: editForm.description.trim(),
            tags: editForm.tags.trim(),
            visibility: editForm.visibility,
          }),
        }
      )

      if (!isSuccessResponse(response)) {
        throw new Error(
          response.message || response.error || 'Could not update video.'
        )
      }

      onShowToast('success', 'Video updated.')
      closeEditModal()
      reloadCurrentView()
    } catch (caughtError) {
      onShowToast(
        'error',
        caughtError instanceof Error
          ? caughtError.message
          : 'Could not update video.'
      )
    } finally {
      setBusyAction(null)
    }
  }

  const openMoveModal = (video: VideoHostingItem) => {
    setMovingVideo(video)
    setMoveForm({
      folder_id: getVideoField(video, 'folder_id') || 'null',
    })
    closeActionMenu()

    if (allFolders.length === 0) {
      loadFlatFolders()
    }
  }

  const closeMoveModal = () => {
    setMovingVideo(null)
    setMoveForm({ folder_id: 'null' })
  }

  const saveMoveVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!movingVideo) return

    const actionKey = `move-${movingVideo.id}`
    setBusyAction(actionKey)

    try {
      const response = await videoHostingFetch<VideoHostingBasicResponse>(
        `/api/admin/video-hosting/videos/${movingVideo.id}/move`,
        {
          method: 'POST',
          body: JSON.stringify({
            folder_id: moveForm.folder_id,
          }),
        }
      )

      if (!isSuccessResponse(response)) {
        throw new Error(
          response.message || response.error || 'Could not move video.'
        )
      }

      onShowToast('success', 'Video moved.')
      closeMoveModal()
      reloadCurrentView()
    } catch (caughtError) {
      onShowToast(
        'error',
        caughtError instanceof Error
          ? caughtError.message
          : 'Could not move video.'
      )
    } finally {
      setBusyAction(null)
    }
  }

  const retryVideo = async (video: VideoHostingItem) => {
    const actionKey = `retry-${video.id}`
    setBusyAction(actionKey)
    closeActionMenu()

    try {
      const response = await videoHostingFetch<VideoHostingBasicResponse>(
        `/api/admin/video-hosting/videos/${video.id}/retry`,
        {
          method: 'POST',
        }
      )

      if (!isSuccessResponse(response)) {
        throw new Error(
          response.message || response.error || 'Could not retry video.'
        )
      }

      onShowToast('success', 'Encoding retry started.')
      reloadCurrentView()
    } catch (caughtError) {
      onShowToast(
        'error',
        caughtError instanceof Error
          ? caughtError.message
          : 'Could not retry video.'
      )
    } finally {
      setBusyAction(null)
    }
  }

  const cancelVideo = async (video: VideoHostingItem) => {
    const actionKey = `cancel-${video.id}`
    setBusyAction(actionKey)
    closeActionMenu()

    try {
      const response = await videoHostingFetch<VideoHostingBasicResponse>(
        `/api/admin/video-hosting/videos/${video.id}/cancel`,
        {
          method: 'POST',
        }
      )

      if (!isSuccessResponse(response)) {
        throw new Error(
          response.message || response.error || 'Could not cancel encoding.'
        )
      }

      onShowToast('success', 'Encoding canceled.')
      reloadCurrentView()
    } catch (caughtError) {
      onShowToast(
        'error',
        caughtError instanceof Error
          ? caughtError.message
          : 'Could not cancel encoding.'
      )
    } finally {
      setBusyAction(null)
    }
  }

  const confirmDeleteVideo = async () => {
    if (!deleteVideo) return

    const actionKey = `delete-${deleteVideo.id}`
    setBusyAction(actionKey)

    try {
      const response = await videoHostingFetch<VideoHostingBasicResponse>(
        `/api/admin/video-hosting/videos/${deleteVideo.id}`,
        {
          method: 'DELETE',
        }
      )

      if (!isSuccessResponse(response)) {
        throw new Error(
          response.message || response.error || 'Could not delete video.'
        )
      }

      onShowToast('success', 'Video deleted.')
      setDeleteVideo(null)
      reloadCurrentView()
    } catch (caughtError) {
      onShowToast(
        'error',
        caughtError instanceof Error
          ? caughtError.message
          : 'Could not delete video.'
      )
    } finally {
      setBusyAction(null)
    }
  }

  useEffect(() => {
    loadVideos('', null)
    loadFlatFolders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!hasBusyVideos) return

    const intervalId = window.setInterval(() => {
      loadVideos(activeSearch, currentFolderId)
    }, 5000)

    return () => window.clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBusyVideos, activeSearch, currentFolderId])

  useEffect(() => {
    const closeMenu = () => closeActionMenu()

    window.addEventListener('click', closeMenu)
    window.addEventListener('resize', closeMenu)
    window.addEventListener('scroll', closeMenu, true)

    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('resize', closeMenu)
      window.removeEventListener('scroll', closeMenu, true)
    }
  }, [])

  const renderFloatingMenu = () => {
    if (!activeMenuVideo || !menuPosition) return null

    const video = activeMenuVideo
    const status = (video.status || '').toLowerCase()
    const busy = isVideoBusy(status)
    const retryable = canRetryVideo(status)

    return createPortal(
      <div
        className="vh-menu vh-menu-floating"
        style={{
          top: menuPosition.top,
          left: menuPosition.left,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" onClick={() => copyVideoId(video.id)}>
          <i className="bi bi-clipboard"></i>
          Copy ID
        </button>

        <button
          type="button"
          onClick={() => copyWatchLink(video)}
          disabled={
            status !== 'ready' || busyAction === `copy-link-${video.id}`
          }
        >
          <i className="bi bi-link-45deg"></i>
          Copy watch link
        </button>

        <button type="button" onClick={() => openEditModal(video)}>
          <i className="bi bi-pencil-square"></i>
          Edit / rename
        </button>

        <button type="button" onClick={() => openMoveModal(video)}>
          <i className="bi bi-folder-symlink"></i>
          Move
        </button>

        {busy && (
          <button
            type="button"
            onClick={() => cancelVideo(video)}
            disabled={busyAction === `cancel-${video.id}`}
          >
            <i className="bi bi-x-circle"></i>
            Cancel encoding
          </button>
        )}

        {retryable && (
          <button
            type="button"
            onClick={() => retryVideo(video)}
            disabled={busyAction === `retry-${video.id}`}
          >
            <i className="bi bi-arrow-repeat"></i>
            Retry encode
          </button>
        )}

        <button
          type="button"
          className="danger"
          onClick={() => {
            setDeleteVideo(video)
            closeActionMenu()
          }}
        >
          <i className="bi bi-trash"></i>
          Delete
        </button>
      </div>,
      document.body
    )
  }

  return (
    <section className="vh-panel">
      <div className="vh-stats">
        <article className="vh-stat-card">
          <div className="vh-stat-icon">
            <i className="bi bi-collection-play-fill"></i>
          </div>
          <div>
            <div className="vh-stat-label">Videos</div>
            <div className="vh-stat-value">{stats.total}</div>
          </div>
        </article>

        <article className="vh-stat-card">
          <div className="vh-stat-icon">
            <i className="bi bi-play-circle-fill"></i>
          </div>
          <div>
            <div className="vh-stat-label">Ready</div>
            <div className="vh-stat-value">{stats.ready}</div>
          </div>
        </article>

        <article className="vh-stat-card">
          <div className="vh-stat-icon">
            <i className="bi bi-cpu-fill"></i>
          </div>
          <div>
            <div className="vh-stat-label">Processing</div>
            <div className="vh-stat-value">{stats.processing}</div>
          </div>
        </article>

        <article className="vh-stat-card">
          <div className="vh-stat-icon">
            <i className="bi bi-exclamation-diamond-fill"></i>
          </div>
          <div>
            <div className="vh-stat-label">Failed</div>
            <div className="vh-stat-value">{stats.failed}</div>
          </div>
        </article>
      </div>

      <div className="vh-card">
        <div className="vh-card-head">
          <div>
            <div className="vh-card-title">Hosted Video Library</div>
            <div className="vh-card-subtitle">{videos.length} videos in this view</div>
          </div>

          <div className="vh-toolbar">
            <form className="vh-search" onSubmit={applySearch}>
              <i className="bi bi-search"></i>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search videos"
              />

              {search && (
                <button
                  type="button"
                  className="vh-search-clear"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </form>

          </div>
        </div>

        <div className="vh-breadcrumbs">
          <button
            type="button"
            className={`vh-crumb-btn ${!currentFolderId ? 'active' : ''}`}
            onClick={goToRootFolder}
          >
            <i className="bi bi-house-door-fill"></i>
            Root
          </button>

          {folderStack.map((folder, index) => (
            <span key={folder.id} className="vh-crumb-segment">
              <i className="bi bi-chevron-right"></i>
              <button
                type="button"
                className="vh-crumb-btn"
                onClick={() => goToFolderIndex(index)}
              >
                {folder.name}
              </button>
            </span>
          ))}
        </div>

        <div className="vh-library-grid">
          {loading && (
            <div className="vh-empty vh-library-empty">Loading hosted videos</div>
          )}

          {!loading && error && (
            <div className="vh-empty vh-library-empty">
              Video hosting is temporarily unavailable.
            </div>
          )}

          {!loading &&
            !error &&
            videos.length === 0 &&
            folders.length === 0 && (
              <div className="vh-empty vh-library-empty">
                {activeSearch
                  ? 'No hosted videos matched your search.'
                  : 'No hosted videos found.'}
              </div>
            )}

          {!loading &&
            !error &&
            folders.map((folder) => (
              <button
                type="button"
                key={`folder-${folder.id}`}
                className="vh-folder-card"
                onClick={() => openFolder(folder)}
              >
                <span className="vh-folder-card-icon">
                  <i className="bi bi-folder-fill"></i>
                </span>
                <span className="vh-folder-card-copy">
                  <span>{folder.name}</span>
                  <small>{formatDateTime(folder.created_at)}</small>
                </span>
                <i className="bi bi-chevron-right"></i>
              </button>
            ))}

          {!loading &&
            !error &&
            videos.map((video) => {
              const status = (video.status || '').toLowerCase()
              const thumbnail = getVideoThumbnail(video)

              return (
                <article className="vh-video-card" key={video.id}>
                  <div className="vh-video-card-visual">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <span>
                        <i className="bi bi-play-btn"></i>
                      </span>
                    )}

                    <span
                      className={`vh-badge vh-badge-${getStatusTone(
                        video.status
                      )}`}
                    >
                      {getStatusLabel(video)}
                    </span>
                  </div>

                  <div className="vh-video-card-body">
                    <div className="vh-video-card-title-row">
                      <div>
                        <h3>{getVideoTitle(video)}</h3>
                        {video.original_name &&
                          video.original_name !== video.title && (
                            <p>{video.original_name}</p>
                          )}
                      </div>

                      <button
                        type="button"
                        className="vh-icon-btn"
                        onClick={(event) => openActionMenu(event, video.id)}
                        aria-label="More actions"
                        title="More actions"
                      >
                        <i className="bi bi-three-dots"></i>
                      </button>
                    </div>

                    <div className="vh-video-card-meta">
                      <span>{formatDuration(video.duration_sec)}</span>
                      <span>{formatBytes(video.size_bytes)}</span>
                      {video.width && video.height && (
                        <span>
                          {video.width}×{video.height}
                        </span>
                      )}
                    </div>

                    {video.stage && status !== 'ready' && (
                      <div className="vh-video-stage">{video.stage}</div>
                    )}

                    {video.error && <div className="vh-error">{video.error}</div>}

                    <div className="vh-video-card-foot">
                      <code className="vh-code">{video.id}</code>

                      <div className="vh-actions">
                        <button
                          type="button"
                          className="vh-icon-btn"
                          onClick={() => copyVideoId(video.id)}
                          aria-label="Copy video ID"
                          title="Copy video ID"
                        >
                          <i className="bi bi-clipboard"></i>
                        </button>

                        <button
                          type="button"
                          className="vh-icon-btn"
                          onClick={() => openHostedWatch(video)}
                          aria-label="Open hosted video"
                          title="Open hosted video"
                          disabled={status !== 'ready'}
                        >
                          <i className="bi bi-play-fill"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
        </div>
      </div>

      {renderFloatingMenu()}

      {editingVideo && (
        <div className="vh-modal-backdrop" onClick={closeEditModal}>
          <div
            className="vh-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="vh-modal-head">
              <div>
                <h3>Edit hosted video</h3>
                <p>{editingVideo.id}</p>
              </div>

              <button
                type="button"
                className="vh-modal-close"
                onClick={closeEditModal}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form className="vh-form" onSubmit={saveEditVideo}>
              <label>
                Title
                <input
                  value={editForm.title}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Video title"
                />
              </label>

              <label>
                Description
                <textarea
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Optional description"
                  rows={4}
                />
              </label>

              <label>
                Tags
                <input
                  value={editForm.tags}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      tags: event.target.value,
                    }))
                  }
                  placeholder="movie, trailer, episode"
                />
              </label>

              <label>
                Visibility
                <select
                  value={editForm.visibility}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      visibility: event.target.value,
                    }))
                  }
                >
                  <option value="private">Private</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                </select>
              </label>

              <div className="vh-modal-actions">
                <button
                  type="button"
                  className="vh-btn"
                  onClick={closeEditModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="vh-btn vh-btn-primary"
                  disabled={busyAction === `edit-${editingVideo.id}`}
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {movingVideo && (
        <div className="vh-modal-backdrop" onClick={closeMoveModal}>
          <div
            className="vh-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="vh-modal-head">
              <div>
                <h3>Move video</h3>
                <p>{getVideoTitle(movingVideo)}</p>
              </div>

              <button
                type="button"
                className="vh-modal-close"
                onClick={closeMoveModal}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form className="vh-form" onSubmit={saveMoveVideo}>
              <label>
                Target folder
                <select
                  value={moveForm.folder_id}
                  onChange={(event) =>
                    setMoveForm({ folder_id: event.target.value })
                  }
                >
                  <option value="null">Root Directory</option>

                  {allFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="vh-modal-actions">
                <button
                  type="button"
                  className="vh-btn"
                  onClick={closeMoveModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="vh-btn vh-btn-primary"
                  disabled={busyAction === `move-${movingVideo.id}`}
                >
                  Move video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteVideo && (
        <div className="vh-modal-backdrop" onClick={() => setDeleteVideo(null)}>
          <div
            className="vh-modal vh-modal-small"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="vh-modal-head">
              <div>
                <h3>Delete hosted video?</h3>
                <p>{getVideoTitle(deleteVideo)}</p>
              </div>

              <button
                type="button"
                className="vh-modal-close"
                onClick={() => setDeleteVideo(null)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <p className="vh-delete-text">
              This removes the hosted video from the video hosting platform. Use
              this only when you are sure the video is not attached to live
              content.
            </p>

            <div className="vh-modal-actions">
              <button
                type="button"
                className="vh-btn"
                onClick={() => setDeleteVideo(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="vh-btn vh-btn-danger"
                onClick={confirmDeleteVideo}
                disabled={busyAction === `delete-${deleteVideo.id}`}
              >
                Delete video
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default VideoHostingTab