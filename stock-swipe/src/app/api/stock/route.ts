import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

type StockData = {
  ticker: string;
  name: string;
  price: number;
  change: string;
  changeDollar: string;
  previousClose: string;
  latestTradingDay: string;
  sector: string;
  industry: string;
  marketCap: string;
  peRatio: string;
  eps: string;
  profitMargin: string;
  dividendYield: string;
  beta: string;
  analystTargetPrice: string;
  fiftyTwoWeekHigh: string;
  fiftyTwoWeekLow: string;
  volume: string;
  riskLevel: string;
  summary: string;
  breakdown: string;
  dataSource: "live" | "cached";
  warning?: string;
};

type TwelveQuote = {
  symbol?: string;
  name?: string;
  exchange?: string;
  currency?: string;
  datetime?: string;
  timestamp?: number;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  volume?: string;
  previous_close?: string;
  change?: string;
  percent_change?: string;
  average_volume?: string;
  fifty_two_week?: {
    low?: string;
    high?: string;
    range?: string;
  };
  status?: string;
  message?: string;
};

type TwelveProfile = {
  name?: string;
  company_name?: string;
  sector?: string;
  industry?: string;
  description?: string;
  market_cap?: string | number;
  pe_ratio?: string | number;
  eps?: string | number;
  beta?: string | number;
  dividend_yield?: string | number;
  status?: string;
  message?: string;
};

type FmpProfile = {
  symbol?: string;
  companyName?: string;
  price?: number;
  beta?: number;
  volAvg?: number;
  mktCap?: number;
  lastDiv?: number;
  range?: string;
  changes?: number;
  companyNameLong?: string;
  currency?: string;
  cik?: string;
  isin?: string;
  cusip?: string;
  exchange?: string;
  exchangeShortName?: string;
  industry?: string;
  website?: string;
  description?: string;
  ceo?: string;
  sector?: string;
  country?: string;
  fullTimeEmployees?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  ipoDate?: string;
};

