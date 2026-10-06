import { describe, expect, it } from 'vitest';
import { clampOutputWidth, MIN_EDITOR_WIDTH, MIN_OUTPUT_WIDTH } from './PanelResizer';

describe('clampOutputWidth', () => {
  it('keeps both the output column and the editor usable', () => {
    expect(clampOutputWidth(400.4, 1000)).toBe(400);
    expect(clampOutputWidth(100, 1000)).toBe(MIN_OUTPUT_WIDTH);
    expect(clampOutputWidth(900, 1000)).toBe(1000 - MIN_EDITOR_WIDTH);
  });

  it('never goes below the output minimum on a cramped screen', () => {
    expect(clampOutputWidth(500, 400)).toBe(MIN_OUTPUT_WIDTH);
  });
});
