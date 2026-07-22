import { useEffect, useMemo, useState } from 'react'
import type {
  AddSeriesEpisodeForm,
  AddSeriesForm as AddSeriesFormState,
  AddSeriesSeasonForm,
} from './adminTypes'

type UpdateAddSeriesField = <Key extends keyof AddSeriesFormState>(
  key: Key,
  value: AddSeriesFormState[Key]
) => void

type UpdateSeasonField = <Key extends keyof AddSeriesSeasonForm>(
  seasonClientId: string,
  key: Key,
  value: AddSeriesSeasonForm[Key]
) => void

type UpdateEpisodeField = <Key extends keyof AddSeriesEpisodeForm>(
  seasonClientId: string,
  episodeClientId: string,
  key: Key,
  value: AddSeriesEpisodeForm[Key]
) => void

type Props = {
  addSeriesForm: AddSeriesFormState
  addSeriesSaving: boolean
  seriesTmdbTitleLookup: string
  seriesTmdbIdLookup: string
  seriesTmdbLoading: boolean
  onAddSeriesFieldChange: UpdateAddSeriesField
  onSeriesTmdbTitleLookupChange: (value: string) => void
  onSeriesTmdbIdLookupChange: (value: string) => void
  onFetchSeriesTmdb: () => void
  onAddSeason: () => void
  onRemoveSeason: (seasonClientId: string) => void
  onUpdateSeasonField: UpdateSeasonField
  onAddEpisode: (seasonClientId: string) => void
  onRemoveEpisode: (seasonClientId: string, episodeClientId: string) => void
  onUpdateEpisodeField: UpdateEpisodeField
  onResetAddSeries: () => void
}