type FmpQuote = {
  symbol?: string;
  name?: string;
  price?: number;
  changesPercentage?: number;
  change?: number;
  dayLow?: number;
  dayHigh?: number;
  yearHigh?: number;
  yearLow?: number;
  marketCap?: number;
  priceAvg50?: number;
  priceAvg200?: number;
  exchange?: string;
  volume?: number;
  avgVolume?: number;
  open?: number;
  previousClose?: number;
  eps?: number;
  pe?: number;
  earningsAnnouncement?: string;
  sharesOutstanding?: number;
  timestamp?: number;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isUpdatedToday(value?: string | null) {
  if (!value) return false;
  return value.slice(0, 10) === todayKey();
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
}

function formatCurrency(value: unknown) {
  const numberValue = toNumber(value);

  if (numberValue === null) return "N/A";

  return `$${numberValue.toFixed(2)}`;
}

function formatLargeNumber(value: unknown) {
  const numberValue = toNumber(value);

  if (numberValue === null) return "N/A";

  if (numberValue >= 1_000_000_000_000) {
    return `$${(numberValue / 1_000_000_000_000).toFixed(2)}T`;
  }

  if (numberValue >= 1_000_000_000) {
    return `$${(numberValue / 1_000_000_000).toFixed(2)}B`;
  }

  if (numberValue >= 1_000_000) {
    return `$${(numberValue / 1_000_000).toFixed(2)}M`;
  }

  return `$${numberValue.toLocaleString()}`;
}

function formatPercent(value: unknown) {
  const numberValue = toNumber(value);

  if (numberValue === null) return "N/A";

  return `${numberValue.toFixed(2)}%`;
}

function formatRatio(value: unknown) {
  const numberValue = toNumber(value);

  if (numberValue === null || numberValue <= 0) return "N/A";

  return numberValue.toFixed(2);
}

function formatInteger(value: unknown) {
  const numberValue = toNumber(value);

  if (numberValue === null) return "N/A";

  return Math.round(numberValue).toLocaleString();
}

function formatDividendYield(profileValue: unknown, lastDividend: unknown, price: number) {
  const profileNumber = toNumber(profileValue);

  if (profileNumber !== null && profileNumber > 0) {
    if (profileNumber < 1) {
      return `${(profileNumber * 100).toFixed(2)}%`;
    }

    return `${profileNumber.toFixed(2)}%`;
  }

  const lastDividendNumber = toNumber(lastDividend);

  if (lastDividendNumber !== null && lastDividendNumber > 0 && price > 0) {
    return `${((lastDividendNumber / price) * 100).toFixed(2)}%`;
  }

  return "N/A";
}

function estimateRiskLevel(betaValue: unknown, peValue: unknown) {
  const beta = toNumber(betaValue);
  const pe = toNumber(peValue);

  if (beta !== null && beta >= 1.5) return "High";
  if (pe !== null && pe >= 50) return "High";
  if (beta !== null && beta <= 0.9) return "Low";

  return "Medium";
}

function cleanSignedPercent(value: unknown) {
  const numberValue = toNumber(value);

  if (numberValue === null) return "+0.00%";

  if (numberValue > 0) return `+${numberValue.toFixed(2)}%`;

  return `${numberValue.toFixed(2)}%`;
}

function cleanSignedMoney(value: unknown) {
  const numberValue = toNumber(value);

  if (numberValue === null) return "$0.00";

  if (numberValue > 0) return `+$${Math.abs(numberValue).toFixed(2)}`;
  if (numberValue < 0) return `-$${Math.abs(numberValue).toFixed(2)}`;

  return "$0.00";
}

function getRangeLow(range?: string) {
  if (!range) return "N/A";

  const parts = range.split("-").map((part) => part.trim());
  return parts[0] ? formatCurrency(parts[0]) : "N/A";
}

function getRangeHigh(range?: string) {
  if (!range) return "N/A";

  const parts = range.split("-").map((part) => part.trim());
  return parts[1] ? formatCurrency(parts[1]) : "N/A";
}

async function getCachedStock(symbol: string) {
  const { data, error } = await supabaseServer
    .from("stock_cache")
    .select("symbol, stock_data, stock_updated_at")
    .eq("symbol", symbol)
    .maybeSingle();

  if (error) {
    console.error("Supabase read error:", error.message);
    return null;
  }

  if (!data?.stock_data || !isUpdatedToday(data.stock_updated_at)) {
    return null;
  }

  return {
    ...(data.stock_data as StockData),
    dataSource: "cached" as const,
    warning: "Using shared database cache from today.",
  };
}

async function getOlderCachedStock(symbol: string) {
  const { data, error } = await supabaseServer
    .from("stock_cache")
    .select("stock_data")
    .eq("symbol", symbol)
    .maybeSingle();

  if (error) {
    console.error("Supabase older cache read error:", error.message);
    return null;
  }

  if (!data?.stock_data) return null;

  return {
    ...(data.stock_data as StockData),
    dataSource: "cached" as const,
    warning:
      "Live data is unavailable, so older shared database cache is being used.",
  };
}

async function saveStockCache(symbol: string, stockData: StockData) {
  const now = new Date().toISOString();

  const { error } = await supabaseServer.from("stock_cache").upsert({
    symbol,
    stock_data: stockData,
    stock_updated_at: now,
    updated_at: now,
  });

  if (error) {
    console.error("Supabase write error:", error.message);
  }
}

async function fetchTwelveData(symbol: string) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey || apiKey === "your_twelve_data_key_here") {
    throw new Error("Missing Twelve Data API key.");
  }

  const quoteUrl = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${apiKey}`;
  const profileUrl = `https://api.twelvedata.com/profile?symbol=${symbol}&apikey=${apiKey}`;

  const [quoteResponse, profileResponse] = await Promise.all([
    fetch(quoteUrl, { cache: "no-store" }),
    fetch(profileUrl, { cache: "no-store" }),
  ]);

  const quoteData = (await quoteResponse.json()) as TwelveQuote;
  const profileData = (await profileResponse.json()) as TwelveProfile;

  if (quoteData.status === "error") {
    throw new Error(quoteData.message || "Twelve Data quote error.");
  }

  if (!quoteData.close && !quoteData.previous_close) {
    throw new Error("No Twelve Data quote returned.");
  }

  return {
    quote: quoteData,
    profile: profileData.status === "error" ? null : profileData,
  };
}

async function fetchFmpData(symbol: string) {
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey || apiKey === "your_fmp_key") {
    return {
      profile: null,
      quote: null,
    };
  }

  const profileUrl = `https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${apiKey}`;
  const quoteUrl = `https://financialmodelingprep.com/stable/quote?symbol=${symbol}&apikey=${apiKey}`;

  const [profileResponse, quoteResponse] = await Promise.all([
    fetch(profileUrl, { cache: "no-store" }),
    fetch(quoteUrl, { cache: "no-store" }),
  ]);

  const profileJson = await profileResponse.json();
  const quoteJson = await quoteResponse.json();

  const profile =
    Array.isArray(profileJson) && profileJson.length > 0
      ? (profileJson[0] as FmpProfile)
      : null;

  const quote =
    Array.isArray(quoteJson) && quoteJson.length > 0
      ? (quoteJson[0] as FmpQuote)
      : null;

  return {
    profile,
    quote,
  };
}

