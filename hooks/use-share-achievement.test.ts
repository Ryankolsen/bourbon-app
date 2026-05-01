/**
 * Unit tests for useShareAchievement hook.
 *
 * Pattern: renderHook, supabase.rpc + captureRef + shareAsync all mocked.
 * Tests assert call order, state shape, and error-handling branches.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useShareAchievement } from './use-share-achievement';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockCaptureRef = jest.fn();
const mockShareAsync = jest.fn();
const mockRpc = jest.fn();

jest.mock('react-native-view-shot', () => ({
  captureRef: (...args: unknown[]) => mockCaptureRef(...args),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function rpcResponse(xp_awarded: number, already_claimed: boolean) {
  return {
    data: [{ xp_awarded, already_claimed }],
    error: null,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useShareAchievement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1 — core wiring: initial state before share() is called
  it('returns initial state: isSharing false, xpAwarded 0, alreadyClaimed false, error null', () => {
    const { result } = renderHook(() => useShareAchievement(1));

    expect(result.current.isSharing).toBe(false);
    expect(result.current.xpAwarded).toBe(0);
    expect(result.current.alreadyClaimed).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.cardRef).toBeDefined();
    expect(typeof result.current.share).toBe('function');
  });

  // 2 — core wiring: share() calls captureRef, rpc, shareAsync in order
  it('calls captureRef → rpc(award_achievement_share_xp) → shareAsync when share() is called', async () => {
    const callOrder: string[] = [];

    mockCaptureRef.mockImplementation(async () => {
      callOrder.push('captureRef');
      return 'file:///tmp/share.png';
    });
    mockRpc.mockImplementation(async () => {
      callOrder.push('rpc');
      return rpcResponse(100, false);
    });
    mockShareAsync.mockImplementation(async () => {
      callOrder.push('shareAsync');
    });

    const { result } = renderHook(() => useShareAchievement(2));

    await act(async () => {
      await result.current.share();
    });

    expect(callOrder).toEqual(['captureRef', 'rpc', 'shareAsync']);
  });

  // 3 — content details: rpc called with correct key (string of beltLevel)
  it('calls rpc("award_achievement_share_xp", { key: "3" }) for beltLevel 3', async () => {
    mockCaptureRef.mockResolvedValue('file:///tmp/share.png');
    mockRpc.mockResolvedValue(rpcResponse(100, false));
    mockShareAsync.mockResolvedValue(undefined);

    const { result } = renderHook(() => useShareAchievement(3));

    await act(async () => {
      await result.current.share();
    });

    expect(mockRpc).toHaveBeenCalledWith('award_achievement_share_xp', { key: '3' });
  });

  // 4 — content details: shareAsync called with captured URI and png mimeType
  it('calls shareAsync with the URI from captureRef and image/png mimeType', async () => {
    const uri = 'file:///tmp/belt-share-5.png';
    mockCaptureRef.mockResolvedValue(uri);
    mockRpc.mockResolvedValue(rpcResponse(100, false));
    mockShareAsync.mockResolvedValue(undefined);

    const { result } = renderHook(() => useShareAchievement(5));

    await act(async () => {
      await result.current.share();
    });

    expect(mockShareAsync).toHaveBeenCalledWith(uri, { mimeType: 'image/png' });
  });

  // 5 — content details: xpAwarded and alreadyClaimed populated after first share
  it('sets xpAwarded=100 and alreadyClaimed=false after first successful share', async () => {
    mockCaptureRef.mockResolvedValue('file:///tmp/share.png');
    mockRpc.mockResolvedValue(rpcResponse(100, false));
    mockShareAsync.mockResolvedValue(undefined);

    const { result } = renderHook(() => useShareAchievement(1));

    await act(async () => {
      await result.current.share();
    });

    expect(result.current.xpAwarded).toBe(100);
    expect(result.current.alreadyClaimed).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // 6 — content details: alreadyClaimed=true when RPC signals idempotent no-op
  it('sets alreadyClaimed=true and xpAwarded=0 when RPC signals already claimed', async () => {
    mockCaptureRef.mockResolvedValue('file:///tmp/share.png');
    mockRpc.mockResolvedValue(rpcResponse(0, true));
    mockShareAsync.mockResolvedValue(undefined);

    const { result } = renderHook(() => useShareAchievement(1));

    await act(async () => {
      await result.current.share();
    });

    expect(result.current.xpAwarded).toBe(0);
    expect(result.current.alreadyClaimed).toBe(true);
  });

  // 7 — isSharing lifecycle: true during share(), false after
  it('sets isSharing=true during share() and false after it resolves', async () => {
    let captureResolve!: (v: string) => void;
    mockCaptureRef.mockReturnValue(new Promise<string>((res) => { captureResolve = res; }));
    mockRpc.mockResolvedValue(rpcResponse(100, false));
    mockShareAsync.mockResolvedValue(undefined);

    const { result } = renderHook(() => useShareAchievement(1));

    // Start share — don't await yet
    let sharePromise: Promise<void>;
    act(() => {
      sharePromise = result.current.share();
    });

    // isSharing should be true while pending
    await waitFor(() => expect(result.current.isSharing).toBe(true));

    // Resolve capture and let share complete
    await act(async () => {
      captureResolve('file:///tmp/share.png');
      await sharePromise!;
    });

    expect(result.current.isSharing).toBe(false);
  });

  // 8 — edge case: captureRef failure → error set, rpc/shareAsync not called
  it('sets error and skips rpc/shareAsync when captureRef throws', async () => {
    mockCaptureRef.mockRejectedValue(new Error('capture failed'));

    const { result } = renderHook(() => useShareAchievement(1));

    await act(async () => {
      await result.current.share();
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('capture failed');
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(result.current.isSharing).toBe(false);
  });

  // 9 — edge case: RPC error → error set, shareAsync not called
  it('sets error and skips shareAsync when rpc throws', async () => {
    mockCaptureRef.mockResolvedValue('file:///tmp/share.png');
    mockRpc.mockResolvedValue({ data: null, error: { message: 'db error', code: '500' } });

    const { result } = renderHook(() => useShareAchievement(1));

    await act(async () => {
      await result.current.share();
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(result.current.isSharing).toBe(false);
  });

  // 10 — edge case: shareAsync failure → error set, xpAwarded still populated
  it('sets error when shareAsync throws but still reflects xpAwarded from rpc', async () => {
    mockCaptureRef.mockResolvedValue('file:///tmp/share.png');
    mockRpc.mockResolvedValue(rpcResponse(100, false));
    mockShareAsync.mockRejectedValue(new Error('sharing cancelled'));

    const { result } = renderHook(() => useShareAchievement(1));

    await act(async () => {
      await result.current.share();
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('sharing cancelled');
    expect(result.current.xpAwarded).toBe(100);
    expect(result.current.isSharing).toBe(false);
  });

  // 11 — edge case: share() is a no-op while already isSharing (no double-fire)
  it('does not start a second share while isSharing is true', async () => {
    let captureResolve!: (v: string) => void;
    mockCaptureRef.mockReturnValueOnce(new Promise<string>((res) => { captureResolve = res; }));
    mockRpc.mockResolvedValue(rpcResponse(100, false));
    mockShareAsync.mockResolvedValue(undefined);

    const { result } = renderHook(() => useShareAchievement(1));

    // Start first share (don't await)
    let sharePromise1: Promise<void>;
    act(() => {
      sharePromise1 = result.current.share();
    });

    await waitFor(() => expect(result.current.isSharing).toBe(true));

    // Attempt second share while first is in-flight
    await act(async () => {
      await result.current.share();
    });

    // captureRef should only have been called once
    expect(mockCaptureRef).toHaveBeenCalledTimes(1);

    // Resolve and cleanup
    await act(async () => {
      captureResolve('file:///tmp/share.png');
      await sharePromise1!;
    });
  });
});
