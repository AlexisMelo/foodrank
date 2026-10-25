import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthStore } from '@/core/auth/auth-store';
import { query, stubDialogs, submitForm, textOf, typeIn } from '@/testing/dom-testing';
import { DeleteAccountModal } from './delete-account-modal';

function httpError(status: number): HttpErrorResponse {
  return new HttpErrorResponse({ status });
}

describe('DeleteAccountModal', () => {
  let deleteAccount: ReturnType<typeof vi.fn>;
  let closed: ReturnType<typeof vi.fn<() => void>>;
  let fixture: ComponentFixture<DeleteAccountModal>;

  beforeEach(async () => {
    stubDialogs();
    deleteAccount = vi.fn();
    closed = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthStore, useValue: { deleteAccount } }],
    });
    fixture = TestBed.createComponent(DeleteAccountModal);
    fixture.componentInstance.closed.subscribe(closed);
    await fixture.whenStable();
  });

  /**
   * Types `password` in the popup, then confirms the deletion.
   */
  async function confirmWith(password: string): Promise<void> {
    await typeIn(fixture, '#delete-account-password', password);
    await submitForm(fixture);
  }

  /**
   * The Delete button.
   */
  function deleteButton(): HTMLButtonElement {
    return query<HTMLButtonElement>(fixture, '.confirm-btn');
  }

  it('deletes the account with the entered password', async () => {
    deleteAccount.mockResolvedValue(undefined);

    await confirmWith('secret');

    expect(deleteAccount).toHaveBeenCalledWith('secret');
    expect(fixture.nativeElement.querySelector('.error')).toBeNull();
  });

  it('cannot confirm before a password is entered', async () => {
    expect(deleteButton().disabled).toBe(true);
    await submitForm(fixture);

    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('tells the password is wrong, and lets the user try again', async () => {
    deleteAccount.mockRejectedValue(httpError(403));

    await confirmWith('wrong');

    expect(textOf(query(fixture, '.error'))).toBe('Incorrect password.');
    expect(closed).not.toHaveBeenCalled();
    expect(deleteButton().disabled).toBe(false);
  });

  it('shows a generic error when the deletion fails for another reason', async () => {
    deleteAccount.mockRejectedValue(httpError(503));

    await confirmWith('secret');

    expect(textOf(query(fixture, '.error'))).toBe(
      'Your account could not be deleted. Please try again later.',
    );
  });

  it('closes without deleting when cancelled', async () => {
    await typeIn(fixture, '#delete-account-password', 'secret');

    query(fixture, '.cancel-btn').click();
    await fixture.whenStable();

    expect(closed).toHaveBeenCalledTimes(1);
    expect(deleteAccount).not.toHaveBeenCalled();
  });
});