async function fetchMergedStock(symbol: string): Promise<StockData> {
  const [twelveData, fmpData] = await Promise.all([
    fetchTwelveData(symbol),
    fetchFmpData(symbol),
  ]);

  const twelveQuote = twelveData.quote;
  const twelveProfile = twelveData.profile;
  const fmpProfile = fmpData.profile;
  const fmpQuote = fmpData.quote;

  const price =
    toNumber(twelveQuote.close) ??
    toNumber(fmpQuote?.price) ??
    toNumber(twelveQuote.previous_close) ??
    0;

  const change =
    toNumber(twelveQuote.percent_change) ?? toNumber(fmpQuote?.changesPercentage) ?? 0;

  const changeDollar =
    toNumber(twelveQuote.change) ?? toNumber(fmpQuote?.change) ?? 0;

  const peRatio = fmpQuote?.pe ?? twelveProfile?.pe_ratio;
  const eps = fmpQuote?.eps ?? twelveProfile?.eps;
  const beta = fmpProfile?.beta ?? twelveProfile?.beta;

  const marketCap = fmpQuote?.marketCap ?? fmpProfile?.mktCap ?? twelveProfile?.market_cap;

  const name =
    fmpProfile?.companyName ||
    fmpQuote?.name ||
    twelveQuote.name ||
    twelveProfile?.name ||
    twelveProfile?.company_name ||
    `${symbol} Corporation`;

  const sector = fmpProfile?.sector || twelveProfile?.sector || "Unknown";
  const industry = fmpProfile?.industry || twelveProfile?.industry || "Unknown";

  const description =
    fmpProfile?.description ||
    twelveProfile?.description ||
    `${name} is a publicly traded company in the ${sector} sector.`;

  const fiftyTwoWeekHigh =
    twelveQuote.fifty_two_week?.high
      ? formatCurrency(twelveQuote.fifty_two_week.high)
      : fmpQuote?.yearHigh
      ? formatCurrency(fmpQuote.yearHigh)
      : getRangeHigh(fmpProfile?.range);

  const fiftyTwoWeekLow =
    twelveQuote.fifty_two_week?.low
      ? formatCurrency(twelveQuote.fifty_two_week.low)
      : fmpQuote?.yearLow
      ? formatCurrency(fmpQuote.yearLow)
      : getRangeLow(fmpProfile?.range);

  return {
    ticker: symbol,
    name,
    price: Number(price.toFixed(2)),
    change: cleanSignedPercent(change),
    changeDollar: cleanSignedMoney(changeDollar),
    previousClose: formatCurrency(
      twelveQuote.previous_close ?? fmpQuote?.previousClose
    ),
    latestTradingDay:
      twelveQuote.datetime ||
      (fmpQuote?.timestamp
        ? new Date(fmpQuote.timestamp * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)),
    sector,
    industry,
    marketCap: formatLargeNumber(marketCap),
    peRatio: formatRatio(peRatio),
    eps: formatRatio(eps),
    profitMargin: "N/A",
    dividendYield: formatDividendYield(
      twelveProfile?.dividend_yield,
      fmpProfile?.lastDiv,
      price
    ),
    beta: formatRatio(beta),
    analystTargetPrice: "N/A",
    fiftyTwoWeekHigh,
    fiftyTwoWeekLow,
    volume: formatInteger(twelveQuote.volume ?? fmpQuote?.volume),
    riskLevel: estimateRiskLevel(beta, peRatio),
    summary: description,
    breakdown: description,
    dataSource: "live",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawSymbol = searchParams.get("symbol");

  const symbol = rawSymbol?.trim().toUpperCase();

  if (!symbol) {
    return NextResponse.json(
      { error: "Missing stock symbol." },
      { status: 400 }
    );
  }

  try {
    const cachedStock = await getCachedStock(symbol);

    if (cachedStock) {
      return NextResponse.json(cachedStock);
    }

    const liveStock = await fetchMergedStock(symbol);

    await saveStockCache(symbol, liveStock);

    return NextResponse.json(liveStock);
  } catch (error) {
    console.error("Stock route error:", error);

    const olderCachedStock = await getOlderCachedStock(symbol);

    if (olderCachedStock) {
      return NextResponse.json(olderCachedStock);
    }

    return NextResponse.json(
      {
        error: "Real stock data is unavailable for this symbol right now.",
        symbol,
        dataSource: "unavailable",
      },
      { status: 503 }
    );
  }
}