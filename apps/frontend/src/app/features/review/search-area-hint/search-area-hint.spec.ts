import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { RestaurantApi } from '@/core/api/restaurant-api';
import { type LocationStatus, UserLocation } from '@/core/location/user-location';
import type { UserLocation as UserPosition } from '@/core/models/location.model';
import type { SearchArea } from '@/core/models/restaurant.model';
import { clickButton, textOf } from '@/testing/dom-testing';
import { SearchAreaHint } from './search-area-hint';

describe('SearchAreaHint', () => {
  let fetchSearchArea: ReturnType<typeof vi.fn>;
  let requestLocation: ReturnType<typeof vi.fn>;
  let location: WritableSignal<UserPosition | null>;
  let status: WritableSignal<LocationStatus>;
  let fixture: ComponentFixture<SearchAreaHint>;

  beforeEach(() => {
    fetchSearchArea = vi.fn((position: UserPosition | null) =>
      of<SearchArea>(
        position ? { locality: 'Caen', isDefault: false } : { locality: 'Lyon', isDefault: true },
      ),
    );
    requestLocation = vi.fn();
    location = signal(null);
    status = signal('idle');
    TestBed.configureTestingModule({
      providers: [
        { provide: RestaurantApi, useValue: { fetchSearchArea } },
        { provide: UserLocation, useValue: { location, status, requestLocation } },
      ],
    });
  });

  /**
   * Shows the hint and waits for the search area.
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

    expect(fetchSearchArea).toHaveBeenCalledWith(null);
    expect(parts()).toEqual(['📍', 'Around Lyon', '·', 'Enable location for nearby results']);

    await clickButton(fixture, 'Enable location for nearby results');
    expect(requestLocation).toHaveBeenCalledTimes(1);
  });

  it("shows the user's city once located", async () => {
    await render();

    location.set({ lat: 49.18, lon: -0.37 });
    status.set('granted');
    await fixture.whenStable();

    expect(fetchSearchArea).toHaveBeenLastCalledWith({ lat: 49.18, lon: -0.37 });
    expect(parts()).toEqual(['📍', 'Around Caen']);
  });

  it('does not show the default city once located', async () => {
    status.set('granted');
    await render();

    expect(parts()).toEqual(['📍', 'Around you']);
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

  it('keeps the previous city until the one of a new position is known', async () => {
    location.set({ lat: 49.18, lon: -0.37 });
    status.set('granted');
    await render();
    const defaultArea = new Subject<SearchArea>();
    fetchSearchArea.mockReturnValue(defaultArea);

    // Blocked from the browser settings while the app is open
    location.set(null);
    status.set('blocked');
    // Renders while the default city loads (whenStable would wait for it)
    TestBed.tick();
    expect(fetchSearchArea).toHaveBeenLastCalledWith(null);
    expect(parts()[1]).toBe('Around Caen');

    defaultArea.next({ locality: 'Lyon', isDefault: true });
    await fixture.whenStable();
    expect(parts()[1]).toBe('Around Lyon');
  });

  it('tells while locating', async () => {
    status.set('pending');
    await render();

    expect(parts()).toEqual(['📍', 'Locating you…']);
  });
});
