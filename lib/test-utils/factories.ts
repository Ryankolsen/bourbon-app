/**
 * Default factories for domain objects mirroring types/database.ts Row types.
 *
 * Each factory accepts a partial override so tests only need to specify
 * fields that matter for the scenario under test:
 *
 *   const bourbon = bourbonFactory({ name: 'Pappy Van Winkle' });
 *   const tasting = tastingFactory({ rating: 9, bourbon_id: bourbon.id });
 */

import type { Database } from '../../types/database';

type Bourbon = Database['public']['Tables']['bourbons']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Tasting = Database['public']['Tables']['tastings']['Row'];
type Group = Database['public']['Tables']['groups']['Row'];
type GroupMember = Database['public']['Tables']['group_members']['Row'];
type Comment = Database['public']['Tables']['bourbon_comments']['Row'];
type UserCollection = Database['public']['Tables']['user_collection']['Row'];
type UserWishlist = Database['public']['Tables']['user_wishlist']['Row'];

let _seq = 0;
function seq(): string {
  return String(++_seq).padStart(8, '0');
}

function uuid(): string {
  return `00000000-0000-0000-0000-${seq()}`;
}

function now(): string {
  return new Date().toISOString();
}

export function bourbonFactory(overrides: Partial<Bourbon> = {}): Bourbon {
  return {
    id: uuid(),
    name: 'Test Bourbon',
    distillery: 'Test Distillery',
    mashbill: null,
    age_statement: null,
    proof: 90,
    type: 'Straight Bourbon',
    msrp: null,
    image_url: null,
    description: null,
    city: null,
    state: 'Kentucky',
    country: 'USA',
    submitted_by: null,
    updated_by: null,
    created_at: now(),
    updated_at: now(),
    ...overrides,
  };
}

export function profileFactory(overrides: Partial<Profile> = {}): Profile {
  const id = overrides.id ?? uuid();
  return {
    id,
    username: `user_${id.slice(-8)}`,
    display_name: 'Test User',
    avatar_url: null,
    is_admin: false,
    created_at: now(),
    updated_at: now(),
    ...overrides,
  };
}

export function tastingFactory(overrides: Partial<Tasting> = {}): Tasting {
  return {
    id: uuid(),
    user_id: uuid(),
    bourbon_id: uuid(),
    collection_id: null,
    rating: 8,
    nose: null,
    palate: null,
    finish: null,
    overall_notes: null,
    tasted_at: now(),
    created_at: now(),
    ...overrides,
  };
}

export function groupFactory(overrides: Partial<Group> = {}): Group {
  return {
    id: uuid(),
    name: 'Test Group',
    description: null,
    created_by: uuid(),
    created_at: now(),
    updated_at: now(),
    ...overrides,
  };
}

export function groupMemberFactory(overrides: Partial<GroupMember> = {}): GroupMember {
  return {
    group_id: uuid(),
    user_id: uuid(),
    role: 'member',
    status: 'accepted',
    invited_by: null,
    created_at: now(),
    updated_at: now(),
    ...overrides,
  };
}

export function commentFactory(overrides: Partial<Comment> = {}): Comment {
  return {
    id: uuid(),
    bourbon_id: uuid(),
    user_id: uuid(),
    body: 'Great bourbon!',
    visibility: 'public',
    group_id: null,
    created_at: now(),
    ...overrides,
  };
}

export function userCollectionFactory(overrides: Partial<UserCollection> = {}): UserCollection {
  return {
    id: uuid(),
    user_id: uuid(),
    bourbon_id: uuid(),
    purchase_price: null,
    purchase_date: null,
    purchase_location: null,
    notes: null,
    created_at: now(),
    ...overrides,
  };
}

export function userWishlistFactory(overrides: Partial<UserWishlist> = {}): UserWishlist {
  return {
    id: uuid(),
    user_id: uuid(),
    bourbon_id: uuid(),
    priority: 0,
    notes: null,
    created_at: now(),
    ...overrides,
  };
}
