/**
 * Pure state machine for the toast notification queue.
 * No React — fully unit-testable.
 */

export type ToastType = "success" | "error";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  onPress?: () => void;
}

export type ToastQueue = ToastItem[];

/**
 * Add a new toast to the end of the queue.
 */
export function enqueueToast(
  queue: ToastQueue,
  message: string,
  type: ToastType,
  id: string,
  onPress?: () => void,
): ToastQueue {
  return [...queue, { id, message, type, onPress }];
}

/**
 * Remove a toast from the queue by its id.
 */
export function dequeueToast(queue: ToastQueue, id: string): ToastQueue {
  return queue.filter((item) => item.id !== id);
}

/**
 * Advance the queue by removing the first (currently-displayed) item.
 */
export function advanceQueue(queue: ToastQueue): ToastQueue {
  return queue.slice(1);
}
