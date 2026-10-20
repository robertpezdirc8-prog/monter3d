// @vitest-environment jsdom
/**
 * UI testi: ErrorBoundary, urejevalnik segmentov in izbira Roksal profila.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { FenceSegmentEditor } from '../../components/FenceSegmentEditor';
import { MaterialView } from '../../components/steps/MaterialView';
import { RoksalImageView } from '../../components/RoksalImageView';
import type { FenceSegmentInput, MaterialPrices, Measurement, FenceConfig, StairsConfig } from '../../types';

function meritev(id: string, value: number): Measurement {
  return {
    id,
    type: 'length',
    value,
    unit: 'm',
    source: 'manual',
    scaleSource: 'manual_reference',
    status: 'verified',
    uncertainty: 3,
    confidence: 0.9,
    photoIds: [],
    algorithm: 'pixel_distance',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };
}

describe('ErrorBoundary (UI)', () => {
  function Crash(): JSX.Element {
    throw new Error('Testna napaka pri renderiranju');
  }

  it('ulovi napako in ponudi ponovno nalaganje', () => {
    // React logira napako v konzolo — pričakovano.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Crash />
      </ErrorBoundary>
    );

    expect(screen.getByText(/napaka v aplikaciji/i)).toBeInTheDocument();
    expect(screen.getByText(/testna napaka pri renderiranju/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /osveži stran/i })).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe('FenceSegmentEditor (UI)', () => {
  it('prikaže segmente in ob spremembi azimuta vrne posodobljene segmente', () => {
    const segments: FenceSegmentInput[] = [];
    const onSegmentsChange = vi.fn((s: FenceSegmentInput[]) => { segments.push(...s); });
    const prices: MaterialPrices = {
      panelPricePerM2: 85, postPriceEach: 45, railPricePerM: 12, fastenerPriceEach: 0.5, endCapPriceEach: 8,
      boardPricePerM: 35, aluTubePricePerM: 8,
    };

    render(
      <FenceSegmentEditor
        measurements={[meritev('m1', 5), meritev('m2', 3)]}
        segments={segments}
        onSegmentsChange={onSegmentsChange}
        prices={prices}
        onPricesChange={() => undefined}
      />
    );

    // Dve meritvi -> dve vrstici, skupna dolžina 8 m.
    expect(screen.getByText('5.00 m')).toBeInTheDocument();
    expect(screen.getByText('3.00 m')).toBeInTheDocument();
    expect(screen.getByText(/Skupna dolžina/)).toBeInTheDocument();

    // Spremeni azimut drugega segmenta na 90°.
    const azimut2 = screen.getByLabelText('Azimut segmenta 2');
    fireEvent.change(azimut2, { target: { value: '90' } });

    expect(onSegmentsChange).toHaveBeenCalled();
    const klici = onSegmentsChange.mock.calls;
    const zadnji = klici[klici.length - 1][0] as FenceSegmentInput[];
    expect(zadnji).toHaveLength(2);
    expect(zadnji[1].bearingDeg).toBe(90);
    expect(zadnji[1].length).toBe(3);
  });

  it('brez meritev prikaže obvestilo', () => {
    render(
      <FenceSegmentEditor
        measurements={[]}
        segments={[]}
        onSegmentsChange={() => undefined}
        prices={{ panelPricePerM2: 85, postPriceEach: 45, railPricePerM: 12, fastenerPriceEach: 0.5, endCapPriceEach: 8, boardPricePerM: 35, aluTubePricePerM: 8 }}
        onPricesChange={() => undefined}
      />
    );
    expect(screen.getByText(/ni dolžinskih meritev/i)).toBeInTheDocument();
  });
});

describe('RoksalImageView (UI)', () => {
  it('ob napaki pri nalaganju prikaže nadomestek (offline) z barvnim vzorcem', () => {
    const image = {
      id: 'test-1',
      url: 'https://example.invalid/slika.jpg',
      title: 'Testna slika',
      description: 'Opis',
      colorId: 'amazon-wood',
      category: 'installation' as const,
      verified: true,
      source: 'https://roksal.com/',
    };

    render(<RoksalImageView image={image} />);

    const img = screen.getByAltText('Testna slika');
    fireEvent.error(img);

    expect(screen.getByText(/ni dosegljiva/i)).toBeInTheDocument();
    expect(screen.getByText('Testna slika')).toBeInTheDocument();
  });
});

describe('MaterialView (UI)', () => {
  it('izbira konstrukcije (panelna/deskna) posodobi fenceConfig', () => {
    const onFenceConfigChange = vi.fn();
    const fenceConfig: FenceConfig = {
      panelWidth: 1.8, panelHeight: 1.5, postWidth: 0.06, maxGap: 0.12,
      mountingStyle: 'stepped', slopeThreshold: 5,
    };
    const stairsConfig: StairsConfig = { numSteps: 5, totalRise: 1.2, totalRun: 2.5, handrailHeight: 0.9 };

    render(
      <MaterialView
        currentProject={null}
        fenceConfig={fenceConfig}
        onFenceConfigChange={onFenceConfigChange}
        stairsConfig={stairsConfig}
        onStairsConfigChange={() => undefined}
        onCalculateFence={() => undefined}
        onCalculateStairs={() => undefined}
        measurements={[]}
        fenceSegments={[]}
        onFenceSegmentsChange={() => undefined}
        materialPrices={{ panelPricePerM2: 85, postPriceEach: 45, railPricePerM: 12, fastenerPriceEach: 0.5, endCapPriceEach: 8, boardPricePerM: 35, aluTubePricePerM: 8 }}
        onMaterialPricesChange={() => undefined}
      />
    );

    const izbirnik = screen.getByLabelText(/konstrukcija/i) as HTMLSelectElement;
    fireEvent.change(izbirnik, { target: { value: 'board' } });

    expect(onFenceConfigChange).toHaveBeenCalled();
    const klici = onFenceConfigChange.mock.calls;
    const novi = klici[klici.length - 1][0] as FenceConfig;
    expect(novi.constructionType).toBe('board');
  });

  it('izbira Roksal profila vrne novi fenceConfig s profileId', () => {
    const onFenceConfigChange = vi.fn();
    const fenceConfig: FenceConfig = {
      panelWidth: 1.8, panelHeight: 1.5, postWidth: 0.06, maxGap: 0.12,
      mountingStyle: 'stepped', slopeThreshold: 5,
    };
    const stairsConfig: StairsConfig = { numSteps: 5, totalRise: 1.2, totalRun: 2.5, handrailHeight: 0.9 };

    render(
      <MaterialView
        currentProject={null}
        fenceConfig={fenceConfig}
        onFenceConfigChange={onFenceConfigChange}
        stairsConfig={stairsConfig}
        onStairsConfigChange={() => undefined}
        onCalculateFence={() => undefined}
        onCalculateStairs={() => undefined}
        measurements={[]}
        fenceSegments={[]}
        onFenceSegmentsChange={() => undefined}
        materialPrices={{ panelPricePerM2: 85, postPriceEach: 45, railPricePerM: 12, fastenerPriceEach: 0.5, endCapPriceEach: 8, boardPricePerM: 35, aluTubePricePerM: 8 }}
        onMaterialPricesChange={() => undefined}
      />
    );

    const izbirnik = screen.getByLabelText(/roksal profil/i) as HTMLSelectElement;
    fireEvent.change(izbirnik, { target: { value: 'polna-deska-57-32' } });

    expect(onFenceConfigChange).toHaveBeenCalled();
    const klici = onFenceConfigChange.mock.calls;
    const novi = klici[klici.length - 1][0] as FenceConfig;
    expect(novi.profileId).toBe('polna-deska-57-32');
    expect(novi.panelWidth).toBe(1.8);
  });
});
