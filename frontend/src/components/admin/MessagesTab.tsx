import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { adminFetch, adminMutation } from './adminApi'
import type {
  AdminContactMessage,
  AdminMessageDetailResponse,
  AdminMessageMutationResponse,
  AdminMessagesResponse,
  AdminToast,
  ConfirmDialog,
} from './adminTypes'

type Props = {
  onShowToast: (type: AdminToast['type'], message: string) => void
  onConfirmAction: (dialog: Omit<ConfirmDialog, 'open'>) => void
  onStatsRefresh: () => void
}

type MessageStatusFilter = 'all' | 'New' | 'Read'

function getMessageSubject(message: AdminContactMessage) {
  return message.subject?.trim() || 'No subject'
}

function getMessagePreview(message: AdminContactMessage) {
  const cleanMessage = message.message?.trim() || ''

  if (cleanMessage.length <= 120) {
    return cleanMessage || '—'
  }

  return `${cleanMessage.slice(0, 120)}...`
}

function MessagesTab({
  onShowToast,
  onConfirmAction,
  onStatsRefresh,
}: Props) {
  const [messages, setMessages] = useState<AdminContactMessage[]>([])
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MessageStatusFilter>('all')
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const [selectedMessage, setSelectedMessage] =
    useState<AdminContactMessage | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)

  const [actioningId, setActioningId] = useState<number | null>(null)

  const visibleStats = useMemo(() => {
    return {
      newMessages: messages.filter((message) => message.status === 'New').length,
      readMessages: messages.filter((message) => message.status === 'Read').length,
    }
  }, [messages])

  const loadMessages = async (
    requestedPage = 1,
    append = false,
    searchOverride?: string,
    statusOverride?: MessageStatusFilter
  ) => {
    setLoading(true)
    setError(false)

    const selectedSearch =
      typeof searchOverride === 'string' ? searchOverride : activeSearch

    const selectedStatus = statusOverride || statusFilter

    const params = new URLSearchParams()
    params.set('page', String(requestedPage))
    params.set('per_page', '20')

    if (selectedSearch.trim()) {
      params.set('search', selectedSearch.trim())
    }

    if (selectedStatus !== 'all') {
      params.set('status', selectedStatus)
    }

    try {
      const response = await adminFetch<
        AdminMessagesResponse | AdminContactMessage[]
      >(`/api/admin/messages?${params.toString()}`)

      const items = Array.isArray(response)
        ? response
        : response.items || response.messages || []

      setMessages((currentMessages) =>
        append ? [...currentMessages, ...items] : items
      )

      if (Array.isArray(response)) {
        setPage(1)
        setHasNext(false)
        setTotalItems(items.length)
      } else {
        setPage(response.page || response.current_page || requestedPage)
        setHasNext(Boolean(response.has_next))
        setTotalItems(response.total_items || response.total_messages || 0)
      }
    } catch {
      setError(true)
      onShowToast('error', 'Could not load messages.')
    } finally {
      setLoading(false)
    }
  }


  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const cleanSearch = search.trim()
    setActiveSearch(cleanSearch)
    loadMessages(1, false, cleanSearch)
  }

  const clearSearch = () => {
    setSearch('')
    setActiveSearch('')
    loadMessages(1, false, '')
  }

  const changeStatusFilter = (nextStatus: MessageStatusFilter) => {
    setStatusFilter(nextStatus)
    loadMessages(1, false, activeSearch, nextStatus)
  }

  const mergeMessageIntoList = (updatedMessage: AdminContactMessage) => {
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === updatedMessage.id
          ? {
              ...message,
              ...updatedMessage,
            }
          : message
      )
    )

    setSelectedMessage((currentMessage) =>
      currentMessage && currentMessage.id === updatedMessage.id
        ? {
            ...currentMessage,
            ...updatedMessage,
          }
        : currentMessage
    )
  }

  const openMessageModal = async (messageId: number) => {
    setModalOpen(true)
    setModalLoading(true)
    setSelectedMessage(null)

    try {
      const response = await adminFetch<AdminMessageDetailResponse>(
        `/api/admin/messages/${messageId}`
      )

      const message = response.item || response.message

      if (!message) {
        throw new Error('Could not load message details.')
      }

      setSelectedMessage(message)
    } catch (error) {
      onShowToast(
        'error',
        error instanceof Error ? error.message : 'Could not load message details.'
      )
      setModalOpen(false)
    } finally {
      setModalLoading(false)
    }
  }

  const closeMessageModal = () => {
    if (actioningId) return

    setModalOpen(false)
    setModalLoading(false)
    setSelectedMessage(null)
  }

  const updateMessageStatus = async (
    message: AdminContactMessage,
    nextStatus: 'New' | 'Read'
  ) => {
    if (message.status === nextStatus) return

    setActioningId(message.id)

    const endpoint =
      nextStatus === 'Read'
        ? `/api/admin/messages/mark_read/${message.id}`
        : `/api/admin/messages/mark_new/${message.id}`

    try {
      const response = await adminMutation<AdminMessageMutationResponse>(
        endpoint,
        'POST'
      )

      if (response.success === false) {
        throw new Error(response.message || 'Could not update message.')
      }

      const updatedMessage =
        response.item ||
        response.updated_message || {
          ...message,
          status: nextStatus,
        }

      mergeMessageIntoList(updatedMessage)

      onShowToast(
        'success',
        response.message ||
          (nextStatus === 'Read'
            ? 'Message marked as read.'
            : 'Message marked as new.')
      )

      onStatsRefresh()
    } catch (error) {
      onShowToast(
        'error',
        error instanceof Error ? error.message : 'Could not update message.'
      )
    } finally {
      setActioningId(null)
    }
  }

  const deleteMessage = async (message: AdminContactMessage) => {
    setActioningId(message.id)

    try {
      const response = await adminMutation<AdminMessageMutationResponse>(
        `/api/admin/messages/delete/${message.id}`,
        'DELETE'
      )

      if (response.success === false) {
        throw new Error(response.message || 'Could not delete message.')
      }

      setMessages((currentMessages) =>
        currentMessages.filter((currentMessage) => currentMessage.id !== message.id)
      )

      setTotalItems((currentTotal) => Math.max(0, currentTotal - 1))

      if (selectedMessage?.id === message.id) {
        setModalOpen(false)
        setSelectedMessage(null)
      }

      onShowToast('success', response.message || 'Message deleted successfully.')
      onStatsRefresh()
    } catch (error) {
      onShowToast(
        'error',
        error instanceof Error ? error.message : 'Could not delete message.'
      )
    } finally {
      setActioningId(null)
    }
  }

  const askDeleteMessage = (message: AdminContactMessage) => {
    onConfirmAction({
      title: 'Delete this message?',
      message: `This will permanently delete the message from "${message.name}".`,
      confirmText: 'Delete Message',
      danger: true,
      onConfirm: () => {
        deleteMessage(message)
      },
    })
  }

  useEffect(() => {
    loadMessages(1, false, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="admin-messages-page admin-inbox-page">
      <div className="admin-page-header">
        <div>
          <span className="admin-page-kicker">Support</span>
          <h1>Messages</h1>
        </div>
        <div className="admin-inbox-counts">
          <span>{visibleStats.newMessages} new</span>
          <span>{totalItems} total</span>
        </div>
      </div>

      <div className="admin-inbox-toolbar">
        <form className="admin-directory-search" onSubmit={applySearch}>
          <i className="bi bi-search"></i>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search messages"
          />
          {search.trim() && (
            <button type="button" onClick={clearSearch} aria-label="Clear search">
              <i className="bi bi-x-lg"></i>
            </button>
          )}
        </form>

        <div className="admin-filter-pills">
          {(['all', 'New', 'Read'] as MessageStatusFilter[]).map((status) => (
            <button
              key={status}
              type="button"
              className={statusFilter === status ? 'active' : ''}
              onClick={() => changeStatusFilter(status)}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="admin-alert-error">Messages are temporarily unavailable.</div>}

      <div className="admin-inbox-layout">
        <section className="admin-inbox-list">
          {loading && messages.length === 0 && (
            <div className="admin-table-empty">Loading messages</div>
          )}
          {!loading && messages.length === 0 && (
            <div className="admin-empty-state admin-inbox-empty">
              <i className="bi bi-chat-left-text"></i>
              <h3>No messages found</h3>
            </div>
          )}

          {messages.map((message) => {
            const isNew = message.status === 'New'
            const isActioning = actioningId === message.id

            return (
              <article
                key={message.id}
                className={`admin-inbox-item ${isNew ? 'unread' : ''}`}
              >
                <button
                  type="button"
                  className="admin-inbox-item-main"
                  onClick={() => openMessageModal(message.id)}
                >
                  <span className="admin-messages-avatar">
                    {message.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="admin-inbox-item-copy">
                    <span className="admin-inbox-item-line">
                      <span className="admin-messages-name">{message.name}</span>
                      <time>{message.date || '—'}</time>
                    </span>
                    <span className="admin-messages-subject">{getMessageSubject(message)}</span>
                    <span className="admin-messages-preview">{getMessagePreview(message)}</span>
                  </span>
                  {isNew && <span className="admin-inbox-unread-dot" aria-label="Unread"></span>}
                </button>

                <div className="admin-inbox-item-actions">
                  <button
                    type="button"
                    disabled={isActioning}
                    onClick={() => updateMessageStatus(message, isNew ? 'Read' : 'New')}
                  >
                    {isActioning ? 'Working' : isNew ? 'Mark read' : 'Mark new'}
                  </button>
                  <button
                    type="button"
                    className="danger"
                    disabled={isActioning}
                    onClick={() => askDeleteMessage(message)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            )
          })}

          <div className="admin-directory-footer">
            <span>Showing {messages.length} of {totalItems}</span>
            {hasNext && (
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                disabled={loading}
                onClick={() => loadMessages(page + 1, true)}
              >
                {loading ? 'Loading' : 'Load more'}
              </button>
            )}
          </div>
        </section>

        <aside className="admin-inbox-preview">
          <i className="bi bi-envelope-open"></i>
          <span>Select a message to read it</span>
        </aside>
      </div>

      {modalOpen && (
        <div className="admin-messages-modal-backdrop">
          <div className="admin-messages-modal">
            <div className="admin-messages-modal-head">
              <div>
                <h2>Message Details</h2>
                <p>Read the full message and update its status.</p>
              </div>

              <button
                type="button"
                onClick={closeMessageModal}
                disabled={Boolean(actioningId)}
                aria-label="Close message details"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {modalLoading || !selectedMessage ? (
              <div className="admin-messages-modal-loading">
                <div className="admin-boot-spinner"></div>
                <span>Loading message...</span>
              </div>
            ) : (
              <div className="admin-messages-modal-body">
                <div className="admin-messages-modal-info">
                  <div>
                    <label>Name</label>
                    <span>{selectedMessage.name}</span>
                  </div>

                  <div>
                    <label>Email</label>
                    <a href={`mailto:${selectedMessage.email}`}>
                      {selectedMessage.email}
                    </a>
                  </div>

                  <div>
                    <label>Status</label>
                    <span>{selectedMessage.status}</span>
                  </div>

                  <div>
                    <label>Date</label>
                    <span>{selectedMessage.date || '—'}</span>
                  </div>
                </div>

                <div className="admin-messages-modal-section">
                  <label>Subject</label>
                  <p>{getMessageSubject(selectedMessage)}</p>
                </div>

                <div className="admin-messages-modal-section">
                  <label>Message</label>
                  <div className="admin-messages-full-text">
                    {selectedMessage.message}
                  </div>
                </div>

                <div className="admin-messages-modal-actions">
                  <a
                    className="admin-btn admin-btn-ghost"
                    href={`mailto:${selectedMessage.email}?subject=${encodeURIComponent(
                      `Re: ${getMessageSubject(selectedMessage)}`
                    )}`}
                  >
                    <i className="bi bi-reply"></i>
                    Reply
                  </a>

                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost"
                    disabled={actioningId === selectedMessage.id}
                    onClick={() =>
                      updateMessageStatus(
                        selectedMessage,
                        selectedMessage.status === 'New' ? 'Read' : 'New'
                      )
                    }
                  >
                    {actioningId === selectedMessage.id ? (
                      <span className="admin-button-spinner"></span>
                    ) : (
                      <i
                        className={`bi ${
                          selectedMessage.status === 'New'
                            ? 'bi-check2-circle'
                            : 'bi-envelope'
                        }`}
                      ></i>
                    )}
                    Mark {selectedMessage.status === 'New' ? 'Read' : 'New'}
                  </button>

                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    disabled={actioningId === selectedMessage.id}
                    onClick={() => askDeleteMessage(selectedMessage)}
                  >
                    {actioningId === selectedMessage.id ? (
                      <span className="admin-button-spinner"></span>
                    ) : (
                      <i className="bi bi-trash"></i>
                    )}
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MessagesTab