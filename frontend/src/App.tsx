import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import TVGuestRoute from './tv/components/TVGuestRoute'
import TVProtectedRoute from './tv/components/TVProtectedRoute'
import TVHomePage from './tv/pages/TVHomePage'
import TVIframePlayerPage from './tv/pages/TVIframePlayerPage'
import TVLoginPage from './tv/pages/TVLoginPage'
import TVMovieDetailPage from './tv/pages/TVMovieDetailPage'
import TVMyListPage from './tv/pages/TVMyListPage'
import TVProfilePage from './tv/pages/TVProfilePage'
import TVSearchPage from './tv/pages/TVSearchPage'
import TVSeriesDetailPage from './tv/pages/TVSeriesDetailPage'
import TVVideoUnavailablePage from './tv/pages/TVVideoUnavailablePage'
import './tv/tv.css'

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <TVProtectedRoute>
            <TVHomePage />
          </TVProtectedRoute>
        }
      />
      <Route
        path="/login"
        element={
          <TVGuestRoute>
            <TVLoginPage />
          </TVGuestRoute>
        }
      />
      <Route
        path="/search"
        element={
          <TVProtectedRoute>
            <TVSearchPage />
          </TVProtectedRoute>
        }
      />
      <Route
        path="/movies"
        element={
          <TVProtectedRoute>
            <TVHomePage mode="movie" />
          </TVProtectedRoute>
        }
      />
      <Route
        path="/shows"
        element={
          <TVProtectedRoute>
            <TVHomePage mode="series" />
          </TVProtectedRoute>
        }
      />
      <Route
        path="/my-list"
        element={
          <TVProtectedRoute>
            <TVMyListPage />
          </TVProtectedRoute>
        }
      />
      <Route
        path="/movie/:movieId"
        element={
          <TVProtectedRoute>
            <TVMovieDetailPage />
          </TVProtectedRoute>
        }
      />
      <Route
        path="/series/:seriesId"
        element={
          <TVProtectedRoute>
            <TVSeriesDetailPage />
          </TVProtectedRoute>
        }
      />
      <Route
        path="/player/:contentType/:contentId"
        element={
          <TVProtectedRoute>
            <TVIframePlayerPage />
          </TVProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <TVProtectedRoute>
            <TVProfilePage />
          </TVProtectedRoute>
        }
      />
      <Route
        path="/video-unavailable"
        element={
          <TVProtectedRoute>
            <TVVideoUnavailablePage />
          </TVProtectedRoute>
        }
      />
      <Route path="/tv/*" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
