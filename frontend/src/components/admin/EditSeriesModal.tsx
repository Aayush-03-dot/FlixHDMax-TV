import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type {
  EditSeriesEpisodeForm,
  EditSeriesForm,
  EditSeriesSeasonForm,
} from './adminTypes'

type UpdateEditSeriesField = <Key extends keyof EditSeriesForm>(
  key: Key,
  value: EditSeriesForm[Key]
) => void

type UpdateEditSeriesSeasonField = <Key extends keyof EditSeriesSeasonForm>(
  seasonClientId: string,
  key: Key,
  value: EditSeriesSeasonForm[Key]
) => void

type UpdateEditSeriesEpisodeField = <Key extends keyof EditSeriesEpisodeForm>(
  seasonClientId: string,
  episodeClientId: string,
  key: Key,
  value: EditSeriesEpisodeForm[Key]
) => void

type Props = {
  open: boolean
  loading: boolean
  saving: boolean
  form: EditSeriesForm | null
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onFieldChange: UpdateEditSeriesField
  onSeasonFieldChange: UpdateEditSeriesSeasonField
  onEpisodeFieldChange: UpdateEditSeriesEpisodeField
  onAddSeason: () => void
  onRemoveSeason: (seasonClientId: string) => void
  onAddEpisode: (seasonClientId: string) => void
  onRemoveEpisode: (seasonClientId: string, episodeClientId: string) => void
}

