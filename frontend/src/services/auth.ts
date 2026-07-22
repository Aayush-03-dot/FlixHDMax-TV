import { apiGet } from './api'
import type { LoginResponse, LogoutResponse, MeResponse } from '../types/auth'

const API_BASE_URL = ''

export function getCurrentUser() {
  return apiGet<MeResponse>('/api/me')
}

export async function loginUser(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      email,
      password,
    }),
  })

  const data: LoginResponse = await response.json()

  if (!response.ok) {
    throw data
  }

  return data
}

export async function logoutUser() {
  const response = await fetch(`${API_BASE_URL}/api/logout`, {
    method: 'POST',
    credentials: 'include',
  })

  const data: LogoutResponse = await response.json()

  if (!response.ok) {
    throw data
  }

  return data
}