import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { RestaurantRating } from '@/core/models/rating.model';
import { query, queryAll, textOf } from '@/testing/dom-testing';
import { RestaurantRatingsTabs } from './restaurant-ratings-tabs';

/**
 * Builds a rating by `userName` on `date`.
 */
function rating(userName: string, date: string, overrides: Partial<RestaurantRating> = {}) {
  return {
    restaurantId: 'r1',
    userId: userName.toLowerCase(),
    date,
    food: 90,
    service: 60,
    setting: 30,
    bonus: false,
    isActive: true,
    userName,
    userAvatarUrl: null,
    ...overrides,
  } satisfies RestaurantRating;
}

/**
 * Inputs of the tabs.
 */
interface TabsInputs {
  /**
   * Database id of the restaurant
   */
  restaurantId: string;

  /**
   * The logged-in user's ratings
   */
  myRatings: RestaurantRating[];

  /**
   * Recent ratings of every user
   */
  recentRatings: RestaurantRating[];

  /**
   * True while the ratings load
   */
  loading: boolean;

  /**
   * True when the ratings could not be loaded
   */
  loadError: boolean;
}

describe('RestaurantRatingsTabs', () => {
  let fixture: ComponentFixture<RestaurantRatingsTabs>;

  beforeEach(() => {
    // The "New" chip needs the router; it is not what is tested here
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  /**
   * Renders the tabs with the given inputs (no rating, nothing loading by default).
   */
  async function render(inputs: Partial<TabsInputs> = {}): Promise<void> {
    fixture = TestBed.createComponent(RestaurantRatingsTabs);
    const all: TabsInputs = {
      restaurantId: 'r1',
      myRatings: [],
      recentRatings: [],
      loading: false,
      loadError: false,
      ...inputs,
    };
    for (const [name, value] of Object.entries(all)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  }

  /**
   * Changes some inputs of the rendered tabs.
   */
  async function setInputs(inputs: Partial<TabsInputs>): Promise<void> {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  }

  /**
   * Opens the "Recent" tab.
   */
  async function openRecentTab(): Promise<void> {
    query(fixture, '.tab-recent').click();
    await fixture.whenStable();
  }

  it("shows the user's own ratings first, with their date and scores", async () => {
    await render({
      myRatings: [rating('Me', '2026-03-07', { bonus: true }), rating('Me', '2026-01-02')],
      recentRatings: [rating('Camille', '2026-03-08')],
    });

    const cards = queryAll(fixture, '.visit-card');
    expect(cards).toHaveLength(2);
    expect(textOf(cards[0]!)).toContain('March 7, 2026');
    expect(textOf(cards[0]!)).toContain('💘');
    expect(Array.from(cards[0]!.querySelectorAll('.criterion-score'), textOf)).toEqual([
      '90',
      '60',
      '30',
    ]);
    expect(textOf(cards[0]!.querySelector('.visit-avg')!)).toBe('60');
    expect(textOf(cards[1]!)).toContain('January 2, 2026');
    expect(textOf(cards[1]!)).not.toContain('💘');
    expect(textOf(fixture.nativeElement)).not.toContain('Camille');
  });

  it('dims my previous ratings, replaced by a more recent one', async () => {
    await render({
      myRatings: [rating('Me', '2026-03-07'), rating('Me', '2026-01-02', { isActive: false })],
    });

    expect(queryAll(fixture, '.visit-card').map((c) => c.classList.contains('inactive'))).toEqual([
      false,
      true,
    ]);
  });

  it('shows the recent ratings of every user under "Recent"', async () => {
    await render({
      myRatings: [rating('Me', '2026-03-07')],
      recentRatings: [rating('Camille', '2026-03-08'), rating('Me', '2026-03-07')],
    });

    await openRecentTab();

    const cards = queryAll(fixture, '.community-card');
    expect(cards.map((c) => textOf(c.querySelector('.community-name')!))).toEqual([
      'Camille',
      'Me',
    ]);
    expect(textOf(cards[0]!)).toContain('March 8, 2026');
    expect(textOf(cards[0]!.querySelector('.community-avatar')!)).toBe('C');
    expect(queryAll(fixture, '.visit-card')).toHaveLength(0);
  });

  it("shows the author's picture when there is one", async () => {
    await render({
      recentRatings: [rating('Camille', '2026-03-08', { userAvatarUrl: 'https://img.test/c.png' })],
    });

    await openRecentTab();

    expect(query(fixture, 'img.community-avatar').getAttribute('src')).toBe(
      'https://img.test/c.png',
    );
  });

  it('explains when there is no rating in the selected tab', async () => {
    await render({ recentRatings: [rating('Camille', '2026-03-08')] });

    expect(textOf(fixture.nativeElement)).toContain('No visits yet');

    await openRecentTab();
    expect(textOf(fixture.nativeElement)).not.toContain('No recent visits');

    await setInputs({ recentRatings: [] });
    expect(textOf(fixture.nativeElement)).toContain('No recent visits');
  });

  it('shows the loading state, then the error, instead of an empty list', async () => {
    await render({ loading: true });
    expect(textOf(fixture.nativeElement)).toContain('Loading');
    expect(textOf(fixture.nativeElement)).not.toContain('No visits yet');

    await setInputs({ loading: false, loadError: true });
    expect(textOf(query(fixture, '.load-error'))).toBe("Couldn't load the ratings");
  });
});
