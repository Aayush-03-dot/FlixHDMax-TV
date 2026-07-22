export type Movie = {
  id: number
  title: string
  poster_url?: string
  backdrop_url?: string
  year?: number
  rating?: string
  type?: 'movie' | 'series'
}