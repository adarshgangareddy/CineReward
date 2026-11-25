const COUNTRY_CURRENCY_MAP = {
  IN: { code: "INR", symbol: "₹", fxFromUsd: 84, countryName: "India" },
  US: { code: "USD", symbol: "$", fxFromUsd: 1, countryName: "United States" },
  GB: { code: "GBP", symbol: "£", fxFromUsd: 0.79, countryName: "United Kingdom" },
  UK: { code: "GBP", symbol: "£", fxFromUsd: 0.79, countryName: "United Kingdom" },
  JP: { code: "JPY", symbol: "¥", fxFromUsd: 152, countryName: "Japan" },
  KR: { code: "KRW", symbol: "₩", fxFromUsd: 1380, countryName: "South Korea" },
  FR: { code: "EUR", symbol: "€", fxFromUsd: 0.92, countryName: "France" },
  DE: { code: "EUR", symbol: "€", fxFromUsd: 0.92, countryName: "Germany" },
  ES: { code: "EUR", symbol: "€", fxFromUsd: 0.92, countryName: "Spain" },
  IT: { code: "EUR", symbol: "€", fxFromUsd: 0.92, countryName: "Italy" },
  AU: { code: "AUD", symbol: "A$", fxFromUsd: 1.53, countryName: "Australia" },
  CA: { code: "CAD", symbol: "C$", fxFromUsd: 1.38, countryName: "Canada" },
};

const LANG_COUNTRY_MAP = {
  hi: "IN",
  te: "IN",
  ta: "IN",
  ml: "IN",
  kn: "IN",
  bn: "IN",
  pa: "IN",
  mr: "IN",
  ja: "JP",
  ko: "KR",
  fr: "FR",
  de: "DE",
  es: "ES",
  it: "IT",
  en: "US",
};

function resolveCountryCurrency(countryCode, originalLanguage) {
  const cleanCountry = String(countryCode || "").trim().toUpperCase();
  const inferredCountry =
    (cleanCountry && COUNTRY_CURRENCY_MAP[cleanCountry] ? cleanCountry : null) ||
    LANG_COUNTRY_MAP[String(originalLanguage || "").toLowerCase()] ||
    "US";

  const info = COUNTRY_CURRENCY_MAP[inferredCountry] || COUNTRY_CURRENCY_MAP.US;
  return { country: inferredCountry, ...info };
}

function formatCurrencyCompact(amount, currencyCode = "INR", symbol = "₹") {
  const num = Number(amount || 0);
  if (!num || Number.isNaN(num)) return "Not Disclosed";

  if (currencyCode === "INR") {
    if (num >= 10000000) {
      return `${symbol}${(num / 10000000).toFixed(2).replace(/\.00$/, "")} Cr`;
    }
    if (num >= 100000) {
      return `${symbol}${(num / 100000).toFixed(2).replace(/\.00$/, "")} L`;
    }
    return `${symbol}${Math.round(num).toLocaleString("en-IN")}`;
  }

  if (num >= 1000000000) {
    return `${symbol}${(num / 1000000000).toFixed(2).replace(/\.00$/, "")}B`;
  }
  if (num >= 1000000) {
    return `${symbol}${(num / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  return `${symbol}${Math.round(num).toLocaleString("en-US")}`;
}

function formatTmdbFinancials({ budgetUsd = 0, revenueUsd = 0, countryCode, originalLanguage }) {
  const info = resolveCountryCurrency(countryCode, originalLanguage);
  const localBudget = Math.round(Number(budgetUsd || 0) * info.fxFromUsd);
  const localCollections = Math.round(Number(revenueUsd || 0) * info.fxFromUsd);

  return {
    country: info.country,
    countryName: info.countryName,
    currencyCode: info.code,
    currencySymbol: info.symbol,
    totalBudget: localBudget,
    totalCollections: localCollections,
    formattedBudget: formatCurrencyCompact(localBudget, info.code, info.symbol),
    formattedCollections: formatCurrencyCompact(localCollections, info.code, info.symbol),
  };
}

module.exports = {
  COUNTRY_CURRENCY_MAP,
  resolveCountryCurrency,
  formatCurrencyCompact,
  formatTmdbFinancials,
};
