/**
 * Home screen segment definitions.
 *
 * Exported so they can be tested and referenced by the Home screen and
 * any future code that needs to identify the active tab segment without
 * importing the full React component tree.
 */

export const HOME_SEGMENTS = ['Feed', 'My Collection', 'Wishlist'] as const;
export type HomeSegment = (typeof HOME_SEGMENTS)[number];

/** Maps segment index to a stable key used for content routing. */
export const SEGMENT_CONTENT_KEYS = ['feed', 'collection', 'wishlist'] as const;
export type SegmentContentKey = (typeof SEGMENT_CONTENT_KEYS)[number];

/** The default segment shown when the Home screen first mounts. */
export const DEFAULT_SEGMENT_INDEX = 0; // Feed
