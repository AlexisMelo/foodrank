import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  enableAutoUnmount,
  flushPromises,
  mount,
  RouterLinkStub,
  type VueWrapper,
} from '@vue/test-utils'
import { AxiosError, type AxiosResponse } from 'axios'
import SignupProfileStep from '@/components/signup/SignupProfileStep.vue'
import { useSignupDraft } from '@/composables/useSignupDraft'

const signup = vi.fn()

vi.mock('@/composables/useAuth', () => ({ useAuth: () => ({ signup }) }))

const { draft, resetDraft } = useSignupDraft()

/**
 * Builds the error axios throws when the API answers with `status` and `data`.
 */
function httpError(status: number, data?: unknown): AxiosError {
  return new AxiosError('HTTP error', String(status), undefined, undefined, {
    status,
    data,
  } as AxiosResponse)
}

function mountStep() {
  return mount(SignupProfileStep, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

/** Fills the personal data, valid unless overridden. */
async function fill(
  wrapper: VueWrapper,
  { username = 'alex', age = '30', identity = 'woman' }: Record<string, string> = {},
) {
  await wrapper.get('#signup-username').setValue(username)
  await wrapper.get('#signup-age').setValue(age)
  await wrapper.get('#signup-identity').setValue(identity)
}

async function submit(wrapper: VueWrapper) {
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

function signupButton(wrapper: VueWrapper) {
  return wrapper.get('button[type="submit"]')
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  signup.mockReset()
  resetDraft()
  // Filled by the previous steps
  draft.email = 'me@test.fr'
  draft.password = 'abcdefg1'
})

describe('SignupProfileStep', () => {
  it('goes back to the password step with the arrow', () => {
    const wrapper = mountStep()

    expect(wrapper.getComponent(RouterLinkStub).props('to')).toEqual({
      path: '/signup',
      query: { step: '2' },
    })
  })

  it('offers the three identities', () => {
    const wrapper = mountStep()

    const options = wrapper.findAll('#signup-identity option:not([disabled])')
    expect(options.map((o) => [o.attributes('value'), o.text()])).toEqual([
      ['man', 'Man'],
      ['woman', 'Woman'],
      ['non_binary', 'Non-binary'],
    ])
  })

  it('only enables Sign up once pseudonym, age and identity are filled', async () => {
    const wrapper = mountStep()
    expect(signupButton(wrapper).attributes('disabled')).toBeDefined()

    await wrapper.get('#signup-username').setValue('alex')
    await wrapper.get('#signup-age').setValue('30')
    expect(signupButton(wrapper).attributes('disabled')).toBeDefined()

    await wrapper.get('#signup-identity').setValue('man')
    expect(signupButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it.each([
    [{ age: '-1' }, 'Enter an age between 0 and 120.'],
    [{ age: '121' }, 'Enter an age between 0 and 120.'],
    [{ age: '30.5' }, 'Enter an age between 0 and 120.'],
    [{ username: 'ab' }, 'Between 3 and 30 characters.'],
  ])('refuses %j and explains why', async (values, hint) => {
    const wrapper = mountStep()

    await fill(wrapper, values)
    await submit(wrapper)

    expect(wrapper.get('.field-hint').text()).toBe(hint)
    expect(signupButton(wrapper).attributes('disabled')).toBeDefined()
    expect(signup).not.toHaveBeenCalled()
  })

  it('shows no hint while the fields are empty', () => {
    const wrapper = mountStep()

    expect(wrapper.find('.field-hint').exists()).toBe(false)
  })

  it('signs up with the trimmed pseudonym and the age as a number, then empties the draft', async () => {
    signup.mockResolvedValue(undefined)
    const wrapper = mountStep()

    await fill(wrapper, { username: '  Alex B ', age: '0', identity: 'non_binary' })
    await submit(wrapper)

    expect(signup).toHaveBeenCalledWith({
      email: 'me@test.fr',
      password: 'abcdefg1',
      username: 'Alex B',
      age: 0,
      identity: 'non_binary',
    })
    expect(draft.password).toBe('')
    expect(draft.email).toBe('')
  })

  it.each([
    [
      httpError(409, { error: 'This pseudonym is already taken.' }),
      'This pseudonym is already taken.',
    ],
    [
      httpError(409, { error: 'An account with this email already exists.' }),
      'An account with this email already exists.',
    ],
    [httpError(409), 'This email or pseudonym is already used.'],
    [httpError(400, { errors: {} }), 'Some of your information was refused. Please check it.'],
    [httpError(500), 'Could not create account.'],
    [new AxiosError('Network Error'), 'Could not create account.'],
  ])('explains a failed sign up (%s) and keeps what was entered', async (error, message) => {
    signup.mockRejectedValue(error)
    const wrapper = mountStep()

    await fill(wrapper)
    await submit(wrapper)

    expect(wrapper.get('.error').text()).toBe(message)
    expect(signupButton(wrapper).attributes('disabled')).toBeUndefined()
    expect(draft.username).toBe('alex')
    expect(draft.password).toBe('abcdefg1')
  })
})
