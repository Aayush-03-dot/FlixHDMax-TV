import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getTVHomePath } from '../utils'

const FOCUSABLE_SELECTOR =
  '[data-tv-focusable="true"]:not([disabled]):not([aria-disabled="true"]):not([aria-hidden="true"])'

type Direction = 'left' | 'right' | 'up' | 'down'

type FocusableElement = HTMLElement & {
  disabled?: boolean
}

declare global {
  interface Window {
    __flixTVHandleNativeKey?: (keyCode: number) => boolean
  }
}

function isVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element)
  const rect = element.getBoundingClientRect()

  return (
    style.visibility !== 'hidden' &&
    style.display !== 'none' &&
    Number(style.opacity) !== 0 &&
    rect.width > 0 &&
    rect.height > 0
  )
}

function centre(rect: DOMRect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
}

function allFocusableElements() {
  return Array.from(
    document.querySelectorAll<FocusableElement>(FOCUSABLE_SELECTOR)
  ).filter(isVisible)
}

function getNextElement(current: HTMLElement, direction: Direction) {
  const currentRect = current.getBoundingClientRect()
  const currentCentre = centre(currentRect)

  const candidates = allFocusableElements().filter(
    (candidate) => candidate !== current
  )

  const scored = candidates
    .map((candidate) => {
      const rect = candidate.getBoundingClientRect()
      const candidateCentre = centre(rect)
      const dx = candidateCentre.x - currentCentre.x
      const dy = candidateCentre.y - currentCentre.y

      const inDirection =
        direction === 'left'
          ? dx < -8
          : direction === 'right'
            ? dx > 8
            : direction === 'up'
              ? dy < -8
              : dy > 8

      if (!inDirection) return null

      const horizontal = direction === 'left' || direction === 'right'
      const primaryDistance = horizontal ? Math.abs(dx) : Math.abs(dy)
      const secondaryDistance = horizontal ? Math.abs(dy) : Math.abs(dx)

      const currentSpan = horizontal ? currentRect.height : currentRect.width
      const candidateSpan = horizontal ? rect.height : rect.width
      const overlapStart = horizontal
        ? Math.max(currentRect.top, rect.top)
        : Math.max(currentRect.left, rect.left)
      const overlapEnd = horizontal
        ? Math.min(currentRect.bottom, rect.bottom)
        : Math.min(currentRect.right, rect.right)
      const overlap = Math.max(0, overlapEnd - overlapStart)
      const overlapRatio = overlap / Math.max(1, Math.min(currentSpan, candidateSpan))

      const sameLaneBonus = overlapRatio > 0.35 ? -Math.min(140, primaryDistance * 0.2) : 0
      const crossLanePenalty = secondaryDistance * (horizontal ? 1.65 : 1.9)
      const navPenalty = candidate.closest('.tv-top-nav') && direction !== 'up' ? 240 : 0

      return {
        candidate,
        score: primaryDistance + crossLanePenalty + navPenalty + sameLaneBonus,
      }
    })
    .filter((value): value is { candidate: FocusableElement; score: number } =>
      Boolean(value)
    )
    .sort((a, b) => a.score - b.score)

  return scored[0]?.candidate || null
}

function clearFocusClass() {
  document
    .querySelectorAll<HTMLElement>('.is-tv-focused')
    .forEach((element) => element.classList.remove('is-tv-focused'))
}

function focusElement(element: HTMLElement | null) {
  if (!element || !isVisible(element)) return false

  clearFocusClass()
  element.classList.add('is-tv-focused')
  element.focus({ preventScroll: true })
  element.scrollIntoView({
    behavior: 'auto',
    block: 'nearest',
    inline: 'center',
  })

  return document.activeElement === element
}

function directionFromCode(keyCode: number): Direction | null {
  if (keyCode === 37 || keyCode === 21) return 'left'
  if (keyCode === 39 || keyCode === 22) return 'right'
  if (keyCode === 38 || keyCode === 19) return 'up'
  if (keyCode === 40 || keyCode === 20) return 'down'
  return null
}

