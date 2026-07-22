export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

type AdminMutationMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

function buildAdminUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  return `${API_BASE_URL}${path}`
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as T | null

  if (!response.ok) {
    const message =
      (data as { message?: string; error?: string } | null)?.message ||
      (data as { message?: string; error?: string } | null)?.error ||
      `Request failed with status ${response.status}`

    throw new Error(message)
  }

  if (data === null) {
    return {} as T
  }

  return data
}

export async function adminFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(buildAdminUrl(path), {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  return parseJsonResponse<T>(response)
}

export async function adminMutation<T>(
  path: string,
  method: AdminMutationMethod = 'POST',
  payload?: unknown
): Promise<T> {
  const hasBody = payload !== undefined

  const response = await fetch(buildAdminUrl(path), {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    },
    body: hasBody ? JSON.stringify(payload) : undefined,
  })

  const data = await parseJsonResponse<T>(response)

  if (
    data &&
    typeof data === 'object' &&
    'success' in data &&
    (data as { success?: boolean }).success === false
  ) {
    const message =
      (data as { message?: string; error?: string }).message ||
      (data as { message?: string; error?: string }).error ||
      'Admin request failed.'

    throw new Error(message)
  }

  return data
}