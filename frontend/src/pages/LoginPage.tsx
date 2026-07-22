import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginUser } from '../services/auth'
import './LoginPage.css'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: number
  message: string
  type: ToastType
}

function LoginPage() {
  const navigate = useNavigate()
  const { refreshAuth } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
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

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    try {
      const data = await loginUser(email, password)

      showToast(data.message || 'Login successful!', 'success')

      await refreshAuth()

      setTimeout(() => {
        navigate('/')
      }, 700)
    } catch (error: any) {
      if (error?.needs_verification) {
        showToast(
          error.error || 'Your account is awaiting email verification.',
          'info'
        )
      } else {
        showToast(error?.error || 'Invalid email or password.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    setGoogleLoading(true)

    setTimeout(() => {
      window.location.href = '/auth/google/login'
    }, 250)
  }

  return (
    <div className="login-page">
      <div className="ott-background"></div>
      <div className="vignette-overlay"></div>

      <header className="login-header">
        <a href="/" className="login-logo-link">
          <div className="login-logo">
            FlixHD<span>Max</span>
          </div>
        </a>
      </header>

      <main className="login-main">
        <div className="login-card login-card-animate">
          <h1 className="login-title">Sign In</h1>

          <form onSubmit={handleLogin} id="loginForm" className="login-form">
            <div className="login-input-wrap">
              <input
                type="email"
                id="email"
                name="email"
                className="custom-input"
                placeholder="Email or mobile number"
                required
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="login-input-wrap">
              <input
                type="password"
                id="password"
                name="password"
                className="custom-input"
                placeholder="Password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <button
              type="submit"
              id="signInButton"
              className={`sign-in-button ${loading ? 'sign-in-button-loading' : ''}`}
              disabled={loading}
            >
              <span id="buttonText">{loading ? 'Signing In...' : 'Sign In'}</span>

              {loading && (
                <svg
                  id="buttonSpinner"
                  className="button-spinner"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="spinner-circle"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="spinner-path"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
            </button>

            <div className="login-options">
              <div className="remember-row">
                <input type="checkbox" id="remember" className="remember-checkbox" />
                <label htmlFor="remember" className="remember-label">
                  Remember me
                </label>
              </div>

              <a href="/forgot-password" className="need-help-link">
                Need help?
              </a>
            </div>
          </form>

          <div className="login-extra">
            <div className="or-divider">
              <div></div>
              <span>OR</span>
              <div></div>
            </div>

            <button
              id="googleBtn"
              type="button"
              className={`google-button ${googleLoading ? 'google-button-loading' : ''}`}
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                className="google-icon"
                alt="Google"
              />
              <span id="googleBtnText">
                {googleLoading ? 'Redirecting to Google' : 'Sign in with Google'}
              </span>
            </button>

            <div className="signup-section">
              <p className="signup-text">
                New to FlixHDMax?
                <a href="/register" className="signup-link">
                  Sign up now
                </a>
                .
              </p>

              <p className="recaptcha-text">
                This page is protected by Google reCAPTCHA to ensure you're not a bot.
                <a href="#" className="learn-more-link">
                  Learn more.
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      <div id="toast-container" className="toast-container">
        {toasts.map((toast) => {
          const isExiting = exitingToastIds.includes(toast.id)

          return (
            <div
              key={toast.id}
              className={`login-toast ${
                isExiting ? 'toast-exit-active' : 'toast-enter-active'
              } ${
                toast.type === 'error'
                  ? 'toast-error'
                  : toast.type === 'info'
                    ? 'toast-info'
                    : 'toast-success'
              }`}
            >
              <span className="toast-icon">
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

              <span className="toast-message">{toast.message}</span>
            </div>
          )
        })}
      </div>

      <footer className="login-footer">
        <div className="login-footer-inner">
          <p className="footer-question">Questions? Call 000-800-919-1694</p>

          <div className="login-footer-grid">
            <a href="#">FAQ</a>
            <a href="#">Help Center</a>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Use</Link>
            <a href="#">Cookie Preferences</a>
            <a href="#">Corporate Information</a>
            <a href="/contact">Contact us</a>
          </div>

          <div className="language-select-wrap">
            <span className="language-globe">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
              </svg>
            </span>

            <select className="language-select">
              <option>English</option>
              <option>Español</option>
            </select>

            <span className="language-chevron">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>

          <p className="footer-copy">© 2024 FlixHDMax Inc.</p>
        </div>
      </footer>
    </div>
  )
}

export default LoginPage