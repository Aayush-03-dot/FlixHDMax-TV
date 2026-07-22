import type { FormEvent } from 'react'
import AddMovieForm from './AddMovieForm'
import AddSeriesForm from './AddSeriesForm'
import type {
  AddMovieForm as AddMovieFormState,
  AddSeriesEpisodeForm,
  AddSeriesForm as AddSeriesFormState,
  AddSeriesSeasonForm,
} from './adminTypes'

type UpdateAddMovieField = <Key extends keyof AddMovieFormState>(
  key: Key,
  value: AddMovieFormState[Key]
) => void

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
  addContentType: 'movie' | 'series'
  addMovieForm: AddMovieFormState
  addMovieSaving: boolean
  tmdbTitleLookup: string
  tmdbIdLookup: string
  tmdbLoading: boolean
  addSeriesForm: AddSeriesFormState
  addSeriesSaving: boolean
  seriesTmdbTitleLookup: string
  seriesTmdbIdLookup: string
  seriesTmdbLoading: boolean
  onContentTypeChange: (contentType: 'movie' | 'series') => void
  onAddMovieFieldChange: UpdateAddMovieField
  onTmdbTitleLookupChange: (value: string) => void
  onTmdbIdLookupChange: (value: string) => void
  onFetchMovieTmdb: () => void
  onSubmitAddMovie: (event: FormEvent<HTMLFormElement>) => void
  onResetAddMovie: () => void
  onAddSeriesFieldChange: UpdateAddSeriesField
  onSeriesTmdbTitleLookupChange: (value: string) => void
  onSeriesTmdbIdLookupChange: (value: string) => void
  onFetchSeriesTmdb: () => void
  onSubmitAddSeries: (event: FormEvent<HTMLFormElement>) => void
  onResetAddSeries: () => void
  onAddSeason: () => void
  onRemoveSeason: (seasonClientId: string) => void
  onUpdateSeasonField: UpdateSeasonField
  onAddEpisode: (seasonClientId: string) => void
  onRemoveEpisode: (seasonClientId: string, episodeClientId: string) => void
  onUpdateEpisodeField: UpdateEpisodeField
}

function AddContentTab({
  addContentType,
  addMovieForm,
  addMovieSaving,
  tmdbTitleLookup,
  tmdbIdLookup,
  tmdbLoading,
  addSeriesForm,
  addSeriesSaving,
  seriesTmdbTitleLookup,
  seriesTmdbIdLookup,
  seriesTmdbLoading,
  onContentTypeChange,
  onAddMovieFieldChange,
  onTmdbTitleLookupChange,
  onTmdbIdLookupChange,
  onFetchMovieTmdb,
  onSubmitAddMovie,
  onResetAddMovie,
  onAddSeriesFieldChange,
  onSeriesTmdbTitleLookupChange,
  onSeriesTmdbIdLookupChange,
  onFetchSeriesTmdb,
  onSubmitAddSeries,
  onResetAddSeries,
  onAddSeason,
  onRemoveSeason,
  onUpdateSeasonField,
  onAddEpisode,
  onRemoveEpisode,
  onUpdateEpisodeField,
}: Props) {
  return (
    <div className="admin-fade-up admin-add-content-page">
      <div className="admin-page-header">
        <div>
          <h1>Add content</h1>
          <p>Create a movie or series entry.</p>
        </div>

        <div className="admin-content-type-switch" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={addContentType === 'movie'}
            className={addContentType === 'movie' ? 'active' : ''}
            onClick={() => onContentTypeChange('movie')}
          >
            <i className="bi bi-film"></i>
            Movie
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={addContentType === 'series'}
            className={addContentType === 'series' ? 'active' : ''}
            onClick={() => onContentTypeChange('series')}
          >
            <i className="bi bi-tv"></i>
            Series
          </button>
        </div>
      </div>

      <form
        className="admin-add-form"
        onSubmit={
          addContentType === 'movie' ? onSubmitAddMovie : onSubmitAddSeries
        }
      >
        {addContentType === 'movie' ? (
          <AddMovieForm
            addMovieForm={addMovieForm}
            addMovieSaving={addMovieSaving}
            tmdbTitleLookup={tmdbTitleLookup}
            tmdbIdLookup={tmdbIdLookup}
            tmdbLoading={tmdbLoading}
            onAddMovieFieldChange={onAddMovieFieldChange}
            onTmdbTitleLookupChange={onTmdbTitleLookupChange}
            onTmdbIdLookupChange={onTmdbIdLookupChange}
            onFetchMovieTmdb={onFetchMovieTmdb}
            onResetAddMovie={onResetAddMovie}
          />
        ) : (
          <AddSeriesForm
            addSeriesForm={addSeriesForm}
            addSeriesSaving={addSeriesSaving}
            seriesTmdbTitleLookup={seriesTmdbTitleLookup}
            seriesTmdbIdLookup={seriesTmdbIdLookup}
            seriesTmdbLoading={seriesTmdbLoading}
            onAddSeriesFieldChange={onAddSeriesFieldChange}
            onSeriesTmdbTitleLookupChange={onSeriesTmdbTitleLookupChange}
            onSeriesTmdbIdLookupChange={onSeriesTmdbIdLookupChange}
            onFetchSeriesTmdb={onFetchSeriesTmdb}
            onAddSeason={onAddSeason}
            onRemoveSeason={onRemoveSeason}
            onUpdateSeasonField={onUpdateSeasonField}
            onAddEpisode={onAddEpisode}
            onRemoveEpisode={onRemoveEpisode}
            onUpdateEpisodeField={onUpdateEpisodeField}
            onResetAddSeries={onResetAddSeries}
          />
        )}
      </form>
    </div>
  )
}

export default AddContentTab
