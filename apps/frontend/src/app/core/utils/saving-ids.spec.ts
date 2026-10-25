import { SavingIds } from './saving-ids';

/**
 * A save that ends when `end` is called, failing when `fail` is true.
 */
function pendingSave(): { save: () => Promise<void>; end: (fail?: boolean) => void } {
  let end: (fail?: boolean) => void = () => undefined;
  const done = new Promise<void>((resolve, reject) => {
    end = (fail = false) => (fail ? reject(new Error('503')) : resolve());
  });
  return { save: () => done, end };
}

describe('SavingIds', () => {
  it('marks a row as being saved until its save succeeds, the other rows not', async () => {
    const saving = new SavingIds<string>();
    const { save, end } = pendingSave();

    const run = saving.run('r1', save);
    expect(saving.has('r1')).toBe(true);
    expect(saving.has('r2')).toBe(false);

    end();
    await run;
    expect(saving.has('r1')).toBe(false);
  });

  it('marks a row as saved again once its save fails, the error going to the caller', async () => {
    const saving = new SavingIds<string>();
    const { save, end } = pendingSave();

    const run = saving.run('r1', save);
    end(true);

    await expect(run).rejects.toThrow('503');
    expect(saving.has('r1')).toBe(false);
  });

  it('does not save a row again while its change is being saved', async () => {
    const saving = new SavingIds<string>();
    const { save, end } = pendingSave();
    const second = vi.fn(() => Promise.resolve());

    const run = saving.run('r1', save);
    await saving.run('r1', second);
    expect(second).not.toHaveBeenCalled();

    end();
    await run;
    await saving.run('r1', second);
    expect(second).toHaveBeenCalledTimes(1);
  });
});
