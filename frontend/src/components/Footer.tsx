import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="pv-footer">
      <div className="container-fluid">
        <div className="row g-4">
          <div className="col-lg-3 col-md-6">
            <div className="pv-footer-logo">
              Flix<span style={{ color: 'var(--brand-teal)' }}>HD</span>
            </div>

            <p style={{ fontSize: '0.8rem', lineHeight: 1.6 }}>
              Premium streaming for movies and series. Watch anywhere, anytime.
            </p>
          </div>

          <div className="col-lg-2 col-md-3 col-6">
            <h6>Browse</h6>

            <a href="/?category=all-movies">Movies</a>
            <a href="/?category=all-series">TV Shows</a>
            <a href="#">New Releases</a>
            <a href="#">Top Rated</a>
          </div>

          <div className="col-lg-2 col-md-3 col-6">
            <h6>Help</h6>

            <a href="/contact">Contact Us</a>
            <a href="/request">Request Content</a>
            <a href="#">FAQ</a>
          </div>

          <div className="col-lg-2 col-md-3 col-6">
            <h6>Legal</h6>

            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Use</Link>
            <a href="#">Cookie Policy</a>
          </div>

          <div className="col-lg-3 col-md-3 col-6">
            <h6>Connect</h6>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginTop: '4px',
              }}
            >
              <a
                href="#"
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '1.2rem',
                }}
                title="Twitter/X"
              >
                <i className="bi bi-twitter-x"></i>
              </a>

              <a
                href="#"
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '1.2rem',
                }}
                title="Instagram"
              >
                <i className="bi bi-instagram"></i>
              </a>

              <a
                href="#"
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '1.2rem',
                }}
                title="YouTube"
              >
                <i className="bi bi-youtube"></i>
              </a>
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            marginTop: '32px',
            paddingTop: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '0.75rem' }}>
            &copy; 2025 FlixHD. All rights reserved.
          </span>

          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-dim)',
            }}
          >
            Made for entertainment purposes
          </span>
        </div>
      </div>
    </footer>
  )
}

export default Footer