function EditSeriesModal({
  open,
  loading,
  saving,
  form,
  onClose,
  onSubmit,
  onFieldChange,
  onSeasonFieldChange,
  onEpisodeFieldChange,
  onAddSeason,
  onRemoveSeason,
  onAddEpisode,
  onRemoveEpisode,
}: Props) {
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('')

  useEffect(() => {
    if (!open || !form?.seasons.length) return

    const validSeason = form.seasons.find(
      (season) => season.client_id === selectedSeasonId
    )
    const nextSeason = validSeason || form.seasons[0]

    if (nextSeason.client_id !== selectedSeasonId) {
      setSelectedSeasonId(nextSeason.client_id)
    }

    const validEpisode = nextSeason.episodes.find(
      (episode) => episode.client_id === selectedEpisodeId
    )
    const nextEpisode = validEpisode || nextSeason.episodes[0]

    setSelectedEpisodeId(nextEpisode?.client_id || '')
  }, [form, open, selectedEpisodeId, selectedSeasonId])

  const selectedSeason = useMemo(
    () => form?.seasons.find((season) => season.client_id === selectedSeasonId) || null,
    [form, selectedSeasonId]
  )

  const selectedEpisode = useMemo(
    () =>
      selectedSeason?.episodes.find(
        (episode) => episode.client_id === selectedEpisodeId
      ) || null,
    [selectedEpisodeId, selectedSeason]
  )

  if (!open) return null

  const selectSeason = (season: EditSeriesSeasonForm) => {
    setSelectedSeasonId(season.client_id)
    setSelectedEpisodeId(season.episodes[0]?.client_id || '')
  }

  return (
    <div className="admin-modal-backdrop admin-editor-backdrop">
      <div className="admin-edit-modal admin-series-editor-modal">
        <div className="admin-edit-modal-head">
          <div>
            <span className="admin-page-kicker">Library</span>
            <h2>Edit series</h2>
          </div>
          <button
            type="button"
            className="admin-edit-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close edit series modal"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {loading || !form ? (
          <div className="admin-edit-loading">Loading series</div>
        ) : (
          <form className="admin-edit-form admin-series-editor-form" onSubmit={onSubmit}>
            <div className="admin-series-overview-strip">
              <div className="admin-form-field">
                <label>Series title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => onFieldChange('title', event.target.value)}
                  required
                />
              </div>
              <div className="admin-form-field compact">
                <label>Rating</label>
                <input
                  type="text"
                  value={form.rating}
                  onChange={(event) => onFieldChange('rating', event.target.value)}
                  placeholder="8.5"
                />
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
                  placeholder="https://..."
                />
              </div>
              <div className="admin-form-field admin-series-description-field">
                <label>Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(event) => onFieldChange('description', event.target.value)}
                ></textarea>
              </div>
            </div>

            <div className="admin-series-workspace">
              <aside className="admin-series-column admin-series-season-column">
                <div className="admin-series-column-head">
                  <span>Seasons</span>
                  <button type="button" onClick={onAddSeason} disabled={saving}>
                    <i className="bi bi-plus-lg"></i>
                  </button>
                </div>

                <div className="admin-series-nav-list">
                  {form.seasons.map((season, index) => (
                    <button
                      key={season.client_id}
                      type="button"
                      className={season.client_id === selectedSeasonId ? 'active' : ''}
                      onClick={() => selectSeason(season)}
                    >
                      <span>
                        <strong>{season.title || `Season ${index + 1}`}</strong>
                        <small>{season.episodes.length} episodes</small>
                      </span>
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  ))}
                </div>

                {selectedSeason && form.seasons.length > 1 && (
                  <button
                    type="button"
                    className="admin-series-remove-button"
                    disabled={saving}
                    onClick={() => onRemoveSeason(selectedSeason.client_id)}
                  >
                    Remove season
                  </button>
                )}
              </aside>

              <section className="admin-series-column admin-series-episode-column">
                <div className="admin-series-column-head">
                  <span>Episodes</span>
                  <button
                    type="button"
                    disabled={!selectedSeason || saving}
                    onClick={() => selectedSeason && onAddEpisode(selectedSeason.client_id)}
                  >
                    <i className="bi bi-plus-lg"></i>
                  </button>
                </div>

                {selectedSeason && (
                  <div className="admin-season-title-input">
                    <label>Season name</label>
                    <input
                      type="text"
                      value={selectedSeason.title}
                      onChange={(event) =>
                        onSeasonFieldChange(
                          selectedSeason.client_id,
                          'title',
                          event.target.value
                        )
                      }
                      placeholder="Season title"
                    />
                  </div>
                )}

                <div className="admin-series-nav-list admin-episode-nav-list">
                  {selectedSeason?.episodes.map((episode, index) => (
                    <button
                      key={episode.client_id}
                      type="button"
                      className={episode.client_id === selectedEpisodeId ? 'active' : ''}
                      onClick={() => setSelectedEpisodeId(episode.client_id)}
                    >
                      <span className="admin-episode-number">{episode.number || index + 1}</span>
                      <span>
                        <strong>{episode.title || `Episode ${episode.number || index + 1}`}</strong>
                        <small>{episode.video_source_type === 'hosted' ? 'Hosted video' : 'Iframe'}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="admin-series-detail-panel">
                {selectedSeason && selectedEpisode ? (
                  <>
                    <div className="admin-series-detail-head">
                      <div>
                        <span className="admin-page-kicker">Episode</span>
                        <h3>{selectedEpisode.title || `Episode ${selectedEpisode.number || ''}`}</h3>
                      </div>
                      {selectedSeason.episodes.length > 1 && (
                        <button
                          type="button"
                          className="admin-row-text-btn danger"
                          disabled={saving}
                          onClick={() =>
                            onRemoveEpisode(
                              selectedSeason.client_id,
                              selectedEpisode.client_id
                            )
                          }
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="admin-two-col">
                      <div className="admin-form-field compact">
                        <label>Number</label>
                        <input
                          type="number"
                          min="1"
                          value={selectedEpisode.number}
                          onChange={(event) =>
                            onEpisodeFieldChange(
                              selectedSeason.client_id,
                              selectedEpisode.client_id,
                              'number',
                              event.target.value
                            )
                          }
                        />
                      </div>
                      <div className="admin-form-field">
                        <label>Title</label>
                        <input
                          type="text"
                          value={selectedEpisode.title}
                          onChange={(event) =>
                            onEpisodeFieldChange(
                              selectedSeason.client_id,
                              selectedEpisode.client_id,
                              'title',
                              event.target.value
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="admin-segmented-control">
                      <label className={selectedEpisode.video_source_type === 'iframe' ? 'active' : ''}>
                        <input
                          type="radio"
                          checked={selectedEpisode.video_source_type === 'iframe'}
                          onChange={() =>
                            onEpisodeFieldChange(
                              selectedSeason.client_id,
                              selectedEpisode.client_id,
                              'video_source_type',
                              'iframe'
                            )
                          }
                        />
                        Iframe
                      </label>
                      <label className={selectedEpisode.video_source_type === 'hosted' ? 'active' : ''}>
                        <input
                          type="radio"
                          checked={selectedEpisode.video_source_type === 'hosted'}
                          onChange={() =>
                            onEpisodeFieldChange(
                              selectedSeason.client_id,
                              selectedEpisode.client_id,
                              'video_source_type',
                              'hosted'
                            )
                          }
                        />
                        Hosted
                      </label>
                    </div>

                    {selectedEpisode.video_source_type === 'hosted' && (
                      <div className="admin-form-field">
                        <label>Hosted video ID</label>
                        <input
                          type="text"
                          className="mono"
                          value={selectedEpisode.hosted_video_id}
                          onChange={(event) =>
                            onEpisodeFieldChange(
                              selectedSeason.client_id,
                              selectedEpisode.client_id,
                              'hosted_video_id',
                              event.target.value
                            )
                          }
                        />
                      </div>
                    )}

                    <div className="admin-form-field admin-series-code-field">
                      <label>
                        {selectedEpisode.video_source_type === 'hosted'
                          ? 'Iframe fallback'
                          : 'Embed code'}
                      </label>
                      <textarea
                        rows={8}
                        className="mono"
                        value={selectedEpisode.embed_code}
                        onChange={(event) =>
                          onEpisodeFieldChange(
                            selectedSeason.client_id,
                            selectedEpisode.client_id,
                            'embed_code',
                            event.target.value
                          )
                        }
                      ></textarea>
                    </div>
                  </>
                ) : (
                  <div className="admin-series-empty-detail">Select an episode</div>
                )}
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
                {saving ? 'Saving' : 'Save series'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default EditSeriesModal
