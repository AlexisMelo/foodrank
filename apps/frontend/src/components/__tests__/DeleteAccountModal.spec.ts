import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { AxiosError, type AxiosResponse } from 'axios'
import DeleteAccountModal from '@/components/DeleteAccountModal.vue'

const deleteAccount = vi.fn()

vi.mock('@/composables/useAuth', () => ({ useAuth: () => ({ deleteAccount }) }))

/**
 * Mounts the popup with its teleport rendered in place, so the wrapper can find its content.
 */
function mountModal() {
  return mount(DeleteAccountModal, { global: { stubs: { teleport: true } } })
}

function httpError(status: number) {
  return new AxiosError('failed', undefined, undefined, undefined, { status } as AxiosResponse)
}

/**
 * Types `password` in the popup, then confirms the deletion.
 */
async function confirmWith(wrapper: ReturnType<typeof mount>, password: string) {
  await wrapper.get('#delete-account-password').setValue(password)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  deleteAccount.mockReset()
})

describe('DeleteAccountModal', () => {
  it('deletes the account with the entered password', async () => {
    deleteAccount.mockResolvedValue(undefined)
    const wrapper = mountModal()

    await confirmWith(wrapper, 'secret')

    expect(deleteAccount).toHaveBeenCalledWith('secret')
    expect(wrapper.find('.error').exists()).toBe(false)
  })

  it('cannot confirm before a password is entered', async () => {
    const wrapper = mountModal()

    expect(wrapper.get('.delete-btn').attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit')

    expect(deleteAccount).not.toHaveBeenCalled()
  })

  it('tells the password is wrong, and lets the user try again', async () => {
    deleteAccount.mockRejectedValue(httpError(403))
    const wrapper = mountModal()

    await confirmWith(wrapper, 'wrong')

    expect(wrapper.get('.error').text()).toBe('Incorrect password.')
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(wrapper.get('.delete-btn').attributes('disabled')).toBeUndefined()
  })

  it('shows a generic error when the deletion fails for another reason', async () => {
    deleteAccount.mockRejectedValue(httpError(503))
    const wrapper = mountModal()

    await confirmWith(wrapper, 'secret')

    expect(wrapper.get('.error').text()).toBe(
      'Your account could not be deleted. Please try again later.',
    )
  })

  it('closes without deleting when cancelled', async () => {
    const wrapper = mountModal()
    await wrapper.get('#delete-account-password').setValue('secret')

    await wrapper.get('.cancel-btn').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(deleteAccount).not.toHaveBeenCalled()
  })
})
