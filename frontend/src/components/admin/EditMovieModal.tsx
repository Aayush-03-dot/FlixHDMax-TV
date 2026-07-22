import type { ChangeEvent, FormEvent } from 'react'
import type { EditMovieForm } from './adminTypes'

type Props = {
  open: boolean
  loading: boolean
  saving: boolean
  form: EditMovieForm | null
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onFieldChange: <Key extends keyof EditMovieForm>(
    key: Key,
    value: EditMovieForm[Key]
  ) => void
}

function EditMovieModal({
  open,
  loading,
  saving,
  form,
  onClose,
  onSubmit,
  onFieldChange,
}: Props) {
  if (!open) return null

  const handleThumbnailChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFieldChange('thumbnail', event.target.files?.[0] || null)
  }

  return (
    <div className="admin-modal-backdrop admin-editor-backdrop">
      <div className="admin-edit-modal admin-content-editor">
        <div className="admin-edit-modal-head">
          <div>
            <span className="admin-page-kicker">Library</span>
            <h2>Edit movie</h2>
          </div>

          <button
            type="button"
            className="admin-edit-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close edit movie modal"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {loading || !form ? (
          <div className="admin-edit-loading">Loading movie</div>
        ) : (
          <form className="admin-edit-form admin-editor-form" onSubmit={onSubmit}>
            <div className="admin-editor-scroll">
              <section className="admin-editor-section">
                <div className="admin-editor-section-title">
                  <span>01</span>
                  <div>
                    <h3>Overview</h3>
                    <p>Main title information</p>
                  </div>
                </div>

                <div className="admin-editor-fields">
                  <div className="admin-two-col">
                    <div className="admin-form-field">
                      <label>Title</label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(event) => onFieldChange('title', event.target.value)}
                        required
                      />
                    </div>
                    <div className="admin-form-field">
                      <label>Release date</label>
                      <input
                        type="date"
                        value={form.release_date}
                        onChange={(event) => onFieldChange('release_date', event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="admin-form-field">
                    <label>Description</label>
                    <textarea
                      rows={5}
                      value={form.description}
                      onChange={(event) => onFieldChange('description', event.target.value)}
                    ></textarea>
                  </div>

                  <div className="admin-three-col">
                    <div className="admin-form-field">
                      <label>Genres</label>
                      <input
                        type="text"
                        value={form.genres}
                        onChange={(event) => onFieldChange('genres', event.target.value)}
                        placeholder="Action, Drama"
                      />
                    </div>
                    <div className="admin-form-field">
                      <label>Director</label>
                      <input
                        type="text"
                        value={form.director}
                        onChange={(event) => onFieldChange('director', event.target.value)}
                      />
                    </div>
                    <div className="admin-form-field">
                      <label>Rating</label>
                      <input
                        type="text"
                        value={form.rating}
                        onChange={(event) => onFieldChange('rating', event.target.value)}
                        placeholder="7.8"
                      />
                    </div>
                  </div>

                  <div className="admin-two-col">
                    <div className="admin-form-field">
                      <label>Cast</label>
                      <input
                        type="text"
                        value={form.actors}
                        onChange={(event) => onFieldChange('actors', event.target.value)}
                        placeholder="Actor 1, Actor 2"
                      />
                    </div>
                    <div className="admin-form-field">
                      <label>TMDB ID</label>
                      <input
                        type="text"
                        value={form.tmdb_id}
                        onChange={(event) => onFieldChange('tmdb_id', event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="admin-editor-section">
                <div className="admin-editor-section-title">
                  <span>02</span>
                  <div>
                    <h3>Artwork</h3>
                    <p>Poster and backdrop</p>
                  </div>
                </div>

                <div className="admin-editor-fields admin-artwork-editor">
                  <div className="admin-editor-poster">
                    {form.poster_url ? (
                      <img src={form.poster_url} alt="Poster preview" />
                    ) : (
                      <div className="admin-poster-ph">
                        <i className="bi bi-image"></i>
                        <span>No poster</span>
                      </div>
                    )}
                    <label className="admin-file-button">
                      <input type="file" accept="image/*" onChange={handleThumbnailChange} />
                      <i className="bi bi-upload"></i>
                      Replace image
                    </label>
                    {form.thumbnail && <small>{form.thumbnail.name}</small>}
                  </div>

                  <div className="admin-artwork-fields">
                    <div className="admin-form-field">
                      <label>Poster URL</label>
                      <input
                        type="text"
                        value={form.poster_url}
                        onChange={(event) => onFieldChange('poster_url', event.target.value)}
                      />
                    </div>
                    <div className="admin-form-field">
                      <label>Backdrop URL</label>
                      <input
                        type="text"
                        value={form.backdrop_url}
                        onChange={(event) => onFieldChange('backdrop_url', event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="admin-editor-section">
                <div className="admin-editor-section-title">
                  <span>03</span>
                  <div>
                    <h3>Playback</h3>
                    <p>Primary source and fallback</p>
                  </div>
                </div>

                <div className="admin-editor-fields">
                  <div className="admin-segmented-control">
                    <label className={form.video_source_type === 'iframe' ? 'active' : ''}>
                      <input
                        type="radio"
                        value="iframe"
                        checked={form.video_source_type === 'iframe'}
                        onChange={() => onFieldChange('video_source_type', 'iframe')}
                      />
                      Iframe
                    </label>
                    <label className={form.video_source_type === 'hosted' ? 'active' : ''}>
                      <input
                        type="radio"
                        value="hosted"
                        checked={form.video_source_type === 'hosted'}
                        onChange={() => onFieldChange('video_source_type', 'hosted')}
                      />
                      Hosted video
                    </label>
                  </div>

                  {form.video_source_type === 'hosted' && (
                    <div className="admin-form-field">
                      <label>Hosted video ID</label>
                      <input
                        type="text"
                        className="mono"
                        value={form.hosted_video_id}
                        onChange={(event) => onFieldChange('hosted_video_id', event.target.value)}
                      />
                    </div>
                  )}

                  <div className="admin-form-field">
                    <label>{form.video_source_type === 'hosted' ? 'Iframe fallback' : 'Embed code'}</label>
                    <textarea
                      rows={5}
                      className="mono"
                      value={form.embed_code}
                      onChange={(event) => onFieldChange('embed_code', event.target.value)}
                    ></textarea>
                  </div>

                  <div className="admin-form-field">
                    <label>Hero preview URL</label>
                    <input
                      type="url"
                      value={form.preview_url}
                      onChange={(event) => onFieldChange('preview_url', event.target.value)}
                      placeholder="https://.../preview.m3u8"
                    />
                  </div>

                  <div className="admin-form-field">
                    <label>Download link</label>
                    <input
                      type="url"
                      value={form.download_url}
                      onChange={(event) => onFieldChange('download_url', event.target.value)}
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="admin-editor-footer">
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="admin-btn admin-btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving' : 'Save movie'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default EditMovieModal
