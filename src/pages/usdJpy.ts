// ドル円換算ツール（/usd-jpy）の画面処理。計算は utils/usdJpy.ts
import { DEFAULT_EXCHANGE_RATE, formatCurrency } from '../utils/currency';
import { QUICK_TABLE_USD, convertUsdSubscription, parseAmount, type ToolCycle } from '../utils/usdJpy';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const amountInput = $<HTMLInputElement>('usd-amount');
const rateInput = $<HTMLInputElement>('usd-rate');
const feeInput = $<HTMLInputElement>('usd-fee');
const rateNote = $<HTMLParagraphElement>('rate-note');
const tableBody = $<HTMLTableSectionElement>('quick-table-body');

const yen = (n: number) => formatCurrency(n, 'JPY');

function selectedCycle(): ToolCycle {
  const checked = document.querySelector<HTMLInputElement>('input[name="usd-cycle"]:checked');
  return checked?.value === 'yearly' ? 'yearly' : 'monthly';
}

function currentRate(): number {
  return parseAmount(rateInput.value);
}

function renderResult() {
  const result = convertUsdSubscription(parseAmount(amountInput.value), selectedCycle(), currentRate(), parseAmount(feeInput.value));
  $('res-per-charge').textContent = result ? yen(result.perCharge) : '—';
  $('res-monthly').textContent = result ? yen(result.monthly) : '—';
  $('res-yearly').textContent = result ? yen(result.yearly) : '—';
}

function renderTable() {
  const rate = currentRate();
  tableBody.replaceChildren(
    ...QUICK_TABLE_USD.map((usd) => {
      const r = convertUsdSubscription(usd, 'monthly', rate);
      const tr = document.createElement('tr');
      for (const text of [`$${usd}`, r ? yen(r.monthly) : '—', r ? yen(r.yearly) : '—']) {
        const td = document.createElement('td');
        td.textContent = text;
        tr.append(td);
      }
      return tr;
    })
  );
}

function renderAll() {
  renderResult();
  renderTable();
}

function formatUpdated(utc: string | undefined): string {
  const date = utc ? new Date(utc) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

async function loadRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { rates?: Record<string, number>; time_last_update_utc?: string };
    const rate = data.rates?.JPY;
    if (typeof rate !== 'number' || rate <= 0) throw new Error('no JPY rate');
    // 入力中にレートを書き換えていたら上書きしない
    if (rateInput.dataset.edited !== 'true') rateInput.value = rate.toFixed(2);
    const updated = formatUpdated(data.time_last_update_utc);
    rateNote.textContent = `今日のレート（${updated ? `${updated} 更新・` : ''}出典：ExchangeRate-API）。数字を書き換えて計算することもできます。`;
  } catch {
    rateNote.textContent = `レートを取得できなかったため、1ドル = ${DEFAULT_EXCHANGE_RATE}円で計算しています。実際のレートを入力してください。`;
  }
  renderAll();
}

amountInput.addEventListener('input', renderResult);
feeInput.addEventListener('input', renderResult);
rateInput.addEventListener('input', () => {
  rateInput.dataset.edited = 'true';
  renderAll();
});
document.querySelectorAll('input[name="usd-cycle"]').forEach((el) => el.addEventListener('change', renderResult));

rateInput.value = DEFAULT_EXCHANGE_RATE.toFixed(2);
renderAll();
void loadRate();
