import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { adminFetch, adminMutation } from './adminApi'
import type {
  AdminPageDetailResponse,
  AdminPageItem,
  AdminPagesListResponse,
  AdminPageUpdateResponse,
  AdminToast,
} from './adminTypes'

type Props = {
  onShowToast: (type: AdminToast['type'], message: string) => void
}

type PageForm = {
  title: string
  meta_description: string
  content: string
  is_published: boolean
  show_in_footer: boolean
}

function getPublicPath(pageKey: string) {
  return `/${pageKey}`
}

function formatPageDate(value?: string | null) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function getPageLabel(page: AdminPageItem) {
  if (page.key === 'privacy') return 'Privacy Policy'
  if (page.key === 'terms') return 'Terms of Use'
  if (page.key === 'cookies') return 'Cookie Policy'
  if (page.key === 'faq') return 'FAQ'

  return page.title
}

function getPageIcon(pageKey: string) {
  if (pageKey === 'privacy') return 'bi-shield-lock'
  if (pageKey === 'terms') return 'bi-file-earmark-text'
  if (pageKey === 'cookies') return 'bi-cookie'
  if (pageKey === 'faq') return 'bi-question-circle'

  return 'bi-file-earmark'
}

function createFormFromPage(page: AdminPageItem): PageForm {
  return {
    title: page.title || '',
    meta_description: page.meta_description || '',
    content: page.content || '',
    is_published: Boolean(page.is_published),
    show_in_footer: Boolean(page.show_in_footer),
  }
}

