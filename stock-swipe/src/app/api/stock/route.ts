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
  dataSource: "live" | "cached" | "fallback";
  warning?: string;
};

const fallbackStocks: Record<string, StockData> = {
  AAPL: {
    ticker: "AAPL",
    name: "Apple Inc.",
    price: 195,
    change: "+1.20%",
    changeDollar: "+$2.31",
    previousClose: "192.69",
    latestTradingDay: "Sample",
    sector: "Technology",
    industry: "Consumer Electronics",
    marketCap: "$3T+",
    peRatio: "High 20s",
    eps: "N/A",
    profitMargin: "N/A",
    dividendYield: "Low",
    beta: "N/A",
    analystTargetPrice: "N/A",
    fiftyTwoWeekHigh: "N/A",
    fiftyTwoWeekLow: "N/A",
    volume: "N/A",
    riskLevel: "Medium",
    summary:
      "Apple makes iPhones, Macs, iPads, wearables, and services like iCloud, Apple Music, and the App Store.",
    breakdown:
      "Apple is one of the largest consumer technology companies in the world. Its business is built around hardware like the iPhone, Mac, and iPad, plus services like the App Store, iCloud, and Apple Music. Investors often watch iPhone sales, services growth, margins, and demand in major markets.",
    dataSource: "fallback",
    warning: "Fallback data is being used.",
  },
  MSFT: {
    ticker: "MSFT",
    name: "Microsoft Corporation",
    price: 425,
    change: "+0.85%",
    changeDollar: "+$3.58",
    previousClose: "421.42",
    latestTradingDay: "Sample",
    sector: "Technology",
    industry: "Software",
    marketCap: "$3T+",
    peRatio: "High 30s",
    eps: "N/A",
    profitMargin: "N/A",
    dividendYield: "Low",
    beta: "N/A",
    analystTargetPrice: "N/A",
    fiftyTwoWeekHigh: "N/A",
    fiftyTwoWeekLow: "N/A",
    volume: "N/A",
    riskLevel: "Medium",
    summary:
      "Microsoft sells software, cloud services, gaming products, LinkedIn services, and AI tools.",
    breakdown:
      "Microsoft is a major software and cloud company. Investors often watch Azure cloud growth, Office and Microsoft 365 subscriptions, AI adoption, and enterprise demand.",
    dataSource: "fallback",
    warning: "Fallback data is being used.",
  },
  NVDA: {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    price: 120,
    change: "+2.10%",
    changeDollar: "+$2.47",
    previousClose: "117.53",
    latestTradingDay: "Sample",
    sector: "Technology",
    industry: "Semiconductors",
    marketCap: "$2T+",
    peRatio: "High",
    eps: "N/A",
    profitMargin: "N/A",
    dividendYield: "Very low",
    beta: "N/A",
    analystTargetPrice: "N/A",
    fiftyTwoWeekHigh: "N/A",
    fiftyTwoWeekLow: "N/A",
    volume: "N/A",
    riskLevel: "High",
    summary:
      "NVIDIA designs chips used for AI, gaming, data centers, robotics, and professional graphics.",
    breakdown:
      "NVIDIA is a leading semiconductor company. Investors often watch AI chip demand, data center revenue, margins, and competition.",
    dataSource: "fallback",
    warning: "Fallback data is being used.",
  },
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isUpdatedToday(value?: string | null) {
  if (!value) return false;
  return value.slice(0, 10) === todayKey();
}

function formatCurrency(value: string | number | undefined) {
  if (value === undefined || value === "") return "N/A";

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return "N/A";

  return `$${numberValue.toFixed(2)}`;
}

function formatLargeNumber(value: string | number | undefined) {
  if (value === undefined || value === "") return "N/A";

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return "N/A";

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

function estimateRiskLevel(beta: string | undefined, peRatio: string | undefined) {
  const betaNumber = Number(beta);
  const peNumber = Number(peRatio);

  if (!Number.isNaN(betaNumber) && betaNumber >= 1.5) return "High";
  if (!Number.isNaN(peNumber) && peNumber >= 50) return "High";
  if (!Number.isNaN(betaNumber) && betaNumber <= 0.9) return "Low";

  return "Medium";
}

function getFallbackStock(symbol: string): StockData {
  const upperSymbol = symbol.toUpperCase();

  if (fallbackStocks[upperSymbol]) {
    return fallbackStocks[upperSymbol];
  }

  return {
    ticker: upperSymbol,
    name: `${upperSymbol} Corporation`,
    price: 100,
    change: "+0.00%",
    changeDollar: "$0.00",
    previousClose: "100.00",
    latestTradingDay: "Sample",
    sector: "Unknown",
    industry: "Unknown",
    marketCap: "N/A",
    peRatio: "N/A",
    eps: "N/A",
    profitMargin: "N/A",
    dividendYield: "N/A",
    beta: "N/A",
    analystTargetPrice: "N/A",
    fiftyTwoWeekHigh: "N/A",
    fiftyTwoWeekLow: "N/A",
    volume: "N/A",
    riskLevel: "Research",
    summary:
      "This ticker is available in the app, but detailed fallback data is limited.",
    breakdown:
      "Research this company using the Yahoo Finance link and recent filings before making any decisions.",
    dataSource: "fallback",
    warning: "Fallback data is being used.",
  };
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

async function fetchTwelveDataStock(symbol: string): Promise<StockData> {
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

  const quoteData = await quoteResponse.json();
  const profileData = await profileResponse.json();

  if (quoteData.status === "error") {
    throw new Error(quoteData.message || "Twelve Data quote error.");
  }

  const price = Number(quoteData.close || quoteData.price || quoteData.previous_close);
  const previousClose = Number(quoteData.previous_close);
  const changeNumber = Number(quoteData.change || 0);
  const percentChange = Number(quoteData.percent_change || 0);

  const signedChangeDollar =
    changeNumber > 0
      ? `+$${Math.abs(changeNumber).toFixed(2)}`
      : changeNumber < 0
      ? `-$${Math.abs(changeNumber).toFixed(2)}`
      : "$0.00";

  const signedPercent =
    percentChange > 0
      ? `+${percentChange.toFixed(2)}%`
      : `${percentChange.toFixed(2)}%`;

  const name =
    quoteData.name ||
    profileData.name ||
    profileData.company_name ||
    `${symbol} Corporation`;

  const sector = profileData.sector || "Unknown";
  const industry = profileData.industry || "Unknown";

  return {
    ticker: symbol,
    name,
    price: Number.isNaN(price) ? 0 : Number(price.toFixed(2)),
    change: signedPercent,
    changeDollar: signedChangeDollar,
    previousClose: Number.isNaN(previousClose)
      ? "N/A"
      : formatCurrency(previousClose),
    latestTradingDay:
      quoteData.datetime ||
      quoteData.timestamp ||
      new Date().toISOString().slice(0, 10),
    sector,
    industry,
    marketCap: formatLargeNumber(profileData.market_cap),
    peRatio: profileData.pe_ratio ? String(profileData.pe_ratio) : "N/A",
    eps: profileData.eps ? String(profileData.eps) : "N/A",
    profitMargin: "N/A",
    dividendYield: profileData.dividend_yield
      ? `${Number(profileData.dividend_yield).toFixed(2)}%`
      : "N/A",
    beta: profileData.beta ? String(profileData.beta) : "N/A",
    analystTargetPrice: "N/A",
    fiftyTwoWeekHigh: quoteData.fifty_two_week?.high
      ? formatCurrency(quoteData.fifty_two_week.high)
      : "N/A",
    fiftyTwoWeekLow: quoteData.fifty_two_week?.low
      ? formatCurrency(quoteData.fifty_two_week.low)
      : "N/A",
    volume: quoteData.volume ? String(quoteData.volume) : "N/A",
    riskLevel: estimateRiskLevel(
      profileData.beta ? String(profileData.beta) : undefined,
      profileData.pe_ratio ? String(profileData.pe_ratio) : undefined
    ),
    summary:
      profileData.description ||
      `${name} is a publicly traded company in the ${sector} sector.`,
    breakdown:
      profileData.description ||
      `${name} is a publicly traded company in the ${sector} sector. Review revenue, earnings, valuation, risk, and recent news before making decisions.`,
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

    const liveStock = await fetchTwelveDataStock(symbol);

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