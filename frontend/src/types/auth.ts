export type AuthUser = {
  id: number
  username?: string
  display_name?: string | null
  email?: string
  role?: string
  profile_image?: string | null
  profile_image_url?: string | null
  [key: string]: unknown
}

export type MeResponse = {
  authenticated: boolean
  user: AuthUser | null
}

export type LoginResponse = {
  success: boolean
  message?: string
  error?: string
  needs_verification?: boolean
  user?: AuthUser
}

export type LogoutResponse = {
  success: boolean
  message?: string
}
