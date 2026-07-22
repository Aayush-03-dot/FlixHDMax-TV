import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './RegisterPage.css'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: number
  message: string
  type: ToastType
}

function RegisterPage() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username,
          email,
          password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        showToast(data.message || 'Account created successfully!', 'success')

        setTimeout(() => {
          if (data.redirect) {
            navigate(data.redirect)
          } else if (data.needs_verification) {
            navigate('/verify-email')
          } else {
            navigate('/login')
          }
        }, 800)

        return
      }

      showToast(data.error || 'Registration failed.', 'error')
    } catch (error) {
      console.error(error)
      showToast('Something went wrong. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      <div className="register-ott-background"></div>
      <div className="register-vignette-overlay"></div>

      <header className="register-header">
        <a href="/" className="register-logo-link">
          <div className="register-logo">
            Flix<span>HD</span>
          </div>
        </a>

        <a href="/login" className="register-signin-link">
          Sign In
        </a>
      </header>

      <div id="toast-container" className="register-toast-container">
        {toasts.map((toast) => {
          const isExiting = exitingToastIds.includes(toast.id)

          return (
            <div
              key={toast.id}
              className={`register-toast ${
                isExiting ? 'register-toast-exit-active' : 'register-toast-enter-active'
              } ${
                toast.type === 'error'
                  ? 'register-toast-error'
                  : toast.type === 'info'
                    ? 'register-toast-info'
                    : 'register-toast-success'
              }`}
            >
              <span className="register-toast-icon">
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

              <span className="register-toast-message">{toast.message}</span>
            </div>
          )
        })}
      </div>

      <main className="register-main">
        <div className="register-card register-card-animate">
          <h1 className="register-title">Create Account</h1>

          <form onSubmit={handleRegister} id="registerForm" className="register-form">
            <div>
              <input
                type="text"
                id="username"
                name="username"
                className="register-custom-input"
                placeholder="Choose a username"
                required
                autoFocus
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>

            <div>
              <input
                type="email"
                id="email"
                name="email"
                className="register-custom-input"
                placeholder="Email address"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div>
              <input
                type="password"
                id="password"
                name="password"
                className="register-custom-input"
                placeholder="Password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <div className="register-submit-wrap">
              <button
                type="submit"
                id="createAccountButton"
                className={`register-primary-btn ${
                  loading ? 'register-primary-btn-loading' : ''
                }`}
                disabled={loading}
              >
                <span id="buttonText">
                  {loading ? 'Creating Account...' : 'Create Account'}
                </span>

                {loading && (
                  <svg
                    id="buttonSpinner"
                    className="register-button-spinner"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="register-spinner-circle"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="register-spinner-path"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
              </button>
            </div>
          </form>

          <div className="register-extra">
            <p>
              Already have an account?
              <a href="/login"> Sign In</a>
            </p>

            <p className="register-terms-copy">
              By clicking Create Account, you agree to our Terms of Use and Privacy Policy.
            </p>
          </div>
        </div>
      </main>

      <footer className="register-footer">
        <div className="register-footer-inner">
          <p className="register-footer-question">Questions? Call 000-800-919-1694</p>

          <div className="register-footer-grid">
            <a href="#">FAQ</a>
            <a href="#">Help Center</a>
            <a href="/terms">Terms of Use</a>
            <a href="/privacy">Privacy</a>
            <a href="#">Cookie Preferences</a>
            <a href="#">Corporate Information</a>
          </div>

          <div className="register-language-wrap">
            <span className="register-language-globe">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
              </svg>
            </span>

            <select className="register-language-select">
              <option>English</option>
              <option>Español</option>
            </select>

            <span className="register-language-chevron">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>

          <p className="register-footer-copy">© 2024 FlixHD Inc.</p>
        </div>
      </footer>
    </div>
  )
}

export default RegisterPage