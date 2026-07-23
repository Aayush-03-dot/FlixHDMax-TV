import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { loginUser } from '../../services/auth'
import TVStandalonePage from '../components/TVStandalonePage'
import { tvPath } from '../utils'

function TVLoginPage() {
  const navigate = useNavigate()
  const { refreshAuth } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await loginUser(email.trim(), password)
      await refreshAuth()
      navigate(tvPath('/'), { replace: true })
    } catch (loginError: unknown) {
      const message =
        typeof loginError === 'object' &&
        loginError !== null &&
        'error' in loginError &&
        typeof loginError.error === 'string'
          ? loginError.error
          : 'The email or password is incorrect.'

      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <TVStandalonePage>
      <div className="tv-login-page">
        <div className="tv-login-backdrop" />
        <div className="tv-login-shade" />

        <header className="tv-login-brand">
          <img src="/favicon1.png" alt="FlixHDMax" />
          <span>TV</span>
        </header>

        <main className="tv-login-main">
          <section className="tv-login-panel">
            <p className="tv-kicker">Welcome back</p>
            <h1>Sign in</h1>
            <p className="tv-login-copy">
              Select a field to open the Fire TV keyboard. The keyboard includes
              Clear, Cancel and Done controls.
            </p>

            <form
              onSubmit={handleSubmit}
              className="tv-login-form"
              data-tv-group="login-fields"
            >
              <label>
                <span>Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  enterKeyHint="next"
                  required
                  aria-label="Email address"
                  data-tv-focusable="true"
                  data-tv-autofocus="true"
                  data-tv-key="login-email"
                  data-tv-group="login-fields"
                  data-tv-input-label="Email address"
                  data-tv-input-type="email"
                  data-tv-next-down="login-password"
                />
              </label>

              <label>
                <span>Password</span>
                <div className="tv-password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    enterKeyHint="done"
                    required
                    aria-label="Password"
                    data-tv-focusable="true"
                    data-tv-key="login-password"
                    data-tv-group="login-fields"
                    data-tv-input-label="Password"
                    data-tv-input-type={showPassword ? 'text' : 'password'}
                    data-tv-next-up="login-email"
                    data-tv-next-right="login-password-toggle"
                    data-tv-next-down="login-submit"
                  />

                  <button
                    type="button"
                    className="tv-password-toggle tv-focusable"
                    onClick={() => setShowPassword((current) => !current)}
                    data-tv-focusable="true"
                    data-tv-key="login-password-toggle"
                    data-tv-group="login-fields"
                    data-tv-next-left="login-password"
                    data-tv-next-up="login-email"
                    data-tv-next-down="login-submit"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" />
                    ) : (
                      <Eye aria-hidden="true" />
                    )}
                  </button>
                </div>
              </label>

              {error && <p className="tv-login-error">{error}</p>}

              <button
                type="submit"
                className="tv-primary-button tv-login-submit tv-focusable"
                disabled={loading}
                data-tv-focusable="true"
                data-tv-key="login-submit"
                data-tv-group="login-fields"
                data-tv-next-up="login-password"
              >
                <LogIn aria-hidden="true" />
                {loading ? 'Signing in' : 'Sign in'}
              </button>
            </form>

            <div className="tv-login-remote-hint">
              <span>Remote</span>
              <strong>Up / Down</strong> moves between fields
              <strong>Select</strong> opens the keyboard
            </div>
          </section>
        </main>
      </div>
    </TVStandalonePage>
  )
}

export default TVLoginPage
