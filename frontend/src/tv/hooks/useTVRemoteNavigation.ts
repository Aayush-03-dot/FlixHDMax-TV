import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getTVHomePath } from '../utils'

const FOCUSABLE_SELECTOR =
  '[data-tv-focusable="true"]:not([disabled]):not([aria-disabled="true"]):not([aria-hidden="true"])'

type Direction = 'left' | 'right' | 'up' | 'down'
type FocusableElement = HTMLElement & { disabled?: boolean }

declare global {
  interface Window {
    __flixTVHandleNativeKey?: (keyCode: number) => boolean
    __flixTVSetInput?: (fieldKey: string, value: string) => void
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

function allFocusableElements() {
  return Array.from(
    document.querySelectorAll<FocusableElement>(FOCUSABLE_SELECTOR)
  ).filter(isVisible)
}

function findByTVKey(key?: string | null) {
  if (!key) return null

  return (
    Array.from(document.querySelectorAll<FocusableElement>('[data-tv-key]')).find(
      (element) => element.dataset.tvKey === key && isVisible(element)
    ) || null
  )
}

function groupOf(element: HTMLElement) {
  return (
    element.dataset.tvGroup ||
    element.closest<HTMLElement>('[data-tv-group]')?.dataset.tvGroup ||
    'default'
  )
}

function centre(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    rect,
  }
}

function explicitTarget(current: HTMLElement, direction: Direction) {
  const key =
    direction === 'left'
      ? current.dataset.tvNextLeft
      : direction === 'right'
        ? current.dataset.tvNextRight
        : direction === 'up'
          ? current.dataset.tvNextUp
          : current.dataset.tvNextDown

  return findByTVKey(key)
}

function groupOrder(elements: HTMLElement[]) {
  const order: string[] = []

  elements.forEach((element) => {
    const group = groupOf(element)
    if (!order.includes(group)) order.push(group)
  })

  return order
}

function scoreDirectionalCandidate(
  current: HTMLElement,
  candidate: HTMLElement,
  direction: Direction,
  groupDistance = 0
) {
  const from = centre(current)
  const to = centre(candidate)
  const dx = to.x - from.x
  const dy = to.y - from.y

  const valid =
    direction === 'left'
      ? dx < -6
      : direction === 'right'
        ? dx > 6
        : direction === 'up'
          ? dy < -6
          : dy > 6

  if (!valid) return Number.POSITIVE_INFINITY

  const horizontal = direction === 'left' || direction === 'right'
  const primary = horizontal ? Math.abs(dx) : Math.abs(dy)
  const secondary = horizontal ? Math.abs(dy) : Math.abs(dx)

  const overlapStart = horizontal
    ? Math.max(from.rect.top, to.rect.top)
    : Math.max(from.rect.left, to.rect.left)
  const overlapEnd = horizontal
    ? Math.min(from.rect.bottom, to.rect.bottom)
    : Math.min(from.rect.right, to.rect.right)
  const overlap = Math.max(0, overlapEnd - overlapStart)
  const span = horizontal
    ? Math.min(from.rect.height, to.rect.height)
    : Math.min(from.rect.width, to.rect.width)
  const overlapRatio = overlap / Math.max(1, span)

  return (
    primary +
    secondary * (horizontal ? 2.4 : 1.55) +
    groupDistance * 420 -
    overlapRatio * 180
  )
}

function sameGroupTarget(current: HTMLElement, direction: Direction) {
  const currentGroup = groupOf(current)
  const candidates = allFocusableElements().filter(
    (candidate) => candidate !== current && groupOf(candidate) === currentGroup
  )

  return (
    candidates
      .map((candidate) => ({
        candidate,
        score: scoreDirectionalCandidate(current, candidate, direction),
      }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((a, b) => a.score - b.score)[0]?.candidate || null
  )
}

function adjacentGroupTarget(current: HTMLElement, direction: 'up' | 'down') {
  const elements = allFocusableElements()
  const currentGroup = groupOf(current)
  const order = groupOrder(elements)
  const currentIndex = order.indexOf(currentGroup)
  const step = direction === 'up' ? -1 : 1

  for (
    let index = currentIndex + step;
    index >= 0 && index < order.length;
    index += step
  ) {
    const group = order[index]

    if (group === 'top-nav' && direction === 'down') continue

    const candidates = elements.filter((element) => groupOf(element) === group)
    const ranked = candidates
      .map((candidate) => ({
        candidate,
        score: scoreDirectionalCandidate(
          current,
          candidate,
          direction,
          Math.abs(index - currentIndex) - 1
        ),
      }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((a, b) => a.score - b.score)

    if (ranked[0]) return ranked[0].candidate
  }

  return null
}

function getNextElement(current: HTMLElement, direction: Direction) {
  const routed = explicitTarget(current, direction)
  if (routed) return routed

  const currentGroup = groupOf(current)

  if (currentGroup === 'top-nav' && direction === 'down') {
    return (
      findByTVKey(sessionStorage.getItem('tv-last-content-focus')) ||
      document.querySelector<HTMLElement>('[data-tv-autofocus="true"]') ||
      null
    )
  }

  const sameGroup = sameGroupTarget(current, direction)
  if (sameGroup) return sameGroup

  if (direction === 'up' || direction === 'down') {
    return adjacentGroupTarget(current, direction)
  }

  return null
}

function clearFocusClass() {
  document
    .querySelectorAll<HTMLElement>('.is-tv-focused')
    .forEach((element) => element.classList.remove('is-tv-focused'))
}

function isTextControl(element: Element | null): element is HTMLInputElement | HTMLTextAreaElement {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
}

function hideNativeKeyboard() {
  try {
    window.AndroidTVInput?.hideKeyboard?.()
  } catch {
    // Browser development does not expose the native bridge.
  }
}

function scrollFocusedIntoView(element: HTMLElement, direction?: Direction) {
  const group = groupOf(element)

  if (group === 'top-nav' || group === 'hero-actions') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  element.scrollIntoView({
    behavior: direction === 'up' || direction === 'down' ? 'smooth' : 'auto',
    block: direction === 'up' || direction === 'down' ? 'center' : 'nearest',
    inline: 'center',
  })
}

function focusElement(element: HTMLElement | null, direction?: Direction) {
  if (!element || !isVisible(element)) return false

  clearFocusClass()
  element.classList.add('is-tv-focused')
  element.focus({ preventScroll: true })
  scrollFocusedIntoView(element, direction)

  if (!isTextControl(element)) hideNativeKeyboard()

  return document.activeElement === element
}

function openTextInput(element: HTMLInputElement | HTMLTextAreaElement) {
  const fieldKey = element.dataset.tvKey || element.name || element.id || 'tv-input'
  const label =
    element.dataset.tvInputLabel ||
    element.getAttribute('aria-label') ||
    element.getAttribute('placeholder') ||
    'Enter text'
  const inputType =
    element.dataset.tvInputType || element.getAttribute('type') || 'text'

  try {
    if (window.AndroidTVInput?.openKeyboard) {
      window.AndroidTVInput.openKeyboard(fieldKey, element.value, label, inputType)
      return true
    }
  } catch {
    // Fall through to browser input behaviour.
  }

  element.focus()
  element.click()
  return true
}

function activateFocusedElement(element: HTMLElement | null) {
  if (!element || !element.matches(FOCUSABLE_SELECTOR)) return false

  if (isTextControl(element)) return openTextInput(element)

  element.click()
  return true
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

function keyCodeOf(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') return 37
  if (event.key === 'ArrowRight') return 39
  if (event.key === 'ArrowUp') return 38
  if (event.key === 'ArrowDown') return 40
  if (event.key === 'Enter' || event.key === 'Select') return 13
  if (
    event.key === 'Escape' ||
    event.key === 'BrowserBack' ||
    event.key === 'GoBack'
  ) {
    return 4
  }
  return event.keyCode || event.which || 0
}

function setNativeInputValue(fieldKey: string, value: string) {
  const element = findByTVKey(fieldKey)
  if (!isTextControl(element)) return

  const prototype =
    element instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : HTMLTextAreaElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')

  descriptor?.set?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
  focusElement(element)
}

export function useTVRemoteNavigation() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    document.documentElement.classList.add('tv-document')
    document.body.classList.add('tv-body')

    let lastSelectAt = 0
    let cancelled = false

    const restoreFocus = () => {
      if (cancelled) return

      const savedKey = sessionStorage.getItem(`tv-focus:${location.pathname}`)
      const saved = findByTVKey(savedKey)
      const autofocus = document.querySelector<HTMLElement>(
        '[data-tv-autofocus="true"]'
      )
      const first = document.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)

      if (focusElement(saved || autofocus || first)) return

      window.setTimeout(restoreFocus, 80)
    }

    const handleCode = (keyCode: number) => {
      const active = document.activeElement as HTMLElement | null

      if (isBackCode(keyCode)) {
        if (isTextControl(active)) {
          hideNativeKeyboard()
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
        if (now - lastSelectAt < 180) return true
        lastSelectAt = now
        return activateFocusedElement(active)
      }

      const direction = directionFromCode(keyCode)
      if (!direction) return false

      const current =
        active && active.matches(FOCUSABLE_SELECTOR)
          ? active
          : document.querySelector<HTMLElement>('[data-tv-autofocus="true"]') ||
            document.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)

      if (!current) return false

      const next = getNextElement(current, direction)
      if (next) return focusElement(next, direction)

      return true
    }

    window.__flixTVHandleNativeKey = handleCode
    window.__flixTVSetInput = setNativeInputValue

    const focusTimer = window.setTimeout(restoreFocus, 100)

    const handleFocus = (event: FocusEvent) => {
      const element = event.target as HTMLElement | null
      if (!element?.matches(FOCUSABLE_SELECTOR)) return

      clearFocusClass()
      element.classList.add('is-tv-focused')

      const key = element.dataset.tvKey
      if (key) {
        sessionStorage.setItem(`tv-focus:${location.pathname}`, key)
        if (groupOf(element) !== 'top-nav') {
          sessionStorage.setItem('tv-last-content-focus', key)
        }
      }
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
      cancelled = true
      window.clearTimeout(focusTimer)
      document.removeEventListener('focusin', handleFocus, true)
      document.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('keydown', handleKeyDown, true)
      delete window.__flixTVHandleNativeKey
      delete window.__flixTVSetInput
    }
  }, [location.pathname, navigate])
}