function AddSeriesForm({
  addSeriesForm,
  addSeriesSaving,
  seriesTmdbTitleLookup,
  seriesTmdbIdLookup,
  seriesTmdbLoading,
  onAddSeriesFieldChange,
  onSeriesTmdbTitleLookupChange,
  onSeriesTmdbIdLookupChange,
  onFetchSeriesTmdb,
  onAddSeason,
  onRemoveSeason,
  onUpdateSeasonField,
  onAddEpisode,
  onRemoveEpisode,
  onUpdateEpisodeField,
  onResetAddSeries,
}: Props) {
  const [selectedSeasonId, setSelectedSeasonId] = useState(
    addSeriesForm.seasons[0]?.client_id || ''
  )
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(
    addSeriesForm.seasons[0]?.episodes[0]?.client_id || ''
  )

  const selectedSeason = useMemo(
    () =>
      addSeriesForm.seasons.find(
        (season) => season.client_id === selectedSeasonId
      ) || addSeriesForm.seasons[0],
    [addSeriesForm.seasons, selectedSeasonId]
  )

  const selectedEpisode = useMemo(
    () =>
      selectedSeason?.episodes.find(
        (episode) => episode.client_id === selectedEpisodeId
      ) || selectedSeason?.episodes[0],
    [selectedSeason, selectedEpisodeId]
  )

  useEffect(() => {
    if (!selectedSeason) {
      setSelectedSeasonId('')
      setSelectedEpisodeId('')
      return
    }

    if (selectedSeason.client_id !== selectedSeasonId) {
      setSelectedSeasonId(selectedSeason.client_id)
    }

    if (
      !selectedEpisode ||
      !selectedSeason.episodes.some(
        (episode) => episode.client_id === selectedEpisodeId
      )
    ) {
      setSelectedEpisodeId(selectedSeason.episodes[0]?.client_id || '')
    }
  }, [selectedEpisode, selectedEpisodeId, selectedSeason, selectedSeasonId])

  const chooseSeason = (season: AddSeriesSeasonForm) => {
    setSelectedSeasonId(season.client_id)
    setSelectedEpisodeId(season.episodes[0]?.client_id || '')
  }

  return (
    <>
      <div className="admin-content-form-layout">
        <div className="admin-content-form-main">
          <section className="admin-form-section">
            <div className="admin-form-section-head">
              <span className="admin-section-icon tone-purple">
                <i className="bi bi-tv"></i>
              </span>
              <div>
                <h2>Series details</h2>
                <p>Information used across the catalogue.</p>
              </div>
            </div>

            <div className="admin-form-section-body">
              <div className="admin-two-col">
                <div className="admin-form-field">
                  <label>Series title</label>
                  <input
                    type="text"
                    value={addSeriesForm.title}
                    onChange={(event) =>
                      onAddSeriesFieldChange('title', event.target.value)
                    }
                    required
                    placeholder="Series title"
                  />
                </div>

                <div className="admin-form-field">
                  <label>First air date</label>
                  <input
                    type="date"
                    value={addSeriesForm.release_date}
                    onChange={(event) =>
                      onAddSeriesFieldChange('release_date', event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="admin-form-field">
                <label>Description</label>
                <textarea
                  rows={4}
                  value={addSeriesForm.description}
                  onChange={(event) =>
                    onAddSeriesFieldChange('description', event.target.value)
                  }
                  placeholder="Series synopsis"
                ></textarea>
              </div>

              <div className="admin-three-col">
                <div className="admin-form-field">
                  <label>Genres</label>
                  <input
                    type="text"
                    value={addSeriesForm.genres}
                    onChange={(event) =>
                      onAddSeriesFieldChange('genres', event.target.value)
                    }
                    placeholder="Drama, Crime"
                  />
                </div>

                <div className="admin-form-field">
                  <label>Creator</label>
                  <input
                    type="text"
                    value={addSeriesForm.director}
                    onChange={(event) =>
                      onAddSeriesFieldChange('director', event.target.value)
                    }
                    placeholder="Creator name"
                  />
                </div>

                <div className="admin-form-field">
                  <label>Rating</label>
                  <input
                    type="text"
                    value={addSeriesForm.rating}
                    onChange={(event) =>
                      onAddSeriesFieldChange('rating', event.target.value)
                    }
                    placeholder="8.5"
                  />
                </div>
              </div>

              <div className="admin-form-field">
                <label>Cast</label>
                <input
                  type="text"
                  value={addSeriesForm.actors}
                  onChange={(event) => {
                    onAddSeriesFieldChange('actors', event.target.value)
                    onAddSeriesFieldChange('actors_json', '')
                  }}
                  placeholder="Actor names separated by commas"
                />
              </div>

              <div className="admin-form-field">
                <label>Hero preview URL</label>
                <input
                  type="url"
                  value={addSeriesForm.preview_url}
                  onChange={(event) =>
                    onAddSeriesFieldChange('preview_url', event.target.value)
                  }
                  placeholder="https://.../preview.m3u8"
                />
                <small>Optional HLS preview for the desktop homepage hero.</small>
              </div>

              <div className="admin-form-field">
                <label>Series download link</label>
                <input
                  type="url"
                  value={addSeriesForm.download_url}
                  onChange={(event) =>
                    onAddSeriesFieldChange('download_url', event.target.value)
                  }
                  placeholder="https://"
                />
              </div>
            </div>
          </section>

          <section className="admin-form-section admin-series-builder-section">
            <div className="admin-form-section-head admin-series-builder-title">
              <span className="admin-section-icon tone-blue">
                <i className="bi bi-collection-play"></i>
              </span>
              <div>
                <h2>Seasons and episodes</h2>
                <p>Select one item at a time to edit it.</p>
              </div>
            </div>

            <div className="admin-series-workspace admin-add-series-workspace">
              <aside className="admin-series-column admin-series-season-column">
                <div className="admin-series-column-head">
                  <span>Seasons</span>
                  <button type="button" onClick={onAddSeason}>
                    <i className="bi bi-plus-lg"></i>
                  </button>
                </div>

                <div className="admin-series-nav-list">
                  {addSeriesForm.seasons.map((season, index) => (
                    <button
                      type="button"
                      key={season.client_id}
                      className={
                        selectedSeason?.client_id === season.client_id
                          ? 'active'
                          : ''
                      }
                      onClick={() => chooseSeason(season)}
                    >
                      <span>
                        <span>{season.title || `Season ${season.season_number || index + 1}`}</span>
                        <small>{season.episodes.length} episodes</small>
                      </span>
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  ))}
                </div>

                {selectedSeason && addSeriesForm.seasons.length > 1 && (
                  <button
                    type="button"
                    className="admin-series-remove-button"
                    onClick={() => onRemoveSeason(selectedSeason.client_id)}
                  >
                    <i className="bi bi-trash"></i>
                    Remove season
                  </button>
                )}
              </aside>

              <section className="admin-series-column admin-series-episode-column">
                <div className="admin-series-column-head">
                  <span>Episodes</span>
                  {selectedSeason && (
                    <button
                      type="button"
                      onClick={() => onAddEpisode(selectedSeason.client_id)}
                    >
                      <i className="bi bi-plus-lg"></i>
                    </button>
                  )}
                </div>

                {selectedSeason && (
                  <div className="admin-season-inline-fields">
                    <div className="admin-form-field compact">
                      <label>Season</label>
                      <input
                        type="number"
                        min="1"
                        value={selectedSeason.season_number}
                        onChange={(event) =>
                          onUpdateSeasonField(
                            selectedSeason.client_id,
                            'season_number',
                            event.target.value
                          )
                        }
                      />
                    </div>

                    <div className="admin-form-field compact">
                      <label>Title</label>
                      <input
                        type="text"
                        value={selectedSeason.title}
                        onChange={(event) =>
                          onUpdateSeasonField(
                            selectedSeason.client_id,
                            'title',
                            event.target.value
                          )
                        }
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                )}

                <div className="admin-series-nav-list admin-episode-nav-list">
                  {selectedSeason?.episodes.map((episode, index) => (
                    <button
                      type="button"
                      key={episode.client_id}
                      className={
                        selectedEpisode?.client_id === episode.client_id
                          ? 'active'
                          : ''
                      }
                      onClick={() => setSelectedEpisodeId(episode.client_id)}
                    >
                      <span className="admin-episode-number">
                        {episode.episode_number || index + 1}
                      </span>
                      <span>
                        <span>{episode.title || `Episode ${episode.episode_number || index + 1}`}</span>
                        <small>{episode.video_source_type === 'hosted' ? 'Hosted' : 'Iframe'}</small>
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
                        <h3>Episode details</h3>
                        <p>Season {selectedSeason.season_number || 1}</p>
                      </div>

                      {selectedSeason.episodes.length > 1 && (
                        <button
                          type="button"
                          className="admin-row-text-btn danger"
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
                        <label>Episode number</label>
                        <input
                          type="number"
                          min="1"
                          value={selectedEpisode.episode_number}
                          onChange={(event) =>
                            onUpdateEpisodeField(
                              selectedSeason.client_id,
                              selectedEpisode.client_id,
                              'episode_number',
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
                            onUpdateEpisodeField(
                              selectedSeason.client_id,
                              selectedEpisode.client_id,
                              'title',
                              event.target.value
                            )
                          }
                          placeholder="Episode title"
                        />
                      </div>
                    </div>

                    <div className="admin-form-field">
                      <label>Description</label>
                      <textarea
                        rows={3}
                        value={selectedEpisode.description}
                        onChange={(event) =>
                          onUpdateEpisodeField(
                            selectedSeason.client_id,
                            selectedEpisode.client_id,
                            'description',
                            event.target.value
                          )
                        }
                      ></textarea>
                    </div>

                    <div className="admin-two-col">
                      <div className="admin-form-field">
                        <label>Release date</label>
                        <input
                          type="date"
                          value={selectedEpisode.release_date}
                          onChange={(event) =>
                            onUpdateEpisodeField(
                              selectedSeason.client_id,
                              selectedEpisode.client_id,
                              'release_date',
                              event.target.value
                            )
                          }
                        />
                      </div>

                      <div className="admin-form-field">
                        <label>Download link</label>
                        <input
                          type="url"
                          value={selectedEpisode.download_url}
                          onChange={(event) =>
                            onUpdateEpisodeField(
                              selectedSeason.client_id,
                              selectedEpisode.client_id,
                              'download_url',
                              event.target.value
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="admin-segmented-control">
                      <button
                        type="button"
                        className={
                          selectedEpisode.video_source_type === 'iframe'
                            ? 'active'
                            : ''
                        }
                        onClick={() =>
                          onUpdateEpisodeField(
                            selectedSeason.client_id,
                            selectedEpisode.client_id,
                            'video_source_type',
                            'iframe'
                          )
                        }
                      >
                        Iframe
                      </button>
                      <button
                        type="button"
                        className={
                          selectedEpisode.video_source_type === 'hosted'
                            ? 'active'
                            : ''
                        }
                        onClick={() =>
                          onUpdateEpisodeField(
                            selectedSeason.client_id,
                            selectedEpisode.client_id,
                            'video_source_type',
                            'hosted'
                          )
                        }
                      >
                        Hosted video
                      </button>
                    </div>

                    {selectedEpisode.video_source_type === 'hosted' && (
                      <div className="admin-form-field">
                        <label>Hosted video ID</label>
                        <input
                          className="mono"
                          type="text"
                          value={selectedEpisode.hosted_video_id}
                          onChange={(event) =>
                            onUpdateEpisodeField(
                              selectedSeason.client_id,
                              selectedEpisode.client_id,
                              'hosted_video_id',
                              event.target.value
                            )
                          }
                        />
                      </div>
                    )}

                    <div className="admin-form-field">
                      <label>
                        {selectedEpisode.video_source_type === 'hosted'
                          ? 'Iframe fallback'
                          : 'Embed code'}
                      </label>
                      <textarea
                        rows={4}
                        className="mono"
                        value={selectedEpisode.embed_code}
                        onChange={(event) =>
                          onUpdateEpisodeField(
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
                  <div className="admin-series-empty-detail">
                    Select an episode
                  </div>
                )}
              </section>
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
                value={seriesTmdbTitleLookup}
                onChange={(event) =>
                  onSeriesTmdbTitleLookupChange(event.target.value)
                }
                placeholder="Search title"
              />
            </div>

            <div className="admin-form-field">
              <label>TMDB ID</label>
              <input
                type="text"
                value={seriesTmdbIdLookup}
                onChange={(event) =>
                  onSeriesTmdbIdLookupChange(event.target.value)
                }
                placeholder="Optional ID"
              />
            </div>

            <button
              type="button"
              className="admin-btn admin-btn-secondary admin-submit-wide"
              onClick={onFetchSeriesTmdb}
              disabled={seriesTmdbLoading}
            >
              {seriesTmdbLoading && (
                <span className="admin-button-spinner"></span>
              )}
              {!seriesTmdbLoading && <i className="bi bi-search"></i>}
              {seriesTmdbLoading ? 'Searching' : 'Import from TMDB'}
            </button>
          </section>

          <section className="admin-form-side-card">
            <div className="admin-form-side-card-head">
              <span className="admin-section-icon tone-green">
                <i className="bi bi-image"></i>
              </span>
              <h2>Artwork</h2>
            </div>

            <div className="admin-poster-editor static">
              {addSeriesForm.poster_url ? (
                <img src={addSeriesForm.poster_url} alt="Poster preview" />
              ) : (
                <span>
                  <i className="bi bi-image"></i>
                  Poster preview
                </span>
              )}
            </div>

            <div className="admin-form-field">
              <label>Poster URL</label>
              <input
                type="text"
                value={addSeriesForm.poster_url}
                onChange={(event) =>
                  onAddSeriesFieldChange('poster_url', event.target.value)
                }
              />
            </div>

            <div className="admin-form-field">
              <label>Backdrop URL</label>
              <input
                type="text"
                value={addSeriesForm.backdrop_url}
                onChange={(event) =>
                  onAddSeriesFieldChange('backdrop_url', event.target.value)
                }
              />
            </div>
          </section>

          <section className="admin-form-side-card compact">
            <div className="admin-form-field">
              <label>TMDB ID</label>
              <input
                type="text"
                value={addSeriesForm.tmdb_id}
                onChange={(event) =>
                  onAddSeriesFieldChange('tmdb_id', event.target.value)
                }
              />
            </div>
          </section>
        </aside>
      </div>

      <input type="hidden" value={addSeriesForm.actors_json} readOnly />

      <div className="admin-form-sticky-actions">
        <button
          type="button"
          className="admin-btn admin-btn-ghost"
          disabled={addSeriesSaving}
          onClick={onResetAddSeries}
        >
          Reset
        </button>

        <button
          type="submit"
          className="admin-btn admin-btn-primary"
          disabled={addSeriesSaving}
        >
          {addSeriesSaving && <span className="admin-button-spinner"></span>}
          {addSeriesSaving ? 'Publishing' : 'Publish series'}
        </button>
      </div>
    </>
  )
}

export default AddSeriesForm
