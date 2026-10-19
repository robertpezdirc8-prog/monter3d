/**
 * Testi začetne konfiguracije vizualizatorja.
 */

import { describe, expect, it } from 'vitest';
import {
  MAX_FENCE_HEIGHT_MM,
  MIN_FENCE_HEIGHT_MM,
  getFenceProfiles,
  resolveFenceVisualizerConfig
} from '../utils/visualizerConfig';

describe('getFenceProfiles', () => {
  it('vrne pokončne ograjne profile brez pregradnih sistemov', () => {
    const profiles = getFenceProfiles('vertical');
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles.some(profile => profile.id === 'polna-deska-57-32')).toBe(true);
    expect(profiles.some(profile => profile.id === 'kubo-80-42')).toBe(false);
  });

  it('vrne prečne ograjne profile', () => {
    const profiles = getFenceProfiles('horizontal');
    expect(profiles.some(profile => profile.id === 'deska-150')).toBe(true);
    expect(profiles.some(profile => profile.id === 'polna-deska-57-32')).toBe(false);
  });
});

describe('resolveFenceVisualizerConfig', () => {
  it('uporabi privzeto pokončno konfiguracijo', () => {
    const config = resolveFenceVisualizerConfig();
    expect(config.orientation).toBe('vertical');
    expect(config.profile.kind).not.toBe('partition');
    expect(config.fenceHeight).toBe(1000);
    expect(config.boardSpacing).toBe(config.profile.recommendedBoardSpacing);
    expect(config.color).toBe(config.profile.colors[0]);
  });

  it('prevzame profil, barvo, orientacijo, višino in razmik', () => {
    const config = resolveFenceVisualizerConfig({
      profileId: 'polna-deska-100',
      colorId: 'white',
      orientation: 'vertical',
      boardSpacingMm: 15,
      fenceHeightMm: 1600
    });

    expect(config.profile.id).toBe('polna-deska-100');
    expect(config.color.id).toBe('white');
    expect(config.boardSpacing).toBe(15);
    expect(config.fenceHeight).toBe(1600);
  });

  it('izbere prečni profil in prečno orientacijo', () => {
    const config = resolveFenceVisualizerConfig({
      profileId: 'deska-150',
      orientation: 'horizontal',
      fenceHeightMm: 1200
    });

    expect(config.orientation).toBe('horizontal');
    expect(config.profile.id).toBe('deska-150');
    expect(config.fenceHeight).toBe(1200);
  });

  it('ne ponudi KUBO pregradnega sistema', () => {
    const config = resolveFenceVisualizerConfig({
      profileId: 'kubo-80-42',
      orientation: 'vertical'
    });

    expect(config.profile.id).not.toBe('kubo-80-42');
    expect(config.profile.kind).not.toBe('partition');
  });

  it('ob neveljavni barvi uporabi prvo barvo profila', () => {
    const config = resolveFenceVisualizerConfig({
      profileId: 'polna-deska-57-32',
      colorId: 'white'
    });

    expect(config.profile.id).toBe('polna-deska-57-32');
    expect(config.color.id).toBe('amazon-wood');
  });

  it('omeji višino in razmik na dovoljene meje profila', () => {
    const tooLow = resolveFenceVisualizerConfig({ fenceHeightMm: 200, boardSpacingMm: -5 });
    expect(tooLow.fenceHeight).toBe(MIN_FENCE_HEIGHT_MM);
    expect(tooLow.boardSpacing).toBe(tooLow.profile.minBoardSpacing);

    const tooHigh = resolveFenceVisualizerConfig({ fenceHeightMm: 5000, boardSpacingMm: 500 });
    expect(tooHigh.fenceHeight).toBe(MAX_FENCE_HEIGHT_MM);
    expect(tooHigh.boardSpacing).toBe(tooHigh.profile.maxBoardSpacing);
  });

  it('zaokroži višino na korak 50 mm', () => {
    const config = resolveFenceVisualizerConfig({ fenceHeightMm: 1234 });
    expect(config.fenceHeight).toBe(1250);
  });
});
