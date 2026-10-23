import { TestBed } from '@angular/core/testing';
import { SHARE_NAVIGATOR, WebShare } from './web-share';

describe('WebShare', () => {
  /**
   * Creates the service with `navigator` standing for the browser's.
   */
  function create(navigator: Partial<Pick<Navigator, 'share' | 'clipboard'>>): WebShare {
    TestBed.configureTestingModule({
      providers: [{ provide: SHARE_NAVIGATOR, useValue: navigator }],
    });
    return TestBed.inject(WebShare);
  }

  it('opens the share sheet of the browser', async () => {
    const share = vi.fn(() => Promise.resolve());
    const service = create({ share });

    await service.share({ title: 'Pizza Roma', url: 'https://foodrank.test/restaurant/r1' });

    expect(service.supported).toBe(true);
    expect(share).toHaveBeenCalledWith({
      title: 'Pizza Roma',
      url: 'https://foodrank.test/restaurant/r1',
    });
  });

  it('ignores a share the user cancels', async () => {
    const service = create({
      share: () => Promise.reject(new DOMException('Share canceled', 'AbortError')),
    });

    await expect(service.share({ url: 'https://foodrank.test' })).resolves.toBeUndefined();
  });

  it('is not supported when the browser has no Web Share API nor clipboard', () => {
    const service = create({});

    expect(service.supported).toBe(false);
    expect(service.canCopy).toBe(false);
  });

  it('copies a link to the clipboard', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    const service = create({ clipboard: { writeText } as unknown as Clipboard });

    expect(service.canCopy).toBe(true);
    expect(await service.copy('https://foodrank.test/restaurant/r1')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('https://foodrank.test/restaurant/r1');
  });

  it('tells when the browser refuses to copy', async () => {
    const writeText = () => Promise.reject(new DOMException('Denied', 'NotAllowedError'));
    const service = create({ clipboard: { writeText } as unknown as Clipboard });

    expect(await service.copy('https://foodrank.test')).toBe(false);
  });
});
