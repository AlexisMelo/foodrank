import { describe, it, expect } from 'vitest'
import { sessionRedirect } from '@/utils/auth'

describe('sessionRedirect', () => {
  it('sends a logged-out user from a private page to the login page', () => {
    expect(sessionRedirect(undefined, false)).toBe('/login')
  })

  it('lets a logged-out user see the login, sign up and public pages', () => {
    expect(sessionRedirect('guest', false)).toBeUndefined()
    expect(sessionRedirect('public', false)).toBeUndefined()
  })

  it('sends a logged-in user from the login and sign up pages to the home page', () => {
    expect(sessionRedirect('guest', true)).toBe('/')
  })

  it('lets a logged-in user see the private and public pages', () => {
    expect(sessionRedirect(undefined, true)).toBeUndefined()
    expect(sessionRedirect('public', true)).toBeUndefined()
  })
})
