import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminLoginPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

type AdminLoginResponse = {
  success: boolean
  message?: string
  admin_path?: string
}

type ToastType = 'success' | 'error'

type ToastItem = {
  id: number
  type: ToastType
  message: string
}

function AdminLoginPage() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const appVersion = __APP_VERSION__
  const currentYear = new Date().getFullYear()

  const canSubmit = useMemo(() => {
    return username.trim().length > 0 && password.length > 0 && !submitting
  }, [username, password, submitting])

  const showToast = (type: ToastType, message: string) => {
    const id = Date.now()

    setToasts((current) => [
      ...current,
      {
        id,
        type,
        message,
      },
    ])

    window.setTimeout(() => {
      setToasts((current) =>
        current.filter((toast) => toast.id !== id)
      )
    }, 3500)
  }

  const dismissToast = (toastId: number) => {
    setToasts((current) =>
      current.filter((toast) => toast.id !== toastId)
    )
  }

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    if (!canSubmit) return

    setSubmitting(true)

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/login`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            username: username.trim(),
            password,
            remember,
          }),
        }
      )

      const data = (await response.json().catch(() => null)) as
        | AdminLoginResponse
        | null

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Invalid credentials')
      }

      showToast(
        'success',
        data.message || 'Admin login successful'
      )

      window.setTimeout(() => {
        navigate(data.admin_path || '/', {
          replace: true,
        })
      }, 300)
    } catch (error) {
      showToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Unable to sign in'
      )
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    document.body.classList.add('admin-login-page-active')

    return () => {
      document.body.classList.remove(
        'admin-login-page-active'
      )
    }
  }, [])

  return (
    <main className="fh-admin-login-page">
      <div
        className="fh-admin-toast-container"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            className={`fh-admin-toast fh-admin-toast-${toast.type}`}
            onClick={() => dismissToast(toast.id)}
          >
            <span
              className="fh-admin-toast-icon"
              aria-hidden="true"
            >
              {toast.type === 'error' ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              )}
            </span>

            <span>{toast.message}</span>
          </button>
        ))}
      </div>

      <header className="fh-admin-login-topbar">
        <a
          href="/"
          className="fh-admin-login-brand"
          aria-label="Return to FlixHDMax"
        >
          <span className="fh-admin-login-brand-icon">
            <img
              src="/favicon2.png"
              alt=""
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          </span>

          <span className="fh-admin-login-brand-name">
            FlixHDMax
          </span>
        </a>

        <span className="fh-admin-login-domain">
          flixhdmax.com
        </span>
      </header>

      <div className="fh-admin-login-content">
        <section
          className="fh-admin-login-panel"
          aria-labelledby="admin-login-title"
        >
          <div className="fh-admin-login-heading">
            <h1 id="admin-login-title">Sign in</h1>

            <p>
              Enter your administrator credentials to
              continue.
            </p>
          </div>

          <form
            className="fh-admin-login-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="fh-admin-login-field">
              <label htmlFor="admin-username">
                Username
              </label>

              <div className="fh-admin-login-input-wrap">
                <input
                  id="admin-username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  placeholder="Username"
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="fh-admin-login-field">
              <label htmlFor="admin-password">
                Password
              </label>

              <div className="fh-admin-login-input-wrap">
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="fh-admin-login-eye"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
                      <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 5.2 9 8a10.8 10.8 0 0 1-2.1 3.8" />
                      <path d="M6.2 6.3C4.1 7.8 3 10.1 3 12c0 2.8 3.5 8 9 8 1.3 0 2.5-.3 3.5-.7" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="fh-admin-login-remember">
              <input
                type="checkbox"
                id="admin-remember"
                checked={remember}
                onChange={(event) =>
                  setRemember(event.target.checked)
                }
              />

              <label htmlFor="admin-remember">
                Keep me signed in
              </label>
            </div>

            <button
              type="submit"
              className="fh-admin-login-submit"
              disabled={!canSubmit}
              aria-busy={submitting}
            >
              {submitting ? (
                <>
                  <span
                    className="fh-admin-login-spinner"
                    aria-hidden="true"
                  />
                  <span>Signing in</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>
        </section>
      </div>

      <footer className="fh-admin-login-footer">
        <span>
          &copy; {currentYear} FlixHDMax
        </span>

        <span className="fh-admin-login-version">
          {appVersion}
        </span>
      </footer>
    </main>
  )
}

export default AdminLoginPage