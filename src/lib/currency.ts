/**
 * Currency Service — kept separate from money math so an FX-rate API can be
 * plugged in later without touching src/lib/money.ts.
 */

export interface CurrencyDefinition {
  code: string;
  nameAr: string;
  nameEn: string;
  symbol: string;
  /** Number of digits in the minor unit (2 = cents/halalas, 3 = fils). */
  minorUnitDigits: number;
}

export const CURRENCIES: Record<string, CurrencyDefinition> = {
  SAR: { code: "SAR", nameAr: "ريال سعودي", nameEn: "Saudi Riyal", symbol: "ر.س", minorUnitDigits: 2 },
  AED: { code: "AED", nameAr: "درهم إماراتي", nameEn: "UAE Dirham", symbol: "د.إ", minorUnitDigits: 2 },
  USD: { code: "USD", nameAr: "دولار أمريكي", nameEn: "US Dollar", symbol: "$", minorUnitDigits: 2 },
  EUR: { code: "EUR", nameAr: "يورو", nameEn: "Euro", symbol: "€", minorUnitDigits: 2 },
  GBP: { code: "GBP", nameAr: "جنيه إسترليني", nameEn: "British Pound", symbol: "£", minorUnitDigits: 2 },
  KWD: { code: "KWD", nameAr: "دينار كويتي", nameEn: "Kuwaiti Dinar", symbol: "د.ك", minorUnitDigits: 3 },
  BHD: { code: "BHD", nameAr: "دينار بحريني", nameEn: "Bahraini Dinar", symbol: "د.ب", minorUnitDigits: 3 },
  QAR: { code: "QAR", nameAr: "ريال قطري", nameEn: "Qatari Riyal", symbol: "ر.ق", minorUnitDigits: 2 },
  OMR: { code: "OMR", nameAr: "ريال عماني", nameEn: "Omani Rial", symbol: "ر.ع", minorUnitDigits: 3 },
  EGP: { code: "EGP", nameAr: "جنيه مصري", nameEn: "Egyptian Pound", symbol: "ج.م", minorUnitDigits: 2 },
};

export const DEFAULT_CURRENCY = "SAR";

export function getCurrency(code: string): CurrencyDefinition {
  return CURRENCIES[code] ?? CURRENCIES[DEFAULT_CURRENCY]!;
}

export function listCurrencies(): CurrencyDefinition[] {
  return Object.values(CURRENCIES);
}

/**
 * Placeholder for a future FX conversion service. Today Qitta only supports
 * same-currency operations within a group/expense — this exists so callers
 * can be written against a stable interface.
 */
export interface FxRateProvider {
  convert(amountMinor: number, from: string, to: string): Promise<number>;
}

export class NoopFxRateProvider implements FxRateProvider {
  async convert(amountMinor: number, from: string, to: string): Promise<number> {
    if (from !== to) {
      throw new Error(`FX conversion not supported yet (${from} -> ${to})`);
    }
    return amountMinor;
  }
}

export const fxRateProvider: FxRateProvider = new NoopFxRateProvider();
