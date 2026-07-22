export type HomeItem = {
  id: number | string
  title: string
  description?: string
  release_date?: string
  rating?: number | string | null
  content_type: 'movie' | 'series'
  poster_display?: string
  thumbnail_display?: string
  backdrop_display?: string
  preview_url?: string | null
  in_my_list?: boolean
}

export type CarouselRowData = {
  title: string
  category?: string | null
  items: HomeItem[]
}

export type HomeInitialResponse = {
  success?: boolean
  page_title?: string
  content_type?: 'movie' | 'series'
  featured_item: HomeItem | null
  carousel_rows: CarouselRowData[]
  next_offset: number
  has_more: boolean
  search_query?: string
  category?: string
}

export type HomeRowsResponse = {
  success?: boolean
  page_title?: string
  content_type?: 'movie' | 'series'
  carousel_rows: CarouselRowData[]
  next_offset: number
  has_more: boolean
}

export type SearchResponse = {
  success: boolean
  search_query: string
  results: HomeItem[]
  count: number
}