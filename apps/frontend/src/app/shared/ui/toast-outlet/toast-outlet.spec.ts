import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastStore } from '@/core/toast/toast-store';
import { query, queryAll, textOf } from '@/testing/dom-testing';
import { ToastOutlet } from './toast-outlet';

/**
 * A page with its outlet, and a modal with its own outlet while it is open.
 */
@Component({
  imports: [ToastOutlet],
  template: `
    <app-toast-outlet class="page-outlet" />
    @if (modalOpen()) {
      <app-toast-outlet class="modal-outlet" />
    }
  `,
})
class TestHost {
  /**
   * True while the modal, and its outlet, are shown
   */
  readonly modalOpen = signal(false);
}

describe('ToastOutlet', () => {
  let fixture: ComponentFixture<TestHost>;
  let toasts: ToastStore;

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    toasts = TestBed.inject(ToastStore);
    await fixture.whenStable();
  });

  /**
   * Messages rendered in the outlet matching `selector`.
   */
  function messagesIn(selector: string): string[] {
    return queryAll(fixture, `${selector} .toast-message`).map(textOf);
  }

  it('renders the toasts as alerts in the page outlet', async () => {
    toasts.show('Could not save');
    await fixture.whenStable();

    expect(messagesIn('.page-outlet')).toEqual(['Could not save']);
    expect(query(fixture, '.toast').getAttribute('role')).toBe('alert');
  });

  it('renders a confirmation as a status, in green, the errors staying alerts', async () => {
    toasts.show('Could not save');
    toasts.show('Pizza Roma added to Top 10.', 'success');
    await fixture.whenStable();

    const [error, success] = queryAll(fixture, '.toast');
    expect(error!.getAttribute('role')).toBe('alert');
    expect(error!.classList).not.toContain('toast-success');
    expect(success!.getAttribute('role')).toBe('status');
    expect(success!.classList).toContain('toast-success');
  });

  it('renders the toasts only in the modal outlet while the modal is open, then in the page again', async () => {
    fixture.componentInstance.modalOpen.set(true);
    toasts.show('Already in Top 10');
    await fixture.whenStable();

    expect(messagesIn('.modal-outlet')).toEqual(['Already in Top 10']);
    expect(messagesIn('.page-outlet')).toEqual([]);

    fixture.componentInstance.modalOpen.set(false);
    await fixture.whenStable();

    expect(messagesIn('.page-outlet')).toEqual(['Already in Top 10']);
  });

  it('hides a toast from its dismiss button', async () => {
    toasts.show('Could not save');
    await fixture.whenStable();

    query(fixture, '.toast-close').click();
    await fixture.whenStable();

    expect(queryAll(fixture, '.toast')).toHaveLength(0);
  });
});
