import { enqueueToast, dequeueToast, advanceQueue } from './toast';
import type { ToastQueue } from './toast';

const EMPTY: ToastQueue = [];

// ---------------------------------------------------------------------------
// enqueueToast
// ---------------------------------------------------------------------------

describe('enqueueToast', () => {
  // slice 1: adds item to empty queue
  it('adds a toast to an empty queue', () => {
    const result = enqueueToast(EMPTY, 'Hello', 'success', 'id-1');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 'id-1', message: 'Hello', type: 'success' });
  });

  // slice 2: appends to existing queue
  it('appends the new toast to the end of a non-empty queue', () => {
    const initial = enqueueToast(EMPTY, 'First', 'success', 'id-1');
    const result = enqueueToast(initial, 'Second', 'error', 'id-2');
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({ id: 'id-2', message: 'Second', type: 'error' });
  });

  // slice 3: does not mutate the original queue
  it('does not mutate the original queue', () => {
    const original: ToastQueue = [{ id: 'id-1', message: 'Existing', type: 'success' }];
    enqueueToast(original, 'New', 'success', 'id-2');
    expect(original).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// dequeueToast
// ---------------------------------------------------------------------------

describe('dequeueToast', () => {
  // slice 1: removes the correct item
  it('removes the toast with the matching id', () => {
    const queue: ToastQueue = [
      { id: 'id-1', message: 'First', type: 'success' },
      { id: 'id-2', message: 'Second', type: 'error' },
    ];
    const result = dequeueToast(queue, 'id-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('id-2');
  });

  // slice 2: unknown id leaves queue unchanged
  it('returns the queue unchanged when the id is not found', () => {
    const queue: ToastQueue = [{ id: 'id-1', message: 'Only', type: 'success' }];
    const result = dequeueToast(queue, 'id-99');
    expect(result).toHaveLength(1);
  });

  // slice 3: empty queue stays empty
  it('returns an empty array when called on an empty queue', () => {
    expect(dequeueToast(EMPTY, 'id-1')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// advanceQueue
// ---------------------------------------------------------------------------

describe('advanceQueue', () => {
  // slice 1: removes the first item
  it('removes the first toast from the queue', () => {
    const queue: ToastQueue = [
      { id: 'id-1', message: 'First', type: 'success' },
      { id: 'id-2', message: 'Second', type: 'error' },
    ];
    const result = advanceQueue(queue);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('id-2');
  });

  // slice 2: single-item queue becomes empty
  it('returns an empty queue when there was only one item', () => {
    const queue: ToastQueue = [{ id: 'id-1', message: 'Only', type: 'success' }];
    expect(advanceQueue(queue)).toHaveLength(0);
  });

  // slice 3: empty queue stays empty
  it('returns an empty array when called on an empty queue', () => {
    expect(advanceQueue(EMPTY)).toHaveLength(0);
  });
});
