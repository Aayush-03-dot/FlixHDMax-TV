export {}

declare global {
  interface Window {
    AndroidTVPlayer?: {
      isAvailable: () => boolean
      play: (url: string, title: string) => void
    }
    AndroidTVInput?: {
      hideKeyboard: () => void
      openKeyboard: (
        fieldKey: string,
        currentValue: string,
        label: string,
        inputType: string
      ) => void
    }
  }
}
