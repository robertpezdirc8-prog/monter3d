/**
 * Mera3D Pro / Roksal Teren - testi kosovnice in ponudbe
 */

import { describe, it, expect } from 'vitest';
import { calculateFenceConstruction } from '../utils/fenceConstruction';
import { buildRoksalBom, createRoksalQuote } from '../utils/roksalQuote';
import { ROKSAL_PROFILES } from '../data/roksalCatalog';
import { DEFAULT_ROKSAL_PRICE_LIST } from '../data/roksalPrices';

describe('Roksal kosovnica in ponudba', () => {
  const polna100 = ROKSAL_PROFILES.find(p => p.id === 'polna-deska-100')!;
  const romb67 = ROKSAL_PROFILES.find(p => p.id === 'romb-deska-67')!;
  const color = polna100.colors[0];

  const config = {
    profile: polna100,
    orientation: 'vertical' as const,
    fenceHeight: 1500,
    fenceLength: 10000,
    boardSpacing: 20,
    colorId: color.id
  };
  const construction = calculateFenceConstruction(config);

  it('kosovnica vsebuje profile, stebre, nosilce in vijake', () => {
    const items = buildRoksalBom({
      configuration: config,
      construction,
      color,
      priceList: DEFAULT_ROKSAL_PRICE_LIST
    });

    const categories = items.map(i => i.category);
    expect(categories).toContain('profili');
    expect(categories).toContain('stebri');
    expect(categories).toContain('nosilci');
    expect(categories).toContain('vijaki');

    for (const item of items) {
      expect(item.quantity).toBeGreaterThan(0);
      expect(item.totalPrice).toBeCloseTo(item.quantity * item.unitPrice, 1);
    }
  });

  it('ponudba je veljavna in pravilno izračuna popust, DDV in skupni znesek', () => {
    const quote = createRoksalQuote({
      customer: { name: 'Družina Novak', address: 'Cesta 1', city: 'Kranj' },
      configuration: config,
      construction,
      color,
      priceList: DEFAULT_ROKSAL_PRICE_LIST,
      quoteNumber: 'P-2026-001',
      laborHours: 8,
      discountPercent: 5
    });

    expect(quote.valid).toBe(true);
    expect(quote.items.length).toBeGreaterThan(0);
    expect(quote.number).toBe('P-2026-001');
    expect(quote.subtotal).toBeCloseTo(quote.materialsSubtotal + quote.laborTotal, 2);
    expect(quote.discount).toBeCloseTo(quote.subtotal * 0.05, 2);
    expect(quote.tax).toBeCloseTo((quote.subtotal - quote.discount) * 0.22, 2);
    expect(quote.total).toBeCloseTo(quote.subtotal - quote.discount + quote.tax, 2);
    expect(quote.isDemoPrices).toBe(true);
  });

  it('neveljavna konstrukcija pomeni neveljavno ponudbo', () => {
    const badConfig = { ...config, fenceLength: 121, boardSpacing: 20 };
    const badConstruction = calculateFenceConstruction(badConfig);
    const quote = createRoksalQuote({
      customer: { name: 'Test' },
      configuration: badConfig,
      construction: badConstruction,
      color,
      quoteNumber: 'P-2026-002'
    });

    expect(badConstruction.valid).toBe(false);
    expect(quote.valid).toBe(false);
    expect(quote.errors.length).toBeGreaterThan(0);
  });

  it('ROMB kosovnica vsebuje ALU cev in kotnike', () => {
    const rombConfig = {
      profile: romb67,
      orientation: 'vertical' as const,
      fenceHeight: 1500,
      fenceLength: 3000,
      boardSpacing: 20,
      colorId: romb67.colors[0].id
    };
    const rombConstruction = calculateFenceConstruction(rombConfig);
    const items = buildRoksalBom({
      configuration: rombConfig,
      construction: rombConstruction,
      color: romb67.colors[0],
      priceList: DEFAULT_ROKSAL_PRICE_LIST
    });

    const categories = items.map(i => i.category);
    expect(categories).toContain('alu');
    expect(categories).toContain('kotniki');
  });

  it('ponudba brez stranke opozori, a ostane veljavna', () => {
    const quote = createRoksalQuote({
      customer: { name: '' },
      configuration: config,
      construction,
      color,
      quoteNumber: 'P-2026-003'
    });

    expect(quote.valid).toBe(true);
    expect(quote.warnings.some(w => w.includes('Stranka'))).toBe(true);
  });

  it('prečna ograja ne zaračuna nosilcev (nosilci so stebrički)', () => {
    const horizontalConfig = {
      profile: ROKSAL_PROFILES.find(p => p.id === 'deska-150')!,
      orientation: 'horizontal' as const,
      fenceHeight: 1000,
      fenceLength: 5000,
      boardSpacing: 20
    };
    const horizontalConstruction = calculateFenceConstruction(horizontalConfig);
    const items = buildRoksalBom({
      configuration: horizontalConfig,
      construction: horizontalConstruction,
      color: horizontalConfig.profile.colors[0],
      priceList: DEFAULT_ROKSAL_PRICE_LIST
    });

    const categories = items.map(i => i.category);
    expect(categories).not.toContain('nosilci');
    expect(categories).toContain('stebri');
    expect(horizontalConstruction.valid).toBe(true);
  });
});
