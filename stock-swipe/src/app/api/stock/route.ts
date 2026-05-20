import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AlphaQuoteResponse = {
  "Global Quote"?: {
    "01. symbol"?: string;
    "05. price"?: string;
    "06. volume"?: string;
    "07. latest trading day"?: string;
    "08. previous close"?: string;
    "09. change"?: string;
    "10. change percent"?: string;
  };
  Note?: string;
  Information?: string;
  Error?: string;
};

type AlphaOverviewResponse = {
  Symbol?: string;
  Name?: string;
  Description?: string;
  Sector?: string;
  Industry?: string;
  MarketCapitalization?: string;
  PERatio?: string;
  EPS?: string;
  ProfitMargin?: string;
  DividendYield?: string;
  Beta?: string;
  AnalystTargetPrice?: string;
  "52WeekHigh"?: string;
  "52WeekLow"?: string;
  Note?: string;
  Information?: string;
  Error?: string;
};

type StockResponse = {
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

const CACHE_TIME = 1000 * 60 * 60 * 6;
const BLOCK_ALPHA_TIME = 1000 * 60 * 60;

let alphaBlockedUntil = 0;

const stockCache = new Map<
  string,
  {
    savedAt: number;
    stock: StockResponse;
  }
>();

const fallbackStocks: Record<string, StockResponse> = {
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
  },
  MSFT: {
    ticker: "MSFT",
    name: "Microsoft Corporation",
    price: 420,
    change: "+0.90%",
    changeDollar: "+$3.74",
    previousClose: "416.26",
    latestTradingDay: "Sample",
    sector: "Technology",
    industry: "Software Infrastructure",
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
      "Microsoft makes Windows, Office, Azure cloud services, Xbox products, LinkedIn, and AI-powered business software.",
    breakdown:
      "Microsoft is a major software, cloud, gaming, and AI company. Its biggest areas include Azure, Microsoft 365, Windows, LinkedIn, Xbox, and enterprise software. Investors often watch cloud growth, AI adoption, business spending, and profit margins.",
    dataSource: "fallback",
  },
  NVDA: {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    price: 920,
    change: "+2.80%",
    changeDollar: "+$25.06",
    previousClose: "894.94",
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
      "NVIDIA designs powerful chips used in gaming, artificial intelligence, data centers, robotics, and professional graphics.",
    breakdown:
      "NVIDIA designs GPUs and AI chips used in gaming, data centers, artificial intelligence, robotics, and professional graphics. The company is closely tied to AI infrastructure demand. Investors often watch data center revenue, chip supply, competition, margins, and whether growth can keep up with expectations.",
    dataSource: "fallback",
  },
  TSLA: {
    ticker: "TSLA",
    name: "Tesla Inc.",
    price: 177,
    change: "-1.10%",
    changeDollar: "-$1.97",
    previousClose: "178.97",
    latestTradingDay: "Sample",
    sector: "Consumer Cyclical",
    industry: "Auto Manufacturers",
    marketCap: "$500B+",
    peRatio: "High",
    eps: "N/A",
    profitMargin: "N/A",
    dividendYield: "None",
    beta: "N/A",
    analystTargetPrice: "N/A",
    fiftyTwoWeekHigh: "N/A",
    fiftyTwoWeekLow: "N/A",
    volume: "N/A",
    riskLevel: "High",
    summary:
      "Tesla builds electric vehicles, batteries, charging products, solar systems, and software for vehicle automation.",
    breakdown:
      "Tesla is best known for electric vehicles, but it also works on batteries, charging networks, solar products, self-driving software, and robotics. Investors often watch vehicle deliveries, margins, pricing pressure, competition, and progress in automation.",
    dataSource: "fallback",
  },
  AMD: {
    ticker: "AMD",
    name: "Advanced Micro Devices Inc.",
    price: 160,
    change: "+1.50%",
    changeDollar: "+$2.36",
    previousClose: "157.64",
    latestTradingDay: "Sample",
    sector: "Technology",
    industry: "Semiconductors",
    marketCap: "$250B+",
    peRatio: "High",
    eps: "N/A",
    profitMargin: "N/A",
    dividendYield: "None",
    beta: "N/A",
    analystTargetPrice: "N/A",
    fiftyTwoWeekHigh: "N/A",
    fiftyTwoWeekLow: "N/A",
    volume: "N/A",
    riskLevel: "High",
    summary:
      "AMD designs processors and graphics chips used in PCs, gaming systems, servers, and AI-related computing.",
    breakdown:
      "AMD designs CPUs and GPUs used in computers, gaming systems, servers, and AI workloads. It competes with Intel and NVIDIA. Investors often watch data center growth, AI chip progress, PC demand, gaming demand, and whether AMD can gain market share.",
    dataSource: "fallback",
  },
};

function cleanText(value?: string) {
  if (!value) return "";

  const trimmed = value.trim();

  if (
    trimmed === "" ||
    trimmed.toLowerCase() === "none" ||
    trimmed.toLowerCase() === "null" ||
    trimmed === "-"
  ) {
    return "";
  }

  return trimmed;
}

