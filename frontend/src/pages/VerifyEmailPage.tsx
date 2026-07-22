import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './VerifyEmailPage.css'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: number
  message: string
  type: ToastType
}

function VerifyEmailPage() {
  const navigate = useNavigate()

  const [otp, setOtp] = useState('')
  const [email, setEmail] = useState('your email')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
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
    }, 4000)
  }

  useEffect(() => {
    fetch('/api/verify-email/status', {
      credentials: 'include',
    })
      .then(async (response) => {
        const data = await response.json()

        if (!response.ok) {
          sessionStorage.setItem(
            'flixhd_auth_toast',
            JSON.stringify({
              message: data.error || 'Please register first.',
              type: 'error',
            })
          )

          navigate('/register', { replace: true })
          return
        }

        if (data.email) {
          setEmail(data.email)
        }
      })
      .catch((error) => {
        console.error(error)
        showToast('Unable to load verification session.', 'error')
      })
  }, [navigate])

  useEffect(() => {
    if (resendCooldown <= 0) return

    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(current - 1, 0))
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [resendCooldown])

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          otp,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        showToast(data.message || 'Account verified successfully!', 'success')

        setTimeout(() => {
          navigate(data.redirect || '/login')
        }, 800)

        return
      }

      if (data.redirect) {
        sessionStorage.setItem(
          'flixhd_auth_toast',
          JSON.stringify({
            message: data.error || 'Please register first.',
            type: 'error',
          })
        )

        navigate(data.redirect, { replace: true })
        return
      }

      showToast(data.error || 'Invalid verification code.', 'error')
    } catch (error) {
      console.error(error)
      showToast('Something went wrong. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setResendLoading(true)

    try {
      const response = await fetch('/api/verify-email/resend', {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok) {
        if (data.email) {
          setEmail(data.email)
        }

        showToast(data.message || 'A new verification code has been sent.', 'success')
        setResendCooldown(data.cooldown_seconds || 60)
        return
      }

      if (response.status === 429) {
        setResendCooldown(data.retry_after || 60)
        showToast(data.error || 'Please wait before requesting another code.', 'info')
        return
      }

      if (data.redirect) {
        sessionStorage.setItem(
          'flixhd_auth_toast',
          JSON.stringify({
            message: data.error || 'Please register first.',
            type: 'error',
          })
        )

        navigate(data.redirect, { replace: true })
        return
      }

      showToast(data.error || 'Could not resend verification code.', 'error')
    } catch (error) {
      console.error(error)
      showToast('Something went wrong. Please try again.', 'error')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="verify-page">
      <div className="verify-ott-background"></div>
      <div className="verify-vignette-overlay"></div>

      <header className="verify-header">
        <a href="/" className="verify-logo-link">
          <div className="verify-logo">
            Flix<span>HD</span>
          </div>
        </a>
      </header>

      <div id="toast-container" className="verify-toast-container">
        {toasts.map((toast) => {
          const isExiting = exitingToastIds.includes(toast.id)

          return (
            <div
              key={toast.id}
              className={`verify-toast ${
                isExiting ? 'verify-toast-exit-active' : 'verify-toast-enter-active'
              } ${
                toast.type === 'error'
                  ? 'verify-toast-error'
                  : toast.type === 'info'
                    ? 'verify-toast-info'
                    : 'verify-toast-success'
              }`}
            >
              <span className="verify-toast-icon">
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

              <span className="verify-toast-message">{toast.message}</span>
            </div>
          )
        })}
      </div>

      <main className="verify-main">
        <div className="verify-card verify-card-animate">
          <div className="verify-card-heading">
            <div className="verify-mail-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M22 10.5V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h8" />
                <path d="M22 7l-10 6L2 7" />
                <path d="M16 19l2 2 4-4" />
              </svg>
            </div>

            <h1 className="verify-title">Verify Account</h1>

            <p className="verify-subtitle">
              We&apos;ve sent a 6-digit code to <br />
              <span>{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerify} id="verifyForm" className="verify-form">
            <div>
              <input
                type="text"
                id="otp"
                name="otp"
                className="verify-custom-input verify-otp-input"
                placeholder="000000"
                maxLength={6}
                autoComplete="one-time-code"
                required
                autoFocus
                value={otp}
                onChange={(event) => {
                  const value = event.target.value.replace(/\D/g, '').slice(0, 6)
                  setOtp(value)
                }}
              />
            </div>

            <button
              type="submit"
              id="verifyButton"
              className={`verify-primary-btn ${
                loading ? 'verify-primary-btn-loading' : ''
              }`}
              disabled={loading}
            >
              <span id="buttonText">{loading ? 'Verifying...' : 'Verify Code'}</span>

              {loading && (
                <svg
                  id="buttonSpinner"
                  className="verify-button-spinner"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="verify-spinner-circle"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="verify-spinner-path"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
            </button>
          </form>

          <div className="verify-back-section">
            <p className="verify-resend-text">Didn&apos;t receive the code?</p>

            <button
              type="button"
              className="verify-resend-button"
              onClick={handleResendOtp}
              disabled={resendLoading || resendCooldown > 0}
            >
              {resendLoading
                ? 'Sending...'
                : resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : 'Resend Code'}
            </button>

            <p className="verify-back-copy">
              Entered the wrong email?
              <a href="/register"> Go back to registration</a>.
            </p>
          </div>
        </div>
      </main>

      <footer className="verify-footer">
        <div className="verify-footer-inner">
          <div className="verify-footer-links">
            <a href="/terms">Terms of Use</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="#">Help Center</a>
          </div>

          <p>© 2024 FlixHD Inc.</p>
        </div>
      </footer>
    </div>
  )
}

export default VerifyEmailPage