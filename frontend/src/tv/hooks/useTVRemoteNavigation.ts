import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getTVHomePath } from '../utils'

const FOCUSABLE_SELECTOR =
  '[data-tv-focusable="true"]:not([disabled]):not([aria-disabled="true"]):not([aria-hidden="true"])'

type Direction = 'left' | 'right' | 'up' | 'down'

type FocusableElement = HTMLElement & {
  disabled?: boolean
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
          ? dx < -6
          : direction === 'right'
            ? dx > 6
            : direction === 'up'
              ? dy < -6
              : dy > 6

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

      const lanePenalty = overlapRatio > 0.2 ? 0 : secondaryDistance * 2.8
      const secondaryPenalty = secondaryDistance * (horizontal ? 1.15 : 1.35)

      return {
        candidate,
        score: primaryDistance + secondaryPenalty + lanePenalty,
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

function keyCodeOf(event: KeyboardEvent) {
  return event.keyCode || event.which || 0
}

function normalizedDirection(event: KeyboardEvent): Direction | null {
  const keyCode = keyCodeOf(event)

  if (event.key === 'ArrowLeft' || keyCode === 37 || keyCode === 21) return 'left'
  if (event.key === 'ArrowRight' || keyCode === 39 || keyCode === 22) return 'right'
  if (event.key === 'ArrowUp' || keyCode === 38 || keyCode === 19) return 'up'
  if (event.key === 'ArrowDown' || keyCode === 40 || keyCode === 20) return 'down'

  return null
}

function isSelectKey(event: KeyboardEvent) {
  const keyCode = keyCodeOf(event)

  return (
    event.key === 'Enter' ||
    event.key === 'Select' ||
    event.code === 'Enter' ||
    event.code === 'NumpadEnter' ||
    keyCode === 13 ||
    keyCode === 23 ||
    keyCode === 66
  )
}

function isBackKey(event: KeyboardEvent) {
  const keyCode = keyCodeOf(event)

  return (
    event.key === 'Escape' ||
    event.key === 'BrowserBack' ||
    event.key === 'GoBack' ||
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

    const focusTimer = window.setTimeout(restoreFocus, 90)

    const observer = new MutationObserver(() => {
      const active = document.activeElement as HTMLElement | null

      if (!active || active === document.body || !isVisible(active)) {
        restoreFocus()
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
      if (key) {
        sessionStorage.setItem(`tv-focus:${location.pathname}`, key)
      }
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        FOCUSABLE_SELECTOR
      )
      if (target) focusElement(target)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null
      const textControl = isTextControl(active)

      if (isBackKey(event)) {
        if (textControl && active instanceof HTMLElement) {
          active.blur()
          restoreFocus()
          event.preventDefault()
          event.stopPropagation()
          return
        }

        if (location.pathname !== getTVHomePath()) {
          event.preventDefault()
          event.stopPropagation()
          navigate(-1)
        }
        return
      }

      if (isSelectKey(event)) {
        if (event.repeat) return

        const now = Date.now()
        if (now - lastSelectAt < 250) return
        lastSelectAt = now

        if (activateFocusedElement(active)) {
          event.preventDefault()
          event.stopPropagation()
        }
        return
      }

      const direction = normalizedDirection(event)
      if (!direction || textControl) return

      event.preventDefault()
      event.stopPropagation()

      const current =
        active && active.matches(FOCUSABLE_SELECTOR)
          ? active
          : document.querySelector<HTMLElement>('[data-tv-autofocus="true"]') ||
            document.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)

      if (!current) return

      const next = getNextElement(current, direction)
      if (next) focusElement(next)
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
      clearFocusClass()
      document.documentElement.classList.remove('tv-document')
      document.body.classList.remove('tv-body')
    }
  }, [location.pathname, navigate])
}
