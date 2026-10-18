import { blendTowardBlack, contrastRatio, relativeLuminance } from '@/lib/contrast';

describe('contrast helpers', () => {
  it('black on white is 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('is symmetric and 1:1 for identical colors', () => {
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 5);
    expect(contrastRatio('#374151', '#E5E7EB')).toBeCloseTo(
      contrastRatio('#E5E7EB', '#374151'),
      10,
    );
  });

  it('matches the audited ratio for #374151 on #E5E7EB (8.33)', () => {
    expect(contrastRatio('#374151', '#E5E7EB')).toBeCloseTo(8.33, 1);
  });

  it('relative luminance of white is 1 and black is 0', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBe(0);
  });

  it('blendTowardBlack scales channels', () => {
    expect(blendTowardBlack('#FFFFFF', 0.4)).toBe('#999999');
    expect(blendTowardBlack('#FFFFFF', 0)).toBe('#ffffff');
  });
});
