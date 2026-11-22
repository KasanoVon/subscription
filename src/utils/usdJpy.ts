// ドル円換算ツール（/usd-jpy）の計算。画面に依存しない純粋な関数だけを置く

export type ToolCycle = 'monthly' | 'yearly';

export interface UsdJpyResult {
  perCharge: number; // 1回の請求額（円）
  monthly: number; // 月額換算（円）
  yearly: number; // 年額換算（円）
}

// usd: ドルの金額 / rate: 1ドルあたりの円 / feePercent: カードの海外事務手数料（%）
export function convertUsdSubscription(
  usd: number,
  cycle: ToolCycle,
  rate: number,
  feePercent = 0
): UsdJpyResult | null {
  if (!Number.isFinite(usd) || usd < 0 || !Number.isFinite(rate) || rate <= 0) return null;
  const fee = Number.isFinite(feePercent) && feePercent > 0 ? feePercent : 0;
  const perCharge = usd * rate * (1 + fee / 100);
  return cycle === 'yearly'
    ? { perCharge, monthly: perCharge / 12, yearly: perCharge }
    : { perCharge, monthly: perCharge, yearly: perCharge * 12 };
}

// 早見表に載せる月額（ドル）
export const QUICK_TABLE_USD = [5, 10, 15, 20, 25, 30, 50, 100];

// 入力欄の文字列を数値に（全角数字・カンマ・$ を許す）
export function parseAmount(input: string): number {
  const normalized = input
    .replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[,\s$＄]/g, '');
  if (normalized === '') return NaN;
  return Number(normalized);
}
