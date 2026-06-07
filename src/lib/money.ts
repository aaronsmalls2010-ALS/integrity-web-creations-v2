/** All monetary values are integer cents. Format only at the view edge. */

export function formatUSD(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
    .format(cents / 100);
}

export function dollarsToCents(input: string): number {
  const cleaned = input.trim().replace(/,/g, '');
  if (cleaned === '') return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Invalid money value: "${input}"`);
  }
  const [whole, frac = ''] = cleaned.split('.');
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return cents;
}

export function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function addCents(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0);
}
