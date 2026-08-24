/**
 * Money utilities — every amount in Qitta is an integer in the currency's
 * minor unit (halalas for SAR, fils for BHD/KWD, cents for USD, ...).
 * Never use floating point for money math; only ever use these helpers.
 */
import { getCurrency } from "./currency";

export type MinorAmount = number;

/** Parse a user-facing decimal string ("150.25") into minor units (15025). */
export function toMinorUnits(input: string | number, currencyCode: string): MinorAmount {
  const { minorUnitDigits } = getCurrency(currencyCode);
  const factor = 10 ** minorUnitDigits;

  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new Error("Invalid amount");
    return Math.round(input * factor);
  }

  const normalized = input.trim().replace(/,/g, "");
  if (normalized === "" || !/^-?\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid amount: "${input}"`);
  }

  const [wholePartRaw, fracPartRaw = ""] = normalized.split(".");
  const wholePart = wholePartRaw ?? "0";
  const sign = wholePart.startsWith("-") ? -1 : 1;
  const wholeDigits = wholePart.replace("-", "");
  const fracPart = (fracPartRaw + "0".repeat(minorUnitDigits)).slice(0, minorUnitDigits);

  const wholeUnits = BigInt(wholeDigits || "0") * BigInt(factor);
  const fracUnits = BigInt(fracPart || "0");
  return sign * Number(wholeUnits + fracUnits);
}

/** Format minor units back to a plain decimal string ("150.25"), no symbol. */
export function toDecimalString(amountMinor: MinorAmount, currencyCode: string): string {
  const { minorUnitDigits } = getCurrency(currencyCode);
  const factor = 10 ** minorUnitDigits;
  const sign = amountMinor < 0 ? "-" : "";
  const abs = Math.abs(amountMinor);
  const whole = Math.floor(abs / factor);
  const frac = abs % factor;
  return `${sign}${whole}.${frac.toString().padStart(minorUnitDigits, "0")}`;
}

const arabicIndicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

function toArabicIndicDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => arabicIndicDigits[Number(d)]!);
}

/**
 * Format money for display, e.g. formatMoney(15025, "SAR", "ar") -> "150.25 ر.س"
 * We deliberately use Western digits by default (common in Saudi fintech UX
 * for legibility of numbers); pass useArabicDigits to opt into ٠١٢٣.
 */
export function formatMoney(
  amountMinor: MinorAmount,
  currencyCode: string,
  locale: "ar" | "en" = "ar",
  opts: { useArabicDigits?: boolean; showSymbol?: boolean } = {},
): string {
  const currency = getCurrency(currencyCode);
  const decimal = toDecimalString(amountMinor, currencyCode);
  const [whole, frac] = decimal.split("-").pop()!.split(".");
  const sign = amountMinor < 0 ? "-" : "";
  const groupedWhole = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  let numberStr = `${sign}${groupedWhole}.${frac}`;
  if (opts.useArabicDigits) numberStr = toArabicIndicDigits(numberStr);

  if (opts.showSymbol === false) return numberStr;

  return locale === "ar" ? `${numberStr} ${currency.symbol}` : `${currency.symbol} ${numberStr}`;
}

export function addMoney(...amounts: MinorAmount[]): MinorAmount {
  return amounts.reduce((sum, a) => sum + a, 0);
}

export function subtractMoney(a: MinorAmount, b: MinorAmount): MinorAmount {
  return a - b;
}

export function isNegative(a: MinorAmount): boolean {
  return a < 0;
}

/**
 * Split `total` into `count` shares as evenly as possible so that
 * sum(shares) === total exactly. Remainder minor units are distributed one
 * at a time to the first participants (deterministic, stable ordering).
 *
 * This is the canonical rounding strategy for Equal Split.
 */
export function allocateEqual(total: MinorAmount, count: number): MinorAmount[] {
  if (count <= 0) throw new Error("count must be > 0");
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Allocate `total` proportionally to a set of weights (used for Shares
 * split and proportional adjustment allocation), preserving the exact sum
 * using the largest-remainder method.
 */
export function allocateByWeights(total: MinorAmount, weights: number[]): MinorAmount[] {
  if (weights.length === 0) throw new Error("weights must not be empty");
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  if (totalWeight <= 0) throw new Error("total weight must be > 0");

  const rawShares = weights.map((w) => (total * w) / totalWeight);
  const floored = rawShares.map((r) => Math.floor(r));
  let distributed = floored.reduce((s, f) => s + f, 0);
  let remainder = total - distributed;

  const remainders = rawShares
    .map((r, i) => ({ i, frac: r - floored[i]! }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const result = [...floored];
  for (let k = 0; k < remainder; k++) {
    const idx = remainders[k % remainders.length]!.i;
    result[idx]! += 1;
  }
  return result;
}

/** Allocate `total` by percentages (0-100, may include decimals like 33.33). */
export function allocateByPercentages(total: MinorAmount, percentages: number[]): MinorAmount[] {
  return allocateByWeights(total, percentages);
}

export function sumEquals(amounts: MinorAmount[], expectedTotal: MinorAmount): boolean {
  return addMoney(...amounts) === expectedTotal;
}

export function applyPercentageAdjustment(base: MinorAmount, percentage: number): MinorAmount {
  return Math.round((base * percentage) / 100);
}
