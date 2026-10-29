import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { type LocationStatus, LocationStore } from '@/core/location/location-store';
import { clickButton, textOf } from '@/testing/dom-testing';
import { SearchAreaHint } from './search-area-hint';

describe('SearchAreaHint', () => {
  let requestLocation: ReturnType<typeof vi.fn>;
  let status: WritableSignal<LocationStatus>;
  let city: WritableSignal<string | null>;
  let fixture: ComponentFixture<SearchAreaHint>;

  beforeEach(() => {
    requestLocation = vi.fn();
    status = signal('idle');
    city = signal('Lyon');
    TestBed.configureTestingModule({
      providers: [{ provide: LocationStore, useValue: { status, city, requestLocation } }],
    });
  });

  /**
   * Shows the hint.
   */
  async function render(): Promise<void> {
    fixture = TestBed.createComponent(SearchAreaHint);
    await fixture.whenStable();
  }

  /**
   * Texts shown side by side in the hint (the pin, the label, the separator, the button or message)
   */
  function parts(): string[] {
    const hint = (fixture.nativeElement as HTMLElement).querySelector('.search-area')!;
    return (
      Array.from(hint.childNodes)
        // Leaves out the comments Angular uses to anchor @if blocks
        .filter((node) => node.nodeType !== Node.COMMENT_NODE)
        .map((node) => textOf(node as Element))
        .filter(Boolean)
    );
  }

  it('shows the default city and offers to enable the location when not located', async () => {
    await render();

    expect(parts()).toEqual(['📍', 'Around Lyon', '·', 'Enable location for nearby results']);

    await clickButton(fixture, 'Enable location for nearby results');
    expect(requestLocation).toHaveBeenCalledTimes(1);
  });

  it("shows the user's city once located", async () => {
    await render();

    status.set('granted');
    city.set('Caen');
    await fixture.whenStable();

    expect(parts()).toEqual(['📍', 'Around Caen']);
  });

  it('keeps showing the city while locating, without telling', async () => {
    status.set('pending');
    await render();

    expect(parts()).toEqual(['📍', 'Around Lyon']);
  });

  it('tells when the location is blocked in the browser settings', async () => {
    status.set('blocked');
    await render();

    expect(parts()).toEqual([
      '📍',
      'Around Lyon',
      '·',
      'Location blocked, allow it in your browser settings for nearby results',
    ]);
    expect((fixture.nativeElement as HTMLElement).querySelector('button')).toBeNull();
  });
});
