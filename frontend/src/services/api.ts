const API_BASE_URL = ''

type ApiErrorPayload = {
  error?: string
  message?: string
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`

    try {
      const payload = (await response.json()) as ApiErrorPayload
      message = payload.message || payload.error || message
    } catch {
      // The server did not return JSON. Preserve the status-based message.
    }

    throw new Error(message)
  }

  return response.json() as Promise<T>
}
