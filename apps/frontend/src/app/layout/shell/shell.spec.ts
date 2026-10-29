import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LocationStore } from '@/core/location/location-store';
import { Shell } from './shell';

describe('Shell', () => {
  it('locates the user as soon as the app opens', async () => {
    const requestLocation = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: LocationStore, useValue: { requestLocation } }],
    });

    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();

    expect(requestLocation).toHaveBeenCalledOnce();
  });
});
