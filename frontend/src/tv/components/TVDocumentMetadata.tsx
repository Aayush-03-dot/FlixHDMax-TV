import { useEffect } from 'react'

function ensureMeta(name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)

  if (!element) {
    element = document.createElement('meta')
    element.name = name
    document.head.appendChild(element)
  }

  element.content = content
}

function TVDocumentMetadata() {
  useEffect(() => {
    document.title = 'FlixHDMax TV'
    ensureMeta('theme-color', '#050505')
    ensureMeta('application-name', 'FlixHDMax TV')
    ensureMeta('mobile-web-app-capable', 'yes')
    ensureMeta('apple-mobile-web-app-capable', 'yes')
    ensureMeta('apple-mobile-web-app-status-bar-style', 'black-translucent')
  }, [])

  return null
}

export default TVDocumentMetadata
