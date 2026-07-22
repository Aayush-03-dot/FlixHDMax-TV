import type { Movie } from '../types/movie'

type Props = {
  movie: Movie
}

function MovieCard({ movie }: Props) {
  return (
    <div className="w-40 shrink-0 overflow-hidden rounded-xl bg-zinc-900">
      <img
        src={movie.poster_url || '/placeholder.jpg'}
        alt={movie.title}
        className="h-60 w-full object-cover"
      />

      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-semibold">{movie.title}</h3>
        <p className="text-xs text-zinc-400">{movie.year}</p>
      </div>
    </div>
  )
}

export default MovieCard