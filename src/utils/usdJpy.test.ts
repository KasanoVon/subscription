import { describe, it, expect } from 'vitest';
import { convertUsdSubscription, parseAmount } from './usdJpy';

describe('convertUsdSubscription', () => {
  it('月払いは1回の請求額が月額、年額は12倍', () => {
    expect(convertUsdSubscription(20, 'monthly', 150)).toEqual({ perCharge: 3000, monthly: 3000, yearly: 36000 });
  });

  it('年払いは1回の請求額が年額、月額は12分の1', () => {
    expect(convertUsdSubscription(120, 'yearly', 150)).toEqual({ perCharge: 18000, monthly: 1500, yearly: 18000 });
  });

  it('海外事務手数料（%）を上乗せする', () => {
    expect(convertUsdSubscription(20, 'monthly', 150, 2)!.perCharge).toBeCloseTo(3060);
  });

  it('手数料が空・負の値なら上乗せしない', () => {
    expect(convertUsdSubscription(20, 'monthly', 150, NaN)!.perCharge).toBe(3000);
    expect(convertUsdSubscription(20, 'monthly', 150, -5)!.perCharge).toBe(3000);
  });

  it('金額やレートが不正なら null', () => {
    expect(convertUsdSubscription(NaN, 'monthly', 150)).toBeNull();
    expect(convertUsdSubscription(-1, 'monthly', 150)).toBeNull();
    expect(convertUsdSubscription(20, 'monthly', 0)).toBeNull();
  });
});

describe('parseAmount', () => {
  it('全角数字・カンマ・ドル記号を受け付ける', () => {
    expect(parseAmount('２０')).toBe(20);
    expect(parseAmount('$9.99')).toBe(9.99);
    expect(parseAmount('1,200')).toBe(1200);
    expect(parseAmount('１９．９９')).toBe(19.99);
  });

  it('空や数字でない入力は NaN', () => {
    expect(parseAmount('')).toBeNaN();
    expect(parseAmount('abc')).toBeNaN();
  });
});