function getFallbackStock(symbol: string, warning?: string): StockResponse {
  const fallback = fallbackStocks[symbol];

  if (fallback) {
    return {
      ...fallback,
      dataSource: "fallback",
      warning,
    };
  }

  return {
    ticker: symbol,
    name: symbol,
    price: 0,
    change: "0.00%",
    changeDollar: "$0.00",
    previousClose: "N/A",
    latestTradingDay: "N/A",
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
      "Company information is not available yet. Later, AI can generate a beginner-friendly summary here.",
    breakdown:
      "A full company breakdown is not available yet. Later, AI can explain what the company does, how it makes money, strengths, risks, and recent performance.",
    dataSource: "fallback",
    warning,
  };
}

function formatMarketCap(value?: string) {
  const cleaned = cleanText(value);

  if (!cleaned) return "N/A";

  const numberValue = Number(cleaned);

  if (Number.isNaN(numberValue) || numberValue <= 0) return "N/A";

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

function cleanChangePercent(value?: string) {
  const cleaned = cleanText(value);

  if (!cleaned) return "0.00%";

  const withoutPercent = cleaned.replace("%", "");
  const numberValue = Number(withoutPercent);

  if (Number.isNaN(numberValue)) return cleaned;

  if (numberValue > 0) {
    return `+${numberValue.toFixed(2)}%`;
  }

  return `${numberValue.toFixed(2)}%`;
}

function cleanDollarChange(value?: string) {
  const cleaned = cleanText(value);

  if (!cleaned) return "$0.00";

  const numberValue = Number(cleaned);

  if (Number.isNaN(numberValue)) return "$0.00";

  if (numberValue > 0) {
    return `+$${numberValue.toFixed(2)}`;
  }

  if (numberValue < 0) {
    return `-$${Math.abs(numberValue).toFixed(2)}`;
  }

  return "$0.00";
}

function cleanPERatio(value?: string) {
  const cleaned = cleanText(value);

  if (!cleaned) return "N/A";

  const numberValue = Number(cleaned);

  if (Number.isNaN(numberValue) || numberValue <= 0) return "N/A";

  return numberValue.toFixed(1);
}

function cleanNumberText(value?: string, decimals = 2) {
  const cleaned = cleanText(value);

  if (!cleaned) return "N/A";

  const numberValue = Number(cleaned);

  if (Number.isNaN(numberValue)) return cleaned;

  return numberValue.toFixed(decimals);
}

function cleanDollarValue(value?: string) {
  const cleaned = cleanText(value);

  if (!cleaned) return "N/A";

  const numberValue = Number(cleaned);

  if (Number.isNaN(numberValue)) return "N/A";

  return `$${numberValue.toFixed(2)}`;
}

function cleanPercentDecimal(value?: string) {
  const cleaned = cleanText(value);

  if (!cleaned) return "N/A";

  const numberValue = Number(cleaned);

  if (Number.isNaN(numberValue)) return cleaned;

  return `${(numberValue * 100).toFixed(2)}%`;
}

function shortenDescription(description?: string, fallback?: string) {
  const cleaned = cleanText(description);

  const text =
    cleaned ||
    fallback ||
    "Company summary is not available yet. Later, AI can generate a beginner-friendly explanation here.";

  if (text.length <= 180) {
    return text;
  }

  return `${text.slice(0, 180)}...`;
}

function calculateRiskLevel(peRatio: string, changePercent: string, beta: string) {
  const pe = Number(peRatio);
  const change = Math.abs(
    Number(changePercent.replace("%", "").replace("+", ""))
  );
  const betaValue = Number(beta);

  if (!Number.isNaN(change) && change >= 4) {
    return "High";
  }

  if (!Number.isNaN(betaValue) && betaValue >= 1.5) {
    return "High";
  }

  if (!Number.isNaN(pe) && pe >= 60) {
    return "High";
  }

  if (!Number.isNaN(pe) && pe >= 30) {
    return "Medium";
  }

  if (!Number.isNaN(betaValue) && betaValue >= 1.1) {
    return "Medium";
  }

  return "Research";
}

function isLimitMessage(data: AlphaQuoteResponse | AlphaOverviewResponse) {
  const message = data.Note || data.Information || data.Error || "";

  return (
    message.toLowerCase().includes("api") ||
    message.toLowerCase().includes("limit") ||
    message.toLowerCase().includes("rate") ||
    message.toLowerCase().includes("frequency")
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "AAPL").trim().toUpperCase();

  if (!symbol) {
    return NextResponse.json(
      { error: "Missing stock symbol." },
      { status: 400 }
    );
  }

  const cached = stockCache.get(symbol);

  if (cached && Date.now() - cached.savedAt < CACHE_TIME) {
    return NextResponse.json({
      ...cached.stock,
      dataSource: "cached",
      warning: "Using cached stock data.",
    });
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      getFallbackStock(
        symbol,
        "Missing API key, so fallback data is being used."
      )
    );
  }

  if (Date.now() < alphaBlockedUntil) {
    return NextResponse.json(
      getFallbackStock(
        symbol,
        "API limit was hit recently, so fallback data is being used."
      )
    );
  }

  const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
  const overviewUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`;

  try {
    const [quoteResponse, overviewResponse] = await Promise.all([
      fetch(quoteUrl, { cache: "no-store" }),
      fetch(overviewUrl, { cache: "no-store" }),
    ]);

    const quoteData = (await quoteResponse.json()) as AlphaQuoteResponse;
    const overviewData =
      (await overviewResponse.json()) as AlphaOverviewResponse;

    if (isLimitMessage(quoteData) || isLimitMessage(overviewData)) {
      alphaBlockedUntil = Date.now() + BLOCK_ALPHA_TIME;

      return NextResponse.json(
        getFallbackStock(
          symbol,
          "API limit reached, so fallback data is being used."
        )
      );
    }

    const quote = quoteData["Global Quote"];

    if (!quote || !quote["05. price"]) {
      return NextResponse.json(
        getFallbackStock(
          symbol,
          "Live data was unavailable, so fallback data is being used."
        )
      );
    }

    const fallback = fallbackStocks[symbol];

    const price = Number(quote["05. price"]);
    const change = cleanChangePercent(quote["10. change percent"]);
    const changeDollar = cleanDollarChange(quote["09. change"]);
    const peRatio = cleanPERatio(overviewData.PERatio);
    const beta = cleanNumberText(overviewData.Beta, 2);
    const riskLevel = calculateRiskLevel(peRatio, change, beta);

    const liveMarketCap = formatMarketCap(overviewData.MarketCapitalization);

    const stock: StockResponse = {
      ticker: symbol,
      name: cleanText(overviewData.Name) || fallback?.name || symbol,
      price: Number.isNaN(price)
        ? fallback?.price || 0
        : Number(price.toFixed(2)),
      change,
      changeDollar,
      previousClose:
        cleanDollarValue(quote["08. previous close"]) ||
        fallback?.previousClose ||
        "N/A",
      latestTradingDay:
        quote["07. latest trading day"] || fallback?.latestTradingDay || "N/A",
      sector: cleanText(overviewData.Sector) || fallback?.sector || "Unknown",
      industry:
        cleanText(overviewData.Industry) || fallback?.industry || "Unknown",
      marketCap:
        liveMarketCap !== "N/A" ? liveMarketCap : fallback?.marketCap || "N/A",
      peRatio: peRatio !== "N/A" ? peRatio : fallback?.peRatio || "N/A",
      eps:
        cleanNumberText(overviewData.EPS, 2) !== "N/A"
          ? cleanNumberText(overviewData.EPS, 2)
          : fallback?.eps || "N/A",
      profitMargin:
        cleanPercentDecimal(overviewData.ProfitMargin) !== "N/A"
          ? cleanPercentDecimal(overviewData.ProfitMargin)
          : fallback?.profitMargin || "N/A",
      dividendYield:
        cleanPercentDecimal(overviewData.DividendYield) !== "N/A"
          ? cleanPercentDecimal(overviewData.DividendYield)
          : fallback?.dividendYield || "N/A",
      beta: beta !== "N/A" ? beta : fallback?.beta || "N/A",
      analystTargetPrice:
        cleanDollarValue(overviewData.AnalystTargetPrice) !== "N/A"
          ? cleanDollarValue(overviewData.AnalystTargetPrice)
          : fallback?.analystTargetPrice || "N/A",
      fiftyTwoWeekHigh:
        cleanDollarValue(overviewData["52WeekHigh"]) !== "N/A"
          ? cleanDollarValue(overviewData["52WeekHigh"])
          : fallback?.fiftyTwoWeekHigh || "N/A",
      fiftyTwoWeekLow:
        cleanDollarValue(overviewData["52WeekLow"]) !== "N/A"
          ? cleanDollarValue(overviewData["52WeekLow"])
          : fallback?.fiftyTwoWeekLow || "N/A",
      volume: quote["06. volume"] || fallback?.volume || "N/A",
      riskLevel,
      summary: shortenDescription(overviewData.Description, fallback?.summary),
      breakdown:
        cleanText(overviewData.Description) ||
        fallback?.breakdown ||
        "A full company breakdown is not available yet.",
      dataSource: "live",
    };

    stockCache.set(symbol, {
      savedAt: Date.now(),
      stock,
    });

    return NextResponse.json(stock);
  } catch {
    if (cached) {
      return NextResponse.json({
        ...cached.stock,
        dataSource: "cached",
        warning: "Live data failed, so cached data is being used.",
      });
    }

    return NextResponse.json(
      getFallbackStock(
        symbol,
        "Live data failed, so fallback data is being used."
      )
    );
  }
}