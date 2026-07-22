import type { ChangeEvent } from 'react'
import type { AddMovieForm as AddMovieFormState } from './adminTypes'

type UpdateAddMovieField = <Key extends keyof AddMovieFormState>(
  key: Key,
  value: AddMovieFormState[Key]
) => void

type Props = {
  addMovieForm: AddMovieFormState
  addMovieSaving: boolean
  tmdbTitleLookup: string
  tmdbIdLookup: string
  tmdbLoading: boolean
  onAddMovieFieldChange: UpdateAddMovieField
  onTmdbTitleLookupChange: (value: string) => void
  onTmdbIdLookupChange: (value: string) => void
  onFetchMovieTmdb: () => void
  onResetAddMovie: () => void
}

function AddMovieForm({
  addMovieForm,
  addMovieSaving,
  tmdbTitleLookup,
  tmdbIdLookup,
  tmdbLoading,
  onAddMovieFieldChange,
  onTmdbTitleLookupChange,
  onTmdbIdLookupChange,
  onFetchMovieTmdb,
  onResetAddMovie,
}: Props) {
  const handleThumbnailChange = (event: ChangeEvent<HTMLInputElement>) => {
    onAddMovieFieldChange('thumbnail', event.target.files?.[0] || null)
  }

  return (
    <>
      <div className="admin-content-form-layout">
        <div className="admin-content-form-main">
          <section className="admin-form-section">
            <div className="admin-form-section-head">
              <span className="admin-section-icon tone-orange">
                <i className="bi bi-card-text"></i>
              </span>
              <div>
                <h2>Movie details</h2>
                <p>Information shown across the catalogue.</p>
              </div>
            </div>

            <div className="admin-form-section-body">
              <div className="admin-two-col">
                <div className="admin-form-field">
                  <label>Title</label>
                  <input
                    type="text"
                    value={addMovieForm.title}
                    onChange={(event) =>
                      onAddMovieFieldChange('title', event.target.value)
                    }
                    required
                    placeholder="Movie title"
                  />
                </div>

                <div className="admin-form-field">
                  <label>Release date</label>
                  <input
                    type="date"
                    value={addMovieForm.release_date}
                    onChange={(event) =>
                      onAddMovieFieldChange('release_date', event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="admin-form-field">
                <label>Description</label>
                <textarea
                  rows={4}
                  value={addMovieForm.description}
                  onChange={(event) =>
                    onAddMovieFieldChange('description', event.target.value)
                  }
                  placeholder="Synopsis"
                ></textarea>
              </div>

              <div className="admin-three-col">
                <div className="admin-form-field">
                  <label>Genres</label>
                  <input
                    type="text"
                    value={addMovieForm.genres}
                    onChange={(event) =>
                      onAddMovieFieldChange('genres', event.target.value)
                    }
                    placeholder="Action, Drama"
                  />
                </div>

                <div className="admin-form-field">
                  <label>Director</label>
                  <input
                    type="text"
                    value={addMovieForm.director}
                    onChange={(event) =>
                      onAddMovieFieldChange('director', event.target.value)
                    }
                    placeholder="Director"
                  />
                </div>

                <div className="admin-form-field">
                  <label>Rating</label>
                  <input
                    type="text"
                    value={addMovieForm.rating}
                    onChange={(event) =>
                      onAddMovieFieldChange('rating', event.target.value)
                    }
                    placeholder="8.2"
                  />
                </div>
              </div>

              <div className="admin-form-field">
                <label>Cast</label>
                <input
                  type="text"
                  value={addMovieForm.actors}
                  onChange={(event) => {
                    onAddMovieFieldChange('actors', event.target.value)
                    onAddMovieFieldChange('actors_json', '')
                  }}
                  placeholder="Actor names separated by commas"
                />
              </div>
            </div>
          </section>

          <section className="admin-form-section">
            <div className="admin-form-section-head">
              <span className="admin-section-icon tone-blue">
                <i className="bi bi-play-circle"></i>
              </span>
              <div>
                <h2>Playback</h2>
                <p>Choose the primary video source.</p>
              </div>
            </div>

            <div className="admin-form-section-body">
              <div className="admin-segmented-control">
                <button
                  type="button"
                  className={
                    addMovieForm.video_source_type === 'iframe' ? 'active' : ''
                  }
                  onClick={() =>
                    onAddMovieFieldChange('video_source_type', 'iframe')
                  }
                >
                  Iframe
                </button>
                <button
                  type="button"
                  className={
                    addMovieForm.video_source_type === 'hosted' ? 'active' : ''
                  }
                  onClick={() =>
                    onAddMovieFieldChange('video_source_type', 'hosted')
                  }
                >
                  Hosted video
                </button>
              </div>

              {addMovieForm.video_source_type === 'hosted' && (
                <div className="admin-form-field">
                  <label>Hosted video ID</label>
                  <input
                    type="text"
                    className="mono"
                    value={addMovieForm.hosted_video_id}
                    onChange={(event) =>
                      onAddMovieFieldChange(
                        'hosted_video_id',
                        event.target.value
                      )
                    }
                    placeholder="Video hosting ID"
                  />
                </div>
              )}

              <div className="admin-form-field">
                <label>
                  {addMovieForm.video_source_type === 'hosted'
                    ? 'Iframe fallback'
                    : 'Embed code'}
                </label>
                <textarea
                  rows={4}
                  className="mono"
                  value={addMovieForm.movie_embed_code}
                  onChange={(event) =>
                    onAddMovieFieldChange(
                      'movie_embed_code',
                      event.target.value
                    )
                  }
                  placeholder="<iframe ...>"
                ></textarea>
              </div>

              <div className="admin-form-field">
                <label>Hero preview URL</label>
                <input
                  type="url"
                  value={addMovieForm.preview_url}
                  onChange={(event) =>
                    onAddMovieFieldChange('preview_url', event.target.value)
                  }
                  placeholder="https://.../preview.m3u8"
                />
                <small>Optional HLS preview for the desktop homepage hero.</small>
              </div>

              <div className="admin-form-field">
                <label>Download link</label>
                <input
                  type="url"
                  value={addMovieForm.download_url}
                  onChange={(event) =>
                    onAddMovieFieldChange('download_url', event.target.value)
                  }
                  placeholder="https://"
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="admin-content-form-side">
          <section className="admin-form-side-card">
            <div className="admin-form-side-card-head">
              <span className="admin-tmdb-mark">TMDB</span>
              <h2>Import metadata</h2>
            </div>

            <div className="admin-form-field">
              <label>Title search</label>
              <input
                type="text"
                value={tmdbTitleLookup}
                onChange={(event) => onTmdbTitleLookupChange(event.target.value)}
                placeholder="Search title"
              />
            </div>

            <div className="admin-form-field">
              <label>TMDB ID</label>
              <input
                type="text"
                value={tmdbIdLookup}
                onChange={(event) => onTmdbIdLookupChange(event.target.value)}
                placeholder="Optional ID"
              />
            </div>

            <button
              type="button"
              className="admin-btn admin-btn-secondary admin-submit-wide"
              onClick={onFetchMovieTmdb}
              disabled={tmdbLoading}
            >
              {tmdbLoading && <span className="admin-button-spinner"></span>}
              {!tmdbLoading && <i className="bi bi-search"></i>}
              {tmdbLoading ? 'Searching' : 'Import from TMDB'}
            </button>
          </section>

          <section className="admin-form-side-card">
            <div className="admin-form-side-card-head">
              <span className="admin-section-icon tone-purple">
                <i className="bi bi-image"></i>
              </span>
              <h2>Artwork</h2>
            </div>

            <label className="admin-poster-editor">
              {addMovieForm.poster_url ? (
                <img src={addMovieForm.poster_url} alt="Poster preview" />
              ) : (
                <span>
                  <i className="bi bi-image"></i>
                  Poster preview
                </span>
              )}
              <input type="file" accept="image/*" onChange={handleThumbnailChange} />
            </label>

            <div className="admin-form-field">
              <label>Poster URL</label>
              <input
                type="text"
                value={addMovieForm.poster_url}
                onChange={(event) =>
                  onAddMovieFieldChange('poster_url', event.target.value)
                }
                placeholder="Poster URL"
              />
            </div>

            <div className="admin-form-field">
              <label>Backdrop URL</label>
              <input
                type="text"
                value={addMovieForm.backdrop_url}
                onChange={(event) =>
                  onAddMovieFieldChange('backdrop_url', event.target.value)
                }
                placeholder="Backdrop URL"
              />
            </div>
          </section>

          <section className="admin-form-side-card compact">
            <div className="admin-two-col">
              <div className="admin-form-field">
                <label>TMDB ID</label>
                <input
                  type="text"
                  value={addMovieForm.tmdb_id}
                  onChange={(event) =>
                    onAddMovieFieldChange('tmdb_id', event.target.value)
                  }
                />
              </div>
            </div>
          </section>
        </aside>
      </div>

      <input type="hidden" value={addMovieForm.actors_json} readOnly />

      <div className="admin-form-sticky-actions">
        <button
          type="button"
          className="admin-btn admin-btn-ghost"
          disabled={addMovieSaving}
          onClick={onResetAddMovie}
        >
          Reset
        </button>

        <button
          type="submit"
          className="admin-btn admin-btn-primary"
          disabled={addMovieSaving}
        >
          {addMovieSaving && <span className="admin-button-spinner"></span>}
          {addMovieSaving ? 'Publishing' : 'Publish movie'}
        </button>
      </div>
    </>
  )
}

export default AddMovieForm
