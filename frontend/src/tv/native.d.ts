export {}

declare global {
  interface Window {
    AndroidTVPlayer?: {
      isAvailable: () => boolean
      play: (url: string, title: string) => void
    }
  }
}
