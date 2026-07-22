import { useEffect, useState } from 'react'

import Footer from '../components/Footer'
import { apiGet } from '../services/api'
import './SystemPage.css'

type PageKey = 'privacy' | 'terms' | 'cookies' | 'faq'

type SystemPageData = {
  id: number
  key: string
  title: string
  content: string
  updated_at?: string | null
}

type SystemPageResponse = {
  success: boolean
  page: SystemPageData
  message?: string
}

type SystemPageProps = {
  pageKey: PageKey
}

function formatDate(value?: string | null) {
  if (!value) return ''

  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

function SystemPage({ pageKey }: SystemPageProps) {
  const [page, setPage] = useState<SystemPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setLoading(true)
    setFailed(false)

    apiGet<SystemPageResponse>(`/api/pages/${pageKey}`)
      .then((response) => {
        setPage(response.page)
      })
      .catch(() => {
        setFailed(true)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [pageKey])

  return (
    <>
      

      <main className="system-page">
        <section className="system-page-hero">
          <div className="system-page-container">
            <div className="system-page-eyebrow">
              <i className="bi bi-file-earmark-text-fill"></i>
              FlixHD Policy
            </div>

            <h1>{page?.title || (pageKey === 'privacy' ? 'Privacy Policy' : 'Terms of Use')}</h1>

            {page?.updated_at && (
              <p>Last updated {formatDate(page.updated_at)}</p>
            )}
          </div>
        </section>

        <section className="system-page-content-section">
          <div className="system-page-container">
            {loading && (
              <div className="system-page-card">
                <div className="system-page-skeleton-title"></div>
                <div className="system-page-skeleton-line"></div>
                <div className="system-page-skeleton-line"></div>
                <div className="system-page-skeleton-line short"></div>
              </div>
            )}

            {!loading && failed && (
              <div className="system-page-card system-page-empty">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <h2>Page unavailable</h2>
                <p>This page could not be loaded right now.</p>
              </div>
            )}

            {!loading && !failed && page && (
              <article className="system-page-card">
                <div
                  className="system-page-content"
                  dangerouslySetInnerHTML={{ __html: page.content || '' }}
                />
              </article>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

export default SystemPage