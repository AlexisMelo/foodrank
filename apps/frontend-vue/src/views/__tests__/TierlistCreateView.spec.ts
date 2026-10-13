import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  enableAutoUnmount,
  flushPromises,
  mount,
  RouterLinkStub,
  type VueWrapper,
} from '@vue/test-utils'
import { AxiosError, type AxiosResponse } from 'axios'
import TierlistCreateView from '@/views/TierlistCreateView.vue'
import { createTierlist } from '@/services/tierlistService'
import { DEFAULT_TIERLIST_EMOJI } from '@/utils/tierlist'

const replace = vi.fn()

vi.mock('@/services/tierlistService', () => ({ createTierlist: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => ({ replace }) }))

/**
 * Builds the error axios throws when the API answers with `status`.
 */
function httpError(status: number): AxiosError {
  return new AxiosError('HTTP error', String(status), undefined, undefined, {
    status,
  } as AxiosResponse)
}

/**
 * Mounts the page in the document: jsdom only submits a form on a submit button click when the form is attached.
 */
function mountPage() {
  return mount(TierlistCreateView, {
    attachTo: document.body,
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

function createButton(wrapper: VueWrapper) {
  return wrapper.get('.create-btn')
}

/**
 * Clicks Create, like the user does, and waits for the API call to settle.
 */
async function clickCreate(wrapper: VueWrapper) {
  await createButton(wrapper).trigger('click')
  await flushPromises()
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  replace.mockReset()
  vi.mocked(createTierlist).mockReset()
})

describe('TierlistCreateView', () => {
  it('only enables Create once the tierlist has a name', async () => {
    const wrapper = mountPage()
    expect(createButton(wrapper).attributes('disabled')).toBeDefined()

    await wrapper.get('#tierlist-name').setValue('   ')
    expect(createButton(wrapper).attributes('disabled')).toBeDefined()

    await wrapper.get('#tierlist-name').setValue('Top 10')
    expect(createButton(wrapper).attributes('disabled')).toBeUndefined()

    await wrapper.get('#tierlist-name').setValue('')
    expect(createButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('creates an unpinned tierlist with the default emoji and the trimmed name, then opens the tierlists', async () => {
    vi.mocked(createTierlist).mockResolvedValue()
    const wrapper = mountPage()

    await wrapper.get('#tierlist-name').setValue('  Best burgers  ')
    await wrapper.get('#tierlist-description').setValue('   ')
    await clickCreate(wrapper)

    expect(createTierlist).toHaveBeenCalledWith({
      emoji: DEFAULT_TIERLIST_EMOJI,
      name: 'Best burgers',
      description: null,
      pinned: false,
    })
    expect(replace).toHaveBeenCalledWith('/tierlists')
  })

  it('sends the picked emoji, the description and the pin', async () => {
    vi.mocked(createTierlist).mockResolvedValue()
    const wrapper = mountPage()

    await wrapper.get('.cover').trigger('click')
    await wrapper
      .findAll('.emoji-option')
      .find((o) => o.text() === '🍣')!
      .trigger('click')
    await wrapper.get('#tierlist-name').setValue('Sushi spots')
    await wrapper.get('#tierlist-description').setValue('  Fresh fish only ')
    await wrapper.get('input[role="switch"]').setValue(true)
    await clickCreate(wrapper)

    expect(createTierlist).toHaveBeenCalledWith({
      emoji: '🍣',
      name: 'Sushi spots',
      description: 'Fresh fish only',
      pinned: true,
    })
  })

  it('shows the picked emoji as the picture and closes the emojis, without creating the tierlist', async () => {
    const wrapper = mountPage()
    await wrapper.get('#tierlist-name').setValue('Top 10')
    expect(wrapper.get('.cover').text()).toBe(DEFAULT_TIERLIST_EMOJI)
    expect(wrapper.find('.emoji-grid').exists()).toBe(false)

    await wrapper.get('.cover').trigger('click')
    await wrapper
      .findAll('.emoji-option')
      .find((o) => o.text() === '🍕')!
      .trigger('click')
    await flushPromises()

    expect(wrapper.get('.cover').text()).toBe('🍕')
    expect(wrapper.find('.emoji-grid').exists()).toBe(false)
    expect(createTierlist).not.toHaveBeenCalled()
  })

  it('closes the emojis without changing the picture on a tap outside or Escape', async () => {
    const wrapper = mountPage()

    await wrapper.get('.cover').trigger('click')
    await wrapper.get('.emoji-backdrop').trigger('click')
    expect(wrapper.find('.emoji-grid').exists()).toBe(false)

    await wrapper.get('.cover').trigger('click')
    await wrapper.get('.emoji-option').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.emoji-grid').exists()).toBe(false)

    expect(wrapper.get('.cover').text()).toBe(DEFAULT_TIERLIST_EMOJI)
    expect(createTierlist).not.toHaveBeenCalled()
  })

  it('asks to log in when the session expired, and stays on the page', async () => {
    vi.mocked(createTierlist).mockRejectedValue(httpError(401))
    const wrapper = mountPage()

    await wrapper.get('#tierlist-name').setValue('Top 10')
    await clickCreate(wrapper)

    expect(wrapper.get('.save-error').text()).toBe('Log in to create a tierlist.')
    expect(replace).not.toHaveBeenCalled()
  })

  it('shows a generic error when the API fails, keeping what the user typed', async () => {
    vi.mocked(createTierlist).mockRejectedValue(httpError(503))
    const wrapper = mountPage()

    await wrapper.get('#tierlist-name').setValue('Top 10')
    await clickCreate(wrapper)

    expect(wrapper.get('.save-error').text()).toBe('Could not create your tierlist, try again.')
    expect((wrapper.get('#tierlist-name').element as HTMLInputElement).value).toBe('Top 10')
    expect(replace).not.toHaveBeenCalled()
  })

  it('disables Create while saving, so the tierlist is not created twice', async () => {
    let resolveSave!: () => void
    vi.mocked(createTierlist).mockReturnValue(new Promise<void>((r) => (resolveSave = r)))
    const wrapper = mountPage()

    await wrapper.get('#tierlist-name').setValue('Top 10')
    await createButton(wrapper).trigger('click')
    expect(createButton(wrapper).attributes('disabled')).toBeDefined()
    await createButton(wrapper).trigger('click')

    resolveSave()
    await flushPromises()
    expect(createTierlist).toHaveBeenCalledOnce()
  })

  it('goes back to the tierlists from the arrow', () => {
    const wrapper = mountPage()

    expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe('/tierlists')
  })
})
