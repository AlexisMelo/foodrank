import { TestBed } from '@angular/core/testing';
import { CelebrationStore } from './celebration-store';

describe('CelebrationStore', () => {
  it('keeps the celebration waiting until it is dismissed', () => {
    const store = TestBed.inject(CelebrationStore);

    expect(store.pending()).toBeNull();
    store.celebrate('r1', 'explorer');
    expect(store.pending()).toEqual({ restaurantId: 'r1', kind: 'explorer' });

    store.dismiss();
    expect(store.pending()).toBeNull();
  });
});