function isSelectCode(keyCode: number) {
  return keyCode === 13 || keyCode === 23 || keyCode === 66
}

function isBackCode(keyCode: number) {
  return (
    keyCode === 4 ||
    keyCode === 8 ||
    keyCode === 27 ||
    keyCode === 461 ||
    keyCode === 10009
  )
}

function isTextControl(element: Element | null) {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  )
}

function activateFocusedElement(element: HTMLElement | null) {
  if (!element || !element.matches(FOCUSABLE_SELECTOR)) return false

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.focus()
    element.click()
    return true
  }

  element.click()
  return true
}

function keyCodeOf(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') return 37
  if (event.key === 'ArrowRight') return 39
  if (event.key === 'ArrowUp') return 38
  if (event.key === 'ArrowDown') return 40
  if (event.key === 'Enter' || event.key === 'Select') return 13
  if (event.key === 'Escape' || event.key === 'BrowserBack' || event.key === 'GoBack') return 4
  return event.keyCode || event.which || 0
}

export function useTVRemoteNavigation() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    document.documentElement.classList.add('tv-document')
    document.body.classList.add('tv-body')

    let lastSelectAt = 0

    const restoreFocus = () => {
      const savedKey = sessionStorage.getItem(`tv-focus:${location.pathname}`)
      const saved = savedKey
        ? Array.from(document.querySelectorAll<HTMLElement>('[data-tv-key]')).find(
            (element) => element.dataset.tvKey === savedKey
          ) || null
        : null

      if (focusElement(saved)) return

      focusElement(
        document.querySelector<HTMLElement>('[data-tv-autofocus="true"]') ||
          document.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      )
    }

    const handleCode = (keyCode: number) => {
      const active = document.activeElement as HTMLElement | null
      const textControl = isTextControl(active)

      if (isBackCode(keyCode)) {
        if (textControl && active instanceof HTMLElement) {
          active.blur()
          window.setTimeout(restoreFocus, 0)
          return true
        }

        if (location.pathname !== getTVHomePath()) {
          navigate(-1)
          return true
        }

        return false
      }

      if (isSelectCode(keyCode)) {
        const now = Date.now()
        if (now - lastSelectAt < 220) return true
        lastSelectAt = now
        return activateFocusedElement(active)
      }

      const direction = directionFromCode(keyCode)
      if (!direction || textControl) return false

      const current =
        active && active.matches(FOCUSABLE_SELECTOR)
          ? active
          : document.querySelector<HTMLElement>('[data-tv-autofocus="true"]') ||
            document.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)

      if (!current) return false

      const next = getNextElement(current, direction)
      if (next) return focusElement(next)

      return true
    }

    window.__flixTVHandleNativeKey = handleCode

    const focusTimer = window.setTimeout(restoreFocus, 100)

    const observer = new MutationObserver(() => {
      const active = document.activeElement as HTMLElement | null

      if (!active || active === document.body || !isVisible(active)) {
        window.setTimeout(restoreFocus, 0)
      }
    })

    observer.observe(document.getElementById('root') || document.body, {
      childList: true,
      subtree: true,
    })

    const handleFocus = (event: FocusEvent) => {
      const element = event.target as HTMLElement | null
      if (!element?.matches(FOCUSABLE_SELECTOR)) return

      clearFocusClass()
      element.classList.add('is-tv-focused')

      const key = element.dataset.tvKey
      if (key) sessionStorage.setItem(`tv-focus:${location.pathname}`, key)
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        FOCUSABLE_SELECTOR
      )
      if (target) focusElement(target)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat && isSelectCode(keyCodeOf(event))) return

      if (handleCode(keyCodeOf(event))) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    document.addEventListener('focusin', handleFocus, true)
    document.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.clearTimeout(focusTimer)
      observer.disconnect()
      document.removeEventListener('focusin', handleFocus, true)
      document.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('keydown', handleKeyDown, true)
      delete window.__flixTVHandleNativeKey
      clearFocusClass()
      document.documentElement.classList.remove('tv-document')
      document.body.classList.remove('tv-body')
    }
  }, [location.pathname, navigate])
}
