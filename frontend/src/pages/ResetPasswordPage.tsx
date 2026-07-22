import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import './ResetPasswordPage.css'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: number
  message: string
  type: ToastType
}

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { token } = useParams()

  const [checkingToken, setCheckingToken] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
    if (!token) {
      sessionStorage.setItem(
        'flixhd_auth_toast',
        JSON.stringify({
          message: 'This reset link is invalid or has expired.',
          type: 'error',
        })
      )

      navigate('/forgot-password', { replace: true })
      return
    }

    fetch(`/api/reset-password/${token}/status`, {
      credentials: 'include',
    })
      .then(async (response) => {
        const data = await response.json()

        if (!response.ok || !data.valid) {
          sessionStorage.setItem(
            'flixhd_auth_toast',
            JSON.stringify({
              message: data.error || 'This reset link is invalid or has expired.',
              type: 'error',
            })
          )

          navigate('/forgot-password', { replace: true })
          return
        }

        setCheckingToken(false)
      })
      .catch((error) => {
        console.error(error)

        sessionStorage.setItem(
          'flixhd_auth_toast',
          JSON.stringify({
            message: 'Unable to verify reset link. Please try again.',
            type: 'error',
          })
        )

        navigate('/forgot-password', { replace: true })
      })
  }, [token, navigate])

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token) {
      showToast('Invalid reset link.', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/reset-password/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        showToast(data.message || 'Password updated successfully.', 'success')

        setTimeout(() => {
          navigate(data.redirect || '/login')
        }, 900)

        return
      }

      showToast(data.error || 'Unable to reset password.', 'error')
    } catch (error) {
      console.error(error)
      showToast('Something went wrong. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const renderToastContainer = () => (
    <div id="toast-container" className="reset-toast-container">
      {toasts.map((toast) => {
        const isExiting = exitingToastIds.includes(toast.id)

        return (
          <div
            key={toast.id}
            className={`reset-toast ${
              isExiting ? 'reset-toast-exit-active' : 'reset-toast-enter-active'
            } ${
              toast.type === 'error'
                ? 'reset-toast-error'
                : toast.type === 'info'
                  ? 'reset-toast-info'
                  : 'reset-toast-success'
            }`}
          >
            <span className="reset-toast-icon">
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

            <span className="reset-toast-message">{toast.message}</span>
          </div>
        )
      })}
    </div>
  )

  if (checkingToken) {
    return (
      <div className="reset-page">
        <div className="reset-ott-background"></div>
        <div className="reset-vignette-overlay"></div>

        <header className="reset-header">
          <Link to="/" className="reset-logo-link">
            <div className="reset-logo">
              Flix<span>HD</span>
            </div>
          </Link>
        </header>

        {renderToastContainer()}

        <main className="reset-main">
          <div className="reset-card reset-card-animate">
            <h1 className="reset-title">Checking Link</h1>

            <p className="reset-description">
              Please wait while we verify your password reset link.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="reset-page">
      <div className="reset-ott-background"></div>
      <div className="reset-vignette-overlay"></div>

      <header className="reset-header">
        <Link to="/" className="reset-logo-link">
          <div className="reset-logo">
            Flix<span>HD</span>
          </div>
        </Link>
      </header>

      {renderToastContainer()}

      <main className="reset-main">
        <div className="reset-card reset-card-animate">
          <h1 className="reset-title">Reset Password</h1>

          <p className="reset-description">
            Enter your new password below to complete your password reset.
          </p>

          <form
            onSubmit={handleResetPassword}
            id="resetPasswordForm"
            className="reset-form"
          >
            <div className="reset-input-group">
              <input
                type="password"
                id="new_password"
                name="new_password"
                className="reset-custom-input"
                placeholder="Enter new password"
                required
                autoFocus
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />

              <input
                type="password"
                id="confirm_password"
                name="confirm_password"
                className="reset-custom-input"
                placeholder="Confirm new password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>

            <button
              type="submit"
              id="resetPasswordButton"
              className={`reset-primary-btn ${
                loading ? 'reset-primary-btn-loading' : ''
              }`}
              disabled={loading}
            >
              <span id="buttonText">{loading ? 'Updating...' : 'Update Password'}</span>

              {loading && (
                <svg
                  id="buttonSpinner"
                  className="reset-button-spinner"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="reset-spinner-circle"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="reset-spinner-path"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
            </button>
          </form>

          <div className="reset-extra">
            <p>
              Remember your password?
              <Link to="/login"> Sign In now</Link>.
            </p>
          </div>
        </div>
      </main>

      <footer className="reset-footer">
        <div className="reset-footer-inner">
          <p className="reset-footer-question">Questions? Call 000-800-919-1694</p>

          <div className="reset-footer-grid">
            <a href="#">FAQ</a>
            <a href="#">Help Center</a>
            <a href="/terms">Terms of Use</a>
            <a href="/privacy">Privacy</a>
            <a href="#">Cookie Preferences</a>
            <a href="#">Corporate Information</a>
          </div>

          <div className="reset-language-wrap">
            <span className="reset-language-globe">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
              </svg>
            </span>

            <select className="reset-language-select">
              <option>English</option>
              <option>Español</option>
            </select>

            <span className="reset-language-chevron">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>

          <p className="reset-footer-copy">© 2024 FlixHD Inc.</p>
        </div>
      </footer>
    </div>
  )
}

export default ResetPasswordPage