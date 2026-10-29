import { AccessibilityInfo } from 'react-native';

import { announce } from '@/lib/announce';

describe('announce', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('announces the message once', () => {
    announce('Correct');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('Correct');
  });

  it('trims surrounding whitespace', () => {
    announce('  Saved  ');
    expect(spy).toHaveBeenCalledWith('Saved');
  });

  it('does nothing for empty or whitespace-only messages', () => {
    announce('');
    announce('   ');
    expect(spy).not.toHaveBeenCalled();
  });
});
