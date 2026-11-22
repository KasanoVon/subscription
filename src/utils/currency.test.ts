import { describe, it, expect } from 'vitest';
import {
  DEFAULT_EXCHANGE_RATE,
  convertCurrency,
  formatCurrency,
  formatExchangeRate,
  toMonthlyAmount,
  toYearlyAmount,
  billingCycleLabel,
} from './currency';

describe('convertCurrency', () => {
  it('同じ通貨ならそのまま返す', () => {
    expect(convertCurrency(1490, 'JPY', 'JPY', 157)).toBe(1490);
    expect(convertCurrency(9.99, 'USD', 'USD', 157)).toBe(9.99);
  });

  it('USD→JPY はレートを掛ける', () => {
    expect(convertCurrency(10, 'USD', 'JPY', 157.5)).toBeCloseTo(1575);
  });

  it('JPY→USD はレートで割る', () => {
    expect(convertCurrency(1575, 'JPY', 'USD', 157.5)).toBeCloseTo(10);
  });

  it('レート省略時は既定値（150円）を使う', () => {
    expect(DEFAULT_EXCHANGE_RATE).toBe(150);
    expect(convertCurrency(2, 'USD', 'JPY')).toBe(300);
  });

  it('往復しても元の金額に戻る', () => {
    const yen = convertCurrency(9.99, 'USD', 'JPY', 158.75);
    expect(convertCurrency(yen, 'JPY', 'USD', 158.75)).toBeCloseTo(9.99, 10);
  });
});

describe('formatCurrency', () => {
  it('円は整数に丸めて3桁区切り', () => {
    expect(formatCurrency(10129.4, 'JPY')).toBe('￥10,129');
    expect(formatCurrency(10129.5, 'JPY')).toBe('￥10,130');
    expect(formatCurrency(0, 'JPY')).toBe('￥0');
  });

  it('ドルは小数2桁', () => {
    expect(formatCurrency(64.176, 'USD')).toBe('$64.18');
    expect(formatCurrency(1234.5, 'USD')).toBe('$1,234.50');
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });
});

describe('formatExchangeRate', () => {
  it('¥表示では1ドルあたりの円を小数2桁で出す', () => {
    expect(formatExchangeRate(157.8234, 'JPY')).toBe('￥157.82');
    expect(formatExchangeRate(150, 'JPY')).toBe('￥150.00');
  });

  it('$表示では100円あたりのドルを小数4桁で出す', () => {
    expect(formatExchangeRate(157.82, 'USD')).toBe('$0.6336');
    expect(formatExchangeRate(150, 'USD')).toBe('$0.6667');
  });

  it('$表示の4桁は1円程度のレート変動を区別できる', () => {
    expect(formatExchangeRate(157.82, 'USD')).not.toBe(formatExchangeRate(158.82, 'USD'));
  });
});

describe('toMonthlyAmount', () => {
  it('請求サイクルごとに月額へ換算する', () => {
    expect(toMonthlyAmount(1000, 'monthly')).toBe(1000);
    expect(toMonthlyAmount(12000, 'yearly')).toBe(1000);
    expect(toMonthlyAmount(300, 'weekly')).toBeCloseTo(1300); // 300 × 52 / 12
  });

  it('カスタム周期は30日を1か月として換算する', () => {
    expect(toMonthlyAmount(1500, 'custom', 15)).toBe(3000);
    expect(toMonthlyAmount(3000, 'custom', 90)).toBe(1000);
  });

  it('カスタム周期で日数がない・0以下なら月払い扱い', () => {
    expect(toMonthlyAmount(500, 'custom')).toBe(500);
    expect(toMonthlyAmount(500, 'custom', 0)).toBe(500);
  });
});

describe('toYearlyAmount', () => {
  it('請求サイクルごとに年額へ換算する', () => {
    expect(toYearlyAmount(1000, 'monthly')).toBe(12000);
    expect(toYearlyAmount(12000, 'yearly')).toBe(12000);
    expect(toYearlyAmount(300, 'weekly')).toBe(15600);
  });

  it('カスタム周期は365日で換算し、日数がなければ月払い扱い', () => {
    expect(toYearlyAmount(1000, 'custom', 73)).toBe(5000);
    expect(toYearlyAmount(1000, 'custom')).toBe(12000);
  });
});

describe('billingCycleLabel', () => {
  it('日本語ラベルを返す', () => {
    expect(billingCycleLabel('weekly')).toBe('週払い');
    expect(billingCycleLabel('monthly')).toBe('月払い');
    expect(billingCycleLabel('yearly')).toBe('年払い');
    expect(billingCycleLabel('custom', 45)).toBe('45日ごと');
    expect(billingCycleLabel('custom')).toBe('カスタム');
  });
});
