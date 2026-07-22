import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './ForgotPasswordPage.css'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: number
  message: string
  type: ToastType
}

function ForgotPasswordPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [exitingToastIds, setExitingToastIds] = useState<number[]>([])

  const showToast = (message: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random()

    setToasts((prev) => [
      ...prev,
      {
        id,
        message,
        type,
      },
    ])

    setTimeout(() => {
      setExitingToastIds((prev) => [...prev, id])

      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
        setExitingToastIds((prev) => prev.filter((toastId) => toastId !== id))
      }, 300)
    }, 4500)
  }

  useEffect(() => {
    const storedToast = sessionStorage.getItem('flixhd_auth_toast')

    if (!storedToast) return

    try {
      const toast = JSON.parse(storedToast) as {
        message?: string
        type?: ToastType
      }

      showToast(
        toast.message || 'This reset link is invalid or has expired.',
        toast.type || 'error'
      )
    } catch (error) {
      console.error(error)
    } finally {
      sessionStorage.removeItem('flixhd_auth_toast')
    }
  }, [])

  const handleForgotPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        showToast(
          data.message ||
            'If an account with that email exists, a password reset link has been sent.',
          'success'
        )

        setTimeout(() => {
          navigate(data.redirect || '/login')
        }, 900)

        return
      }

      showToast(data.error || 'Unable to send reset link.', 'error')
    } catch (error) {
      console.error(error)
      showToast('Something went wrong. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="forgot-page">
      <div className="forgot-ott-background"></div>
      <div className="forgot-vignette-overlay"></div>

      <header className="forgot-header">
        <Link to="/" className="forgot-logo-link">
          <div className="forgot-logo">
            Flix<span>HD</span>
          </div>
        </Link>
      </header>

      <div id="toast-container" className="forgot-toast-container">
        {toasts.map((toast) => {
          const isExiting = exitingToastIds.includes(toast.id)

          return (
            <div
              key={toast.id}
              className={`forgot-toast ${
                isExiting ? 'forgot-toast-exit-active' : 'forgot-toast-enter-active'
              } ${
                toast.type === 'error'
                  ? 'forgot-toast-error'
                  : toast.type === 'info'
                    ? 'forgot-toast-info'
                    : 'forgot-toast-success'
              }`}
            >
              <span className="forgot-toast-icon">
                {toast.type === 'error' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                ) : toast.type === 'info' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                )}
              </span>

              <span className="forgot-toast-message">{toast.message}</span>
            </div>
          )
        })}
      </div>

      <main className="forgot-main">
        <div className="forgot-card forgot-card-animate">
          <h1 className="forgot-title">Forgot Password?</h1>

          <p className="forgot-description">
            Enter the email associated with your account and we&apos;ll send you a secure
            password reset link.
          </p>

          <form
            onSubmit={handleForgotPassword}
            id="forgotPasswordForm"
            className="forgot-form"
          >
            <div className="forgot-input-wrap">
              <input
                type="email"
                id="email"
                name="email"
                className="forgot-custom-input"
                placeholder="Your email address"
                required
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <button
              type="submit"
              id="sendResetButton"
              className={`forgot-primary-btn ${
                loading ? 'forgot-primary-btn-loading' : ''
              }`}
              disabled={loading}
            >
              <span id="buttonText">{loading ? 'Sending...' : 'Send Reset Link'}</span>

              {loading && (
                <svg
                  id="buttonSpinner"
                  className="forgot-button-spinner"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="forgot-spinner-circle"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="forgot-spinner-path"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
            </button>
          </form>

          <div className="forgot-extra">
            <p>
              Remember your password?
              <Link to="/login"> Sign In now</Link>.
            </p>
          </div>
        </div>
      </main>

      <footer className="forgot-footer">
        <div className="forgot-footer-inner">
          <p className="forgot-footer-question">Questions? Call 000-800-919-1694</p>

          <div className="forgot-footer-grid">
            <a href="#">FAQ</a>
            <a href="#">Help Center</a>
            <a href="/terms">Terms of Use</a>
            <a href="/privacy">Privacy</a>
            <a href="#">Cookie Preferences</a>
            <a href="#">Corporate Information</a>
          </div>

          <div className="forgot-language-wrap">
            <span className="forgot-language-globe">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
              </svg>
            </span>

            <select className="forgot-language-select">
              <option>English</option>
              <option>Español</option>
            </select>

            <span className="forgot-language-chevron">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>

          <p className="forgot-footer-copy">© 2024 FlixHD Inc.</p>
        </div>
      </footer>
    </div>
  )
}

export default ForgotPasswordPage