function extractPageFromDetail(response: AdminPageDetailResponse) {
  if ('page' in response && response.page) return response.page
  if ('item' in response && response.item) return response.item
  if ('id' in response) return response

  return null
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function getContentPreview(value: string) {
  const clean = stripHtml(value || '')

  if (!clean) return 'No content yet.'
  if (clean.length <= 130) return clean

  return `${clean.slice(0, 130)}...`
}

function PagesTab({ onShowToast }: Props) {
  const [pages, setPages] = useState<AdminPageItem[]>([])
  const [search, setSearch] = useState('')

  const [selectedPage, setSelectedPage] = useState<AdminPageItem | null>(null)
  const [form, setForm] = useState<PageForm | null>(null)

  const [loadingPages, setLoadingPages] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  const [editorOpen, setEditorOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const filteredPages = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase()

    if (!cleanSearch) return pages

    return pages.filter((page) => {
      return (
        page.title.toLowerCase().includes(cleanSearch) ||
        page.key.toLowerCase().includes(cleanSearch) ||
        page.slug.toLowerCase().includes(cleanSearch) ||
        (page.meta_description || '').toLowerCase().includes(cleanSearch)
      )
    })
  }, [pages, search])

  const updateForm = <Key extends keyof PageForm>(
    key: Key,
    value: PageForm[Key]
  ) => {
    setForm((currentForm) =>
      currentForm
        ? {
            ...currentForm,
            [key]: value,
          }
        : currentForm
    )

    setIsDirty(true)
  }

  const loadPages = async () => {
    setLoadingPages(true)
    setError(false)

    try {
      const response = await adminFetch<AdminPagesListResponse>(
        '/api/admin/pages'
      )

      const items = Array.isArray(response)
        ? response
        : response.items || response.pages || []

      setPages(items)
    } catch {
      setError(true)
      onShowToast('error', 'Could not load pages.')
    } finally {
      setLoadingPages(false)
    }
  }

  const openPageEditor = async (pageId: number, fallbackPage?: AdminPageItem) => {
    setEditorOpen(true)
    setPreviewOpen(false)
    setIsDirty(false)
    setLoadingDetail(true)

    if (fallbackPage) {
      setSelectedPage(fallbackPage)
      setForm(createFormFromPage(fallbackPage))
    } else {
      setSelectedPage(null)
      setForm(null)
    }

    try {
      const response = await adminFetch<AdminPageDetailResponse>(
        `/api/admin/pages/${pageId}`
      )

      const page = extractPageFromDetail(response)

      if (!page) {
        throw new Error('Could not load page details.')
      }

      setSelectedPage(page)
      setForm(createFormFromPage(page))
    } catch (error) {
      onShowToast(
        'error',
        error instanceof Error ? error.message : 'Could not load page details.'
      )
      setEditorOpen(false)
      setSelectedPage(null)
      setForm(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  const closeEditor = () => {
    if (saving) return

    setEditorOpen(false)
    setSelectedPage(null)
    setForm(null)
    setPreviewOpen(false)
    setIsDirty(false)
  }

  const savePage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedPage || !form) return

    if (!form.title.trim()) {
      onShowToast('error', 'Page title is required.')
      return
    }

    if (!form.content.trim()) {
      onShowToast('error', 'Page content is required.')
      return
    }

    setSaving(true)

    try {
      const response = await adminMutation<AdminPageUpdateResponse>(
        `/api/admin/pages/${selectedPage.id}`,
        'PUT',
        {
          title: form.title.trim(),
          meta_description: form.meta_description.trim(),
          content: form.content,
          is_published: form.is_published,
          show_in_footer: form.show_in_footer,
        }
      )

      if (response.success === false) {
        throw new Error(response.message || 'Could not update page.')
      }

      const updatedPage =
        response.page ||
        response.item || {
          ...selectedPage,
          ...form,
        }

      setSelectedPage(updatedPage)
      setForm(createFormFromPage(updatedPage))
      setIsDirty(false)

      setPages((currentPages) =>
        currentPages.map((page) =>
          page.id === updatedPage.id
            ? {
                ...page,
                ...updatedPage,
              }
            : page
        )
      )

      onShowToast('success', response.message || 'Page updated successfully.')
    } catch (error) {
      onShowToast(
        'error',
        error instanceof Error ? error.message : 'Could not update page.'
      )
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadPages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="admin-pages-page">
      <div className="admin-page-header">
        <div>
          <h1>Pages</h1>
          <p>Manage the public policy and information pages.</p>
        </div>
        <span className="admin-page-count">{pages.length} pages</span>
      </div>

      {error && <div className="admin-alert-error">Could not load pages.</div>}

      <section className="admin-pages-list-shell">
        <div className="admin-pages-toolbar">
          <div>
            <h2>System Pages</h2>
            <p>Select a page to edit its title, content, and visibility.</p>
          </div>

          <form
            className="admin-pages-search"
            onSubmit={(event) => event.preventDefault()}
          >
            <i className="bi bi-search"></i>

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search pages..."
            />

            {search.trim() && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            )}
          </form>
        </div>

        <div className="admin-pages-list-meta">
          <span>
            Showing {filteredPages.length} of {pages.length} page
            {pages.length === 1 ? '' : 's'}
          </span>

          {search.trim() && (
            <span>
              Search: <span>{search.trim()}</span>
            </span>
          )}
        </div>

        {loadingPages && pages.length === 0 ? (
          <div className="admin-pages-empty-list">
            <div className="admin-boot-spinner"></div>
            <span>Loading pages...</span>
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="admin-pages-empty-list">
            <i className="bi bi-file-earmark-text"></i>
            <span>No pages found.</span>
          </div>
        ) : (
          <div className="admin-pages-grid">
            {filteredPages.map((page) => (
              <article className="admin-pages-card" key={page.id}>
                <div className="admin-pages-card-top">
                  <div className="admin-pages-card-icon">
                    <i className={`bi ${getPageIcon(page.key)}`}></i>
                  </div>

                  <div className="admin-pages-card-badges">
                    {page.is_system && <span>System</span>}
                    <em className={page.is_published ? 'published' : 'draft'}>
                      {page.is_published ? 'Published' : 'Draft'}
                    </em>
                  </div>
                </div>

                <h3>{getPageLabel(page)}</h3>

                <div className="admin-pages-card-path">
                  {getPublicPath(page.key)}
                </div>

                <p>{getContentPreview(page.content)}</p>

                <div className="admin-pages-card-info">
                  <span>Key: {page.key}</span>
                  <span>Updated: {formatPageDate(page.updated_at)}</span>
                </div>

                <div className="admin-pages-card-actions">
                  {page.is_published && (
                    <a
                      href={getPublicPath(page.key)}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-btn admin-btn-ghost"
                    >
                      <i className="bi bi-box-arrow-up-right"></i>
                      View
                    </a>
                  )}

                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={() => openPageEditor(page.id, page)}
                  >
                    <i className="bi bi-pencil-square"></i>
                    Edit
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editorOpen && (
        <div
          className="admin-pages-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              closeEditor()
            }
          }}
        >
          <div className="admin-pages-modal">
            <div className="admin-pages-modal-head">
              <div>
                <h2>{selectedPage ? getPageLabel(selectedPage) : 'Edit Page'}</h2>

                {selectedPage && (
                  <p>
                    {getPublicPath(selectedPage.key)} · Last updated{' '}
                    {formatPageDate(selectedPage.updated_at)}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                aria-label="Close editor"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {loadingDetail || !selectedPage || !form ? (
              <div className="admin-pages-modal-loading">
                <div className="admin-boot-spinner"></div>
                <span>Loading page details...</span>
              </div>
            ) : (
              <form className="admin-pages-form" onSubmit={savePage}>
                <div className="admin-two-col">
                  <div className="admin-form-field">
                    <label>Page Title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(event) =>
                        updateForm('title', event.target.value)
                      }
                      placeholder="Privacy Policy"
                    />
                  </div>

                  <div className="admin-form-field">
                    <label>Meta Description</label>
                    <input
                      type="text"
                      value={form.meta_description}
                      onChange={(event) =>
                        updateForm('meta_description', event.target.value)
                      }
                      placeholder="Short SEO description"
                    />
                  </div>
                </div>

                <div className="admin-pages-toggles">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.is_published}
                      onChange={(event) =>
                        updateForm('is_published', event.target.checked)
                      }
                    />
                    <span>Published</span>
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={form.show_in_footer}
                      onChange={(event) =>
                        updateForm('show_in_footer', event.target.checked)
                      }
                    />
                    <span>Show in footer</span>
                  </label>

                  {isDirty && <em>Unsaved changes</em>}
                </div>

                <div className="admin-form-field">
                  <label>Content HTML</label>
                  <textarea
                    className="admin-pages-content-editor"
                    value={form.content}
                    onChange={(event) =>
                      updateForm('content', event.target.value)
                    }
                    placeholder="<h2>Section title</h2><p>Your content...</p>"
                    rows={15}
                  ></textarea>

                  <p className="admin-field-help">
                    This content supports HTML because the public page renders
                    saved HTML.
                  </p>
                </div>

                {previewOpen && (
                  <div className="admin-pages-preview">
                    <div className="admin-pages-preview-head">
                      <span>Preview</span>
                    </div>

                    <div
                      className="admin-pages-preview-content"
                      dangerouslySetInnerHTML={{ __html: form.content }}
                    />
                  </div>
                )}

                <div className="admin-pages-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost"
                    disabled={saving}
                    onClick={() => setPreviewOpen((open) => !open)}
                  >
                    <i className="bi bi-eye"></i>
                    {previewOpen ? 'Hide Preview' : 'Preview'}
                  </button>

                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost"
                    disabled={saving}
                    onClick={() => {
                      setForm(createFormFromPage(selectedPage))
                      setIsDirty(false)
                    }}
                  >
                    Reset
                  </button>

                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <span className="admin-button-spinner"></span>
                    ) : (
                      <i className="bi bi-save"></i>
                    )}
                    {saving ? 'Saving' : 'Save page'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PagesTab