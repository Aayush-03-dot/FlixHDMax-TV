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
      await loginUser(email, password)
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
          <small>TV</small>
        </header>

        <main className="tv-login-main">
          <section className="tv-login-panel">
            <p className="tv-kicker">FlixHDMax TV</p>
            <h1>Sign in</h1>
            <p className="tv-login-copy">
              Use your FlixHDMax account.
            </p>

            <form onSubmit={handleSubmit} className="tv-login-form">
              <label>
                <span>Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  data-tv-focusable="true"
                  data-tv-autofocus="true"
                  data-tv-key="login-email"
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
                    required
                    data-tv-focusable="true"
                    data-tv-key="login-password"
                  />
                  <button
                    type="button"
                    className="tv-icon-button tv-focusable"
                    onClick={() => setShowPassword((current) => !current)}
                    data-tv-focusable="true"
                    data-tv-key="login-show-password"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </div>
              </label>

              {error && <div className="tv-login-error">{error}</div>}

              <button
                type="submit"
                className="tv-primary-button tv-login-submit tv-focusable"
                disabled={loading}
                data-tv-focusable="true"
                data-tv-key="login-submit"
              >
                <LogIn aria-hidden="true" />
                {loading ? 'Signing in' : 'Sign in'}
              </button>
            </form>
          </section>
        </main>
      </div>
    </TVStandalonePage>
  )
}

export default TVLoginPage
