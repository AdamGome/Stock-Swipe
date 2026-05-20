"use client";

import { useEffect, useState, type PointerEvent } from "react";

type ChartRange = "1D" | "1W" | "1M" | "3M" | "1Y";
type ListTab = "watchlist" | "passed";

type ListSort =
  | "saved"
  | "bestMatch"
  | "biggestGainer"
  | "biggestLoser"
  | "highestPE"
  | "lowestPE"
  | "highestBeta"
  | "lowestRisk";

type StockFilter =
  | "all"
  | "tech"
  | "ai"
  | "banks"
  | "crypto"
  | "etfs"
  | "consumer"
  | "healthcare"
  | "energy"
  | "speculative";

type Stock = {
  ticker: string;
  name: string;
  price: number;
  change: string;
  changeDollar?: string;
  previousClose?: string;
  latestTradingDay?: string;
  sector?: string;
  industry?: string;
  marketCap?: string;
  peRatio?: string;
  eps?: string;
  profitMargin?: string;
  dividendYield?: string;
  beta?: string;
  analystTargetPrice?: string;
  fiftyTwoWeekHigh?: string;
  fiftyTwoWeekLow?: string;
  volume?: string;
  riskLevel?: string;
  summary?: string;
  breakdown?: string;
  chartData?: Partial<Record<ChartRange, number[]>>;
  dataSource?: "live" | "cached" | "fallback";
  warning?: string;
};

type NewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  sentiment: string;
};

type StockIdea = {
  symbol: string;
  filters: StockFilter[];
};

type CachedStockBundle = {
  savedAt: number;
  stock: Stock;
};

type CachedNewsBundle = {
  savedAt: number;
  news: NewsItem[];
};

const stockUniverse: StockIdea[] = [
  { symbol: "AAPL", filters: ["tech", "consumer"] },
  { symbol: "MSFT", filters: ["tech", "ai"] },
  { symbol: "NVDA", filters: ["tech", "ai"] },
  { symbol: "AMD", filters: ["tech", "ai"] },
  { symbol: "GOOGL", filters: ["tech", "ai"] },
  { symbol: "META", filters: ["tech", "ai"] },
  { symbol: "AMZN", filters: ["tech", "consumer"] },
  { symbol: "TSLA", filters: ["consumer", "speculative"] },
  { symbol: "NFLX", filters: ["consumer"] },
  { symbol: "PLTR", filters: ["ai", "speculative"] },
  { symbol: "SOFI", filters: ["banks", "speculative"] },
  { symbol: "COIN", filters: ["crypto", "speculative"] },
  { symbol: "HOOD", filters: ["crypto", "speculative"] },
  { symbol: "SHOP", filters: ["tech", "consumer"] },
  { symbol: "DIS", filters: ["consumer"] },
  { symbol: "JPM", filters: ["banks"] },
  { symbol: "BAC", filters: ["banks"] },
  { symbol: "WFC", filters: ["banks"] },
  { symbol: "GS", filters: ["banks"] },
  { symbol: "V", filters: ["banks", "tech"] },
  { symbol: "MA", filters: ["banks", "tech"] },
  { symbol: "MCD", filters: ["consumer"] },
  { symbol: "KO", filters: ["consumer"] },
  { symbol: "NKE", filters: ["consumer"] },
  { symbol: "COST", filters: ["consumer"] },
  { symbol: "WMT", filters: ["consumer"] },
  { symbol: "UNH", filters: ["healthcare"] },
  { symbol: "JNJ", filters: ["healthcare"] },
  { symbol: "PFE", filters: ["healthcare"] },
  { symbol: "LLY", filters: ["healthcare"] },
  { symbol: "XOM", filters: ["energy"] },
  { symbol: "CVX", filters: ["energy"] },
  { symbol: "OXY", filters: ["energy"] },
  { symbol: "SPY", filters: ["etfs"] },
  { symbol: "QQQ", filters: ["etfs", "tech"] },
  { symbol: "VOO", filters: ["etfs"] },
  { symbol: "VTI", filters: ["etfs"] },
  { symbol: "ARKK", filters: ["etfs", "speculative"] },
  { symbol: "RIOT", filters: ["crypto", "speculative"] },
  { symbol: "MARA", filters: ["crypto", "speculative"] },
  { symbol: "RBLX", filters: ["tech", "speculative"] },
  { symbol: "SNAP", filters: ["tech", "speculative"] },
  { symbol: "PYPL", filters: ["banks", "tech"] },
  { symbol: "UBER", filters: ["tech", "consumer"] },
  { symbol: "BABA", filters: ["tech", "consumer"] },
];

const filterOptions: { id: StockFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tech", label: "Tech" },
  { id: "ai", label: "AI / Chips" },
  { id: "banks", label: "Banks" },
  { id: "crypto", label: "Crypto" },
  { id: "etfs", label: "ETFs" },
  { id: "consumer", label: "Consumer" },
  { id: "healthcare", label: "Healthcare" },
  { id: "energy", label: "Energy" },
  { id: "speculative", label: "Speculative" },
];

const listSortOptions: { id: ListSort; label: string }[] = [
  { id: "saved", label: "Saved order" },
  { id: "bestMatch", label: "Best Match" },
  { id: "biggestGainer", label: "Biggest Gainer" },
  { id: "biggestLoser", label: "Biggest Loser" },
  { id: "highestPE", label: "Highest P/E" },
  { id: "lowestPE", label: "Lowest P/E" },
  { id: "highestBeta", label: "Highest Beta" },
  { id: "lowestRisk", label: "Lowest Risk" },
];

const defaultStockSymbols = stockUniverse.map((stock) => stock.symbol);

const popularStockIdeas = [
  "HOOD",
  "UBER",
  "RBLX",
  "INTC",
  "BABA",
  "PYPL",
  "SNAP",
  "RIOT",
];

const ranges: ChartRange[] = ["1D", "1W", "1M", "3M", "1Y"];

const STOCK_CACHE_PREFIX = "stockswipe_stock_cache_";
const NEWS_CACHE_PREFIX = "stockswipe_news_cache_";
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;

function getStockCacheKey(symbol: string) {
  return `${STOCK_CACHE_PREFIX}${symbol.toUpperCase()}`;
}

function getNewsCacheKey(symbol: string) {
  return `${NEWS_CACHE_PREFIX}${symbol.toUpperCase()}`;
}

function readCachedStock(symbol: string): Stock | null {
  try {
    const raw = localStorage.getItem(getStockCacheKey(symbol));

    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedStockBundle;

    if (!cached.stock || !cached.savedAt) return null;

    const isTooOld = Date.now() - cached.savedAt > CACHE_MAX_AGE;

    if (isTooOld) return null;

    return {
      ...cached.stock,
      dataSource: "cached",
      warning:
        "Using stock data saved in this browser because live API data is unavailable.",
    };
  } catch {
    return null;
  }
}

function saveCachedStock(symbol: string, stockToSave?: Stock) {
  try {
    if (!stockToSave) return;

    const shouldSave =
      stockToSave.price > 0 && stockToSave.dataSource !== "fallback";

    if (!shouldSave) return;

    const bundle: CachedStockBundle = {
      savedAt: Date.now(),
      stock: stockToSave,
    };

    localStorage.setItem(getStockCacheKey(symbol), JSON.stringify(bundle));
  } catch {
    // Ignore browser storage errors.
  }
}

function readCachedNews(symbol: string): NewsItem[] | null {
  try {
    const raw = localStorage.getItem(getNewsCacheKey(symbol));

    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedNewsBundle;

    if (!cached.news || !cached.savedAt) return null;

    const isTooOld = Date.now() - cached.savedAt > CACHE_MAX_AGE;

    if (isTooOld) return null;

    return cached.news;
  } catch {
    return null;
  }
}

function saveCachedNews(symbol: string, news: NewsItem[]) {
  try {
    if (!news || news.length === 0) return;

    const bundle: CachedNewsBundle = {
      savedAt: Date.now(),
      news,
    };

    localStorage.setItem(getNewsCacheKey(symbol), JSON.stringify(bundle));
  } catch {
    // Ignore browser storage errors.
  }
}

function parseChangePercent(change: string) {
  const cleaned = change.replace("%", "").replace("+", "");
  const value = Number(cleaned);
  return Number.isNaN(value) ? 0 : value;
}

function parseDollarChange(changeDollar?: string) {
  if (!changeDollar) return 0;

  const cleaned = changeDollar
    .replace("$", "")
    .replace("+", "")
    .replace(",", "");

  const value = Number(cleaned);

  if (Number.isNaN(value)) return 0;

  return changeDollar.startsWith("-") ? -Math.abs(value) : value;
}

function parseDollarValue(value?: string) {
  if (!value) return null;

  const cleaned = value.replace("$", "").replace(",", "");
  const numberValue = Number(cleaned);

  return Number.isNaN(numberValue) ? null : numberValue;
}

function parseNumberValue(value?: string) {
  if (!value) return null;

  const cleaned = value
    .replace("$", "")
    .replace("%", "")
    .replace(",", "")
    .replace("+", "")
    .trim();

  const numberValue = Number(cleaned);

  return Number.isNaN(numberValue) ? null : numberValue;
}

function createSampleChartData(price: number, change: string) {
  const isPositive = parseChangePercent(change) >= 0;

  if (isPositive) {
    return {
      "1D": [
        price * 0.985,
        price * 0.99,
        price * 0.988,
        price * 0.996,
        price * 1.002,
        price,
      ],
      "1W": [
        price * 0.96,
        price * 0.97,
        price * 0.965,
        price * 0.985,
        price * 0.995,
        price,
      ],
      "1M": [
        price * 0.92,
        price * 0.94,
        price * 0.935,
        price * 0.965,
        price * 0.985,
        price,
      ],
      "3M": [
        price * 0.88,
        price * 0.9,
        price * 0.93,
        price * 0.95,
        price * 0.98,
        price,
      ],
      "1Y": [
        price * 0.75,
        price * 0.82,
        price * 0.86,
        price * 0.91,
        price * 0.96,
        price,
      ],
    };
  }

  return {
    "1D": [
      price * 1.015,
      price * 1.01,
      price * 1.012,
      price * 1.006,
      price * 1.002,
      price,
    ],
    "1W": [
      price * 1.06,
      price * 1.05,
      price * 1.04,
      price * 1.025,
      price * 1.01,
      price,
    ],
    "1M": [
      price * 1.12,
      price * 1.09,
      price * 1.07,
      price * 1.04,
      price * 1.02,
      price,
    ],
    "3M": [
      price * 1.18,
      price * 1.15,
      price * 1.1,
      price * 1.07,
      price * 1.03,
      price,
    ],
    "1Y": [
      price * 1.25,
      price * 1.2,
      price * 1.15,
      price * 1.1,
      price * 1.05,
      price,
    ],
  };
}

function getChartValues(stock: Stock, range: ChartRange) {
  if (stock.chartData?.[range]) {
    return stock.chartData[range]!;
  }

  return createSampleChartData(stock.price, stock.change)[range];
}

function createChartPoints(values: number[]) {
  const width = 260;
  const height = 100;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

function getWeekRangePosition(stock: Stock) {
  const low = parseDollarValue(stock.fiftyTwoWeekLow);
  const high = parseDollarValue(stock.fiftyTwoWeekHigh);
  const price = stock.price;

  if (!low || !high || high <= low || price <= 0) {
    return null;
  }

  const percent = ((price - low) / (high - low)) * 100;
  return Math.max(0, Math.min(100, percent));
}

function getRiskRank(stock: Stock) {
  const risk = (stock.riskLevel || "").toLowerCase();

  if (risk.includes("low")) return 1;
  if (risk.includes("medium")) return 2;
  if (risk.includes("high")) return 3;

  return 4;
}

function getMatchScore(stock: Stock) {
  let score = 50;
  const reasons: string[] = [];

  const percentChange = parseChangePercent(stock.change);
  const dollarChange = parseDollarChange(stock.changeDollar);
  const pe = Number(stock.peRatio);
  const beta = Number(stock.beta);
  const hasMarketCap = !!stock.marketCap && stock.marketCap !== "N/A";
  const hasSummary =
    !!stock.summary && stock.summary !== "No summary available.";
  const hasTarget =
    !!stock.analystTargetPrice && stock.analystTargetPrice !== "N/A";
  const hasEps = !!stock.eps && stock.eps !== "N/A";
  const risk = stock.riskLevel || "Research";

  if (percentChange > 0) {
    score += 10;
    reasons.push("Stock is up today");
  } else if (percentChange < 0) {
    score -= 6;
    reasons.push("Stock is down today");
  }

  if (dollarChange > 0) {
    score += 5;
    reasons.push("Positive dollar move today");
  } else if (dollarChange < 0) {
    score -= 3;
    reasons.push("Negative dollar move today");
  }

  if (hasMarketCap) {
    score += 6;
    reasons.push("Market cap data is available");
  }

  if (hasTarget) {
    score += 6;
    reasons.push("Analyst target data is available");
  }

  if (hasEps) {
    score += 6;
    reasons.push("EPS data is available");
  }

  if (!Number.isNaN(pe) && pe > 0) {
    if (pe < 25) {
      score += 10;
      reasons.push("P/E ratio looks more reasonable");
    } else if (pe < 45) {
      score += 5;
      reasons.push("P/E ratio is available");
    } else {
      score -= 4;
      reasons.push("P/E ratio may be high");
    }
  }

  if (!Number.isNaN(beta) && beta > 0) {
    if (beta < 1) {
      score += 5;
      reasons.push("Beta suggests lower volatility");
    } else if (beta > 1.5) {
      score -= 6;
      reasons.push("Beta suggests higher volatility");
    }
  }

  if (risk === "Medium") {
    score += 4;
    reasons.push("Risk level is moderate");
  } else if (risk === "High") {
    score -= 8;
    reasons.push("Risk level is high");
  } else {
    reasons.push("Needs more research");
  }

  if (hasSummary) {
    score += 4;
    reasons.push("Company summary is available");
  }

  score = Math.max(5, Math.min(95, score));

  if (score >= 80) {
    return {
      score,
      label: "Strong Match",
      color: "text-green-400",
      bg: "bg-green-500/20",
      border: "border-green-500/30",
      reasons,
    };
  }

  if (score >= 65) {
    return {
      score,
      label: "Good Match",
      color: "text-blue-400",
      bg: "bg-blue-500/20",
      border: "border-blue-500/30",
      reasons,
    };
  }

  if (score >= 50) {
    return {
      score,
      label: "Research Match",
      color: "text-yellow-300",
      bg: "bg-yellow-500/20",
      border: "border-yellow-500/30",
      reasons,
    };
  }

  return {
    score,
    label: "Caution",
    color: "text-red-400",
    bg: "bg-red-500/20",
    border: "border-red-500/30",
    reasons,
  };
}

function sortStockList(list: Stock[], sortBy: ListSort) {
  const copiedList = [...list];

  if (sortBy === "saved") {
    return copiedList;
  }

  return copiedList.sort((a, b) => {
    if (sortBy === "bestMatch") {
      return getMatchScore(b).score - getMatchScore(a).score;
    }

    if (sortBy === "biggestGainer") {
      return parseChangePercent(b.change) - parseChangePercent(a.change);
    }

    if (sortBy === "biggestLoser") {
      return parseChangePercent(a.change) - parseChangePercent(b.change);
    }

    if (sortBy === "highestPE") {
      const aPE = parseNumberValue(a.peRatio) ?? -1;
      const bPE = parseNumberValue(b.peRatio) ?? -1;

      return bPE - aPE;
    }

    if (sortBy === "lowestPE") {
      const aPE = parseNumberValue(a.peRatio) ?? Number.MAX_SAFE_INTEGER;
      const bPE = parseNumberValue(b.peRatio) ?? Number.MAX_SAFE_INTEGER;

      return aPE - bPE;
    }

    if (sortBy === "highestBeta") {
      const aBeta = parseNumberValue(a.beta) ?? -1;
      const bBeta = parseNumberValue(b.beta) ?? -1;

      return bBeta - aBeta;
    }

    if (sortBy === "lowestRisk") {
      return getRiskRank(a) - getRiskRank(b);
    }

    return 0;
  });
}

function getCompanyInsights(stock: Stock) {
  const ticker = stock.ticker.toUpperCase();

  const customInsights: Record<
    string,
    {
      whatItDoes: string;
      watchItems: string[];
      strengths: string[];
      risks: string[];
      verdict: string;
    }
  > = {
    AAPL: {
      whatItDoes:
        "Apple sells consumer technology products like iPhone, Mac, iPad, Apple Watch, AirPods, and services such as iCloud, Apple Music, Apple TV+, and the App Store.",
      watchItems: [
        "iPhone sales",
        "Services revenue",
        "Profit margin",
        "New products",
      ],
      strengths: [
        "Strong brand loyalty",
        "Huge cash flow",
        "Large services ecosystem",
      ],
      risks: [
        "Depends heavily on iPhone demand",
        "High investor expectations",
        "Regulatory pressure",
      ],
      verdict:
        "Apple is a mature, high-quality company. Beginners can study it as a stable large-cap business, but valuation still matters.",
    },
    MSFT: {
      whatItDoes:
        "Microsoft makes money from cloud computing, business software, Windows, Office, Xbox, LinkedIn, and AI tools.",
      watchItems: [
        "Azure growth",
        "AI adoption",
        "Enterprise software demand",
        "Profit margin",
      ],
      strengths: [
        "Strong enterprise customer base",
        "Major cloud business",
        "Recurring software revenue",
      ],
      risks: [
        "Cloud competition",
        "AI spending costs",
        "Valuation risk if growth slows",
      ],
      verdict:
        "Microsoft is a strong software and cloud company. Beginners can learn a lot from its recurring revenue model.",
    },
    NVDA: {
      whatItDoes:
        "NVIDIA designs chips used in gaming, artificial intelligence, data centers, robotics, and professional graphics.",
      watchItems: [
        "Data center revenue",
        "AI chip demand",
        "Competition",
        "Profit margin",
      ],
      strengths: [
        "Leader in AI chips",
        "Strong data center demand",
        "High-margin business",
      ],
      risks: [
        "Very high expectations",
        "AI demand could slow",
        "Competition may increase",
      ],
      verdict:
        "NVIDIA is a high-growth AI stock. It can be exciting, but high expectations can make the stock volatile.",
    },
    TSLA: {
      whatItDoes:
        "Tesla builds electric vehicles, battery products, charging infrastructure, solar products, and self-driving software.",
      watchItems: [
        "Vehicle deliveries",
        "Margins",
        "EV competition",
        "Self-driving progress",
      ],
      strengths: [
        "Strong EV brand",
        "Large charging network",
        "Software potential",
      ],
      risks: [
        "High competition",
        "Margin pressure",
        "Stock often reacts strongly to news",
      ],
      verdict:
        "Tesla is a high-volatility stock. Beginners should be careful and understand that expectations drive a lot of the price action.",
    },
    AMD: {
      whatItDoes:
        "AMD designs CPUs and GPUs used in PCs, gaming systems, servers, data centers, and AI-related computing.",
      watchItems: [
        "Data center growth",
        "AI chips",
        "Competition with NVIDIA and Intel",
        "PC demand",
      ],
      strengths: [
        "Competitive chips",
        "AI and data center opportunity",
        "Gaming exposure",
      ],
      risks: [
        "Strong competition",
        "Chip cycles can be volatile",
        "High AI expectations",
      ],
      verdict:
        "AMD is a semiconductor growth stock. It can be interesting, but chip stocks can move in cycles.",
    },
  };

  if (customInsights[ticker]) {
    return customInsights[ticker];
  }

  return {
    whatItDoes:
      stock.breakdown ||
      stock.summary ||
      `${stock.name} is a company in the ${stock.sector || "Unknown"} sector.`,
    watchItems: [
      "Revenue growth",
      "Profit margin",
      "Debt and cash flow",
      "Competition",
    ],
    strengths: [
      "Can be compared against competitors",
      "Useful for learning stock research",
      "May have a clear market niche",
    ],
    risks: [
      "Limited data in this prototype",
      "Stock price can move quickly",
      "More research is needed",
    ],
    verdict:
      "This stock needs more research. Use the Yahoo Finance link and company filings before making any investment decision.",
  };
}

function DataCard({
  label,
  value,
  note,
  compact = false,
}: {
  label: string;
  value?: string;
  note?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact ? "bg-slate-900 rounded-2xl p-3" : "bg-slate-900 rounded-2xl p-4"
      }
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className={compact ? "text-sm font-bold mt-1" : "text-lg font-bold mt-1"}>
        {value || "N/A"}
      </p>
      {note && <p className="text-xs text-slate-600 mt-1">{note}</p>}
    </div>
  );
}

function WeekRangeBar({
  stock,
  compact = false,
}: {
  stock: Stock;
  compact?: boolean;
}) {
  const position = getWeekRangePosition(stock);

  return (
    <div className="bg-slate-900 rounded-2xl p-4">
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-slate-400 font-bold">52-week range</p>
        <p className="text-xs text-slate-600">Current: ${stock.price}</p>
      </div>

      <div className="h-3 bg-[#090d18] rounded-full relative overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-green-400 rounded-full"
          style={{ width: position === null ? "0%" : `${position}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-slate-500 mt-2">
        <span>Low: {stock.fiftyTwoWeekLow || "N/A"}</span>
        <span>High: {stock.fiftyTwoWeekHigh || "N/A"}</span>
      </div>

      {!compact && (
        <p className="text-xs text-slate-600 mt-2">
          {position === null
            ? "Range data unavailable right now."
            : `Current price is about ${position.toFixed(
                0
              )}% of the way from the 52-week low to high.`}
        </p>
      )}
    </div>
  );
}

function NewsSection({ stock }: { stock: Stock }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [newsWarning, setNewsWarning] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadNews() {
      try {
        setIsLoadingNews(true);
        setNewsWarning("");

        const cachedNews = readCachedNews(stock.ticker);

        const response = await fetch(`/api/news?symbol=${stock.ticker}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load news.");
        }

        const incomingNews = data.news || [];

        if (!ignore) {
          if (data.dataSource === "fallback" && cachedNews) {
            setNews(cachedNews);
            setNewsWarning(
              "Using news saved in this browser because live news is unavailable."
            );
          } else {
            setNews(incomingNews);
            setNewsWarning(data.warning || "");
          }
        }

        if (data.dataSource !== "fallback" && incomingNews.length > 0) {
          saveCachedNews(stock.ticker, incomingNews);
        }
      } catch {
        if (!ignore) {
          const cachedNews = readCachedNews(stock.ticker);

          if (cachedNews) {
            setNews(cachedNews);
            setNewsWarning(
              "Using news saved in this browser because live news is unavailable."
            );
          } else {
            setNews([]);
            setNewsWarning("News could not be loaded right now.");
          }
        }
      } finally {
        if (!ignore) {
          setIsLoadingNews(false);
        }
      }
    }

    loadNews();

    return () => {
      ignore = true;
    };
  }, [stock.ticker]);

  return (
    <div className="bg-slate-900 rounded-2xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-purple-400 font-bold">Recent news</p>
        <span className="text-[10px] text-slate-500">Headlines</span>
      </div>

      {isLoadingNews ? (
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <div className="h-4 w-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          Loading news...
        </div>
      ) : news.length === 0 ? (
        <p className="text-sm text-slate-500">No news available right now.</p>
      ) : (
        <div className="space-y-3">
          {news.slice(0, 4).map((item, index) => (
            <a
              key={`${item.title}-${index}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="block bg-[#090d18] border border-slate-800 rounded-2xl p-3 hover:border-purple-400 transition"
            >
              <div className="flex justify-between gap-3">
                <p className="text-sm font-bold text-slate-100 leading-snug">
                  {item.title}
                </p>

                <span className="text-[10px] h-fit bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                  {item.sentiment || "Neutral"}
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-1">
                {item.source} - {item.publishedAt}
              </p>

              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {item.summary}
              </p>
            </a>
          ))}
        </div>
      )}

      {newsWarning && (
        <p className="text-xs text-yellow-400 mt-3">{newsWarning}</p>
      )}
    </div>
  );
}

function StockDetailModal({
  stock,
  onClose,
}: {
  stock: Stock;
  onClose: () => void;
}) {
  const [selectedRange, setSelectedRange] = useState<ChartRange>("1M");

  const isPositive = stock.change.startsWith("+");
  const chartPoints = createChartPoints(getChartValues(stock, selectedRange));
  const insights = getCompanyInsights(stock);
  const match = getMatchScore(stock);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f1320] border border-slate-700 rounded-3xl max-w-md w-full p-5 max-h-[88vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-4xl font-bold">{stock.ticker}</h2>
              <span className="text-[10px] bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded-full">
                {stock.dataSource || "saved"}
              </span>
            </div>

            <p className="text-slate-400 mt-1">{stock.name}</p>
            <p className="text-xs text-slate-600 mt-1">
              {stock.industry || stock.sector || "Unknown industry"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            x
          </button>
        </div>

        <div className={`mt-5 rounded-2xl p-4 border ${match.bg} ${match.border}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Match Score</p>
              <p className={`text-3xl font-black ${match.color}`}>
                {match.score}%
              </p>
            </div>

            <div className="text-right">
              <p className={`font-bold ${match.color}`}>{match.label}</p>
              <p className="text-xs text-slate-500">Prototype score</p>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            {match.reasons.slice(0, 4).map((reason) => (
              <p key={reason} className="text-xs text-slate-300">
                - {reason}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-5 bg-[#090d18] rounded-2xl p-4">
          <div className="flex justify-between mb-3">
            {ranges.map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={
                  selectedRange === range
                    ? "bg-green-400 text-black text-xs px-3 py-1 rounded-full font-bold"
                    : "bg-slate-800 text-slate-400 text-xs px-3 py-1 rounded-full"
                }
              >
                {range}
              </button>
            ))}
          </div>

          <svg viewBox="0 0 260 100" className="w-full h-32">
            <polyline
              points={chartPoints}
              fill="none"
              stroke={isPositive ? "#4ade80" : "#f87171"}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <p className="text-xs text-slate-600 mt-2 text-center">
            Chart uses live, cached, or fallback historical data.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <DataCard label="Price" value={`$${stock.price}`} />
          <DataCard
            label="Today"
            value={stock.change}
            note={stock.changeDollar || "$0.00"}
          />
          <DataCard label="Previous close" value={stock.previousClose || "N/A"} />
          <DataCard
            label="Analyst target"
            value={stock.analystTargetPrice || "N/A"}
          />
          <DataCard label="Market cap" value={stock.marketCap || "N/A"} />
          <DataCard label="P/E" value={stock.peRatio || "N/A"} />
          <DataCard label="EPS" value={stock.eps || "N/A"} />
          <DataCard label="Beta" value={stock.beta || "N/A"} note="Volatility" />
          <DataCard label="Profit margin" value={stock.profitMargin || "N/A"} />
          <DataCard label="Dividend yield" value={stock.dividendYield || "N/A"} />
        </div>

        <div className="mt-4">
          <WeekRangeBar stock={stock} />
        </div>

        <NewsSection stock={stock} />

        <div className="bg-slate-900 rounded-2xl p-4 mt-4">
          <p className="text-sm text-green-400 font-bold mb-2">
            What the company does
          </p>
          <p className="text-slate-200 leading-relaxed">
            {insights.whatItDoes}
          </p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 mt-4">
          <p className="text-sm text-blue-400 font-bold mb-3">
            Key things to watch
          </p>

          <div className="space-y-2">
            {insights.watchItems.map((item) => (
              <div key={item} className="flex gap-2 text-sm text-slate-300">
                <span className="text-blue-400">-</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
            <p className="text-sm text-green-400 font-bold mb-3">Strengths</p>

            <div className="space-y-2">
              {insights.strengths.map((item) => (
                <div key={item} className="flex gap-2 text-sm text-slate-300">
                  <span className="text-green-400">+</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
            <p className="text-sm text-red-400 font-bold mb-3">Risks</p>

            <div className="space-y-2">
              {insights.risks.map((item) => (
                <div key={item} className="flex gap-2 text-sm text-slate-300">
                  <span className="text-red-400">!</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mt-4">
          <p className="text-sm text-yellow-300 font-bold mb-2">
            Beginner verdict
          </p>

          <p className="text-sm text-slate-200 leading-relaxed">
            {insights.verdict}
          </p>
        </div>

        {stock.warning && (
          <p className="text-xs text-yellow-400 mt-4">{stock.warning}</p>
        )}

        <p className="text-xs text-slate-500 mt-4">
          This is educational information, not financial advice.
        </p>

        <a
          href={`https://finance.yahoo.com/quote/${stock.ticker}`}
          target="_blank"
          rel="noreferrer"
          className="block text-center bg-blue-500 hover:bg-blue-600 mt-5 py-3 rounded-full font-bold"
        >
          Open on Yahoo Finance
        </a>
      </div>
    </div>
  );
}

function ListsPanel({
  liked,
  passed,
  activeTab,
  setActiveTab,
  onClose,
  onSelectStock,
  onReset,
  onMoveToWatchlist,
  onMoveToPassed,
  onRemoveFromList,
}: {
  liked: Stock[];
  passed: Stock[];
  activeTab: ListTab;
  setActiveTab: (tab: ListTab) => void;
  onClose: () => void;
  onSelectStock: (stock: Stock) => void;
  onReset: () => void;
  onMoveToWatchlist: (stock: Stock) => void;
  onMoveToPassed: (stock: Stock) => void;
  onRemoveFromList: (stock: Stock, list: ListTab) => void;
}) {
  const [sortBy, setSortBy] = useState<ListSort>("saved");

  const rawList = activeTab === "watchlist" ? liked : passed;
  const list = sortStockList(rawList, sortBy);

  const selectedSortLabel =
    listSortOptions.find((option) => option.id === sortBy)?.label ||
    "Saved order";

  return (
    <div className="fixed inset-0 bg-[#080c16] text-white z-40 p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Lists</h2>
            <p className="text-xs text-slate-500 mt-1">
              Sort saved stocks without using more API calls.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white text-3xl"
          >
            x
          </button>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={() => setActiveTab("watchlist")}
            className={
              activeTab === "watchlist"
                ? "bg-green-400 text-black px-4 py-2 rounded-full font-bold"
                : "bg-slate-900 text-slate-300 px-4 py-2 rounded-full border border-slate-800"
            }
          >
            Watchlist {liked.length}
          </button>

          <button
            onClick={() => setActiveTab("passed")}
            className={
              activeTab === "passed"
                ? "bg-red-400 text-black px-4 py-2 rounded-full font-bold"
                : "bg-slate-900 text-slate-300 px-4 py-2 rounded-full border border-slate-800"
            }
          >
            Passed {passed.length}
          </button>
        </div>

        <div className="mt-6 bg-[#0f1320] border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">Sort by</p>
              <p className="text-sm text-slate-300 mt-1">
                {selectedSortLabel}
              </p>
            </div>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as ListSort)}
              className="bg-slate-900 border border-slate-700 text-white rounded-full px-4 py-2 text-sm outline-none focus:border-green-400"
            >
              {listSortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8">
          {list.length === 0 ? (
            <div className="border border-slate-800 bg-[#0f1320] rounded-2xl p-6 text-slate-400">
              {activeTab === "watchlist"
                ? "No liked stocks yet. Swipe right on stocks to add them here."
                : "No passed stocks yet. Swipe left on stocks to add them here."}
            </div>
          ) : (
            <div className="space-y-4">
              {list.map((stock, index) => {
                const isPositive = stock.change.startsWith("+");
                const match = getMatchScore(stock);

                return (
                  <div
                    key={`${stock.ticker}-${index}`}
                    className="bg-[#0f1320] border border-slate-800 rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-lg">{stock.ticker}</h3>

                          <span className="text-[10px] bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded-full">
                            {stock.dataSource || "saved"}
                          </span>
                        </div>

                        <p className="text-sm text-slate-500">{stock.name}</p>

                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`text-xs ${match.color}`}>
                            Match: {match.score}%
                          </span>

                          <span className="text-xs text-slate-600">
                            P/E: {stock.peRatio || "N/A"}
                          </span>

                          <span className="text-xs text-slate-600">
                            Beta: {stock.beta || "N/A"}
                          </span>

                          <span className="text-xs text-slate-600">
                            Risk: {stock.riskLevel || "Research"}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold">${stock.price}</p>
                        <p
                          className={
                            isPositive
                              ? "text-sm text-green-400"
                              : "text-sm text-red-400"
                          }
                        >
                          {stock.change}
                        </p>
                        <p
                          className={
                            isPositive
                              ? "text-xs text-green-400"
                              : "text-xs text-red-400"
                          }
                        >
                          {stock.changeDollar || "$0.00"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button
                        onClick={() => onSelectStock(stock)}
                        className="bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2 rounded-full text-sm hover:border-green-400"
                      >
                        Details
                      </button>

                      {activeTab === "watchlist" ? (
                        <button
                          onClick={() => onMoveToPassed(stock)}
                          className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-2 rounded-full text-sm hover:bg-red-500/30"
                        >
                          Move to Passed
                        </button>
                      ) : (
                        <button
                          onClick={() => onMoveToWatchlist(stock)}
                          className="bg-green-500/20 border border-green-500/40 text-green-300 px-4 py-2 rounded-full text-sm hover:bg-green-500/30"
                        >
                          Move to Watchlist
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => onRemoveFromList(stock, activeTab)}
                      className="w-full mt-2 border border-slate-800 text-slate-500 px-4 py-2 rounded-full text-sm hover:text-white hover:border-slate-600"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {(liked.length > 0 || passed.length > 0) && (
          <button
            onClick={onReset}
            className="mt-8 border border-slate-700 px-5 py-3 rounded-full text-slate-300 hover:text-white"
          >
            Reset all lists
          </button>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [liked, setLiked] = useState<Stock[]>([]);
  const [passed, setPassed] = useState<Stock[]>([]);
  const [extraSymbols, setExtraSymbols] = useState<string[]>([]);
  const [tickerInput, setTickerInput] = useState("");
  const [tickerMessage, setTickerMessage] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<StockFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [lastAction, setLastAction] = useState<{
    list: "liked" | "passed";
    stock: Stock;
  } | null>(null);

  const [loaded, setLoaded] = useState(false);

  const [stock, setStock] = useState<Stock | null>(null);
  const [isFetchingStock, setIsFetchingStock] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [selectedRange, setSelectedRange] = useState<ChartRange>("1M");
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  const [showLists, setShowLists] = useState(false);
  const [activeListTab, setActiveListTab] = useState<ListTab>("watchlist");

  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const savedLiked = JSON.parse(
      localStorage.getItem("likedStocks") || "[]"
    ) as Stock[];

    const savedPassed = JSON.parse(
      localStorage.getItem("passedStocks") || "[]"
    ) as Stock[];

    const savedExtraSymbols = JSON.parse(
      localStorage.getItem("extraStockSymbols") || "[]"
    ) as string[];

    setLiked(savedLiked);
    setPassed(savedPassed);
    setExtraSymbols(savedExtraSymbols);
    setLoaded(true);
  }, []);

  const filteredDefaultSymbols =
    selectedFilter === "all"
      ? defaultStockSymbols
      : stockUniverse
          .filter((stockIdea) => stockIdea.filters.includes(selectedFilter))
          .map((stockIdea) => stockIdea.symbol);

  const allStockSymbols = Array.from(
    new Set([...filteredDefaultSymbols, ...extraSymbols])
  );

  const alreadySeenTickers = [...liked, ...passed].map((savedStock) =>
    savedStock.ticker.toUpperCase()
  );

  const currentSymbol = allStockSymbols.find(
    (symbol) => !alreadySeenTickers.includes(symbol)
  );

  const totalSaved = liked.length + passed.length;
  const selectedFilterLabel =
    filterOptions.find((filter) => filter.id === selectedFilter)?.label ||
    "All";

  useEffect(() => {
    if (!loaded) return;

    if (!currentSymbol) {
      setStock(null);
      return;
    }

    const symbolToLoad = currentSymbol;
    let ignore = false;

    async function loadStock() {
      try {
        setIsFetchingStock(true);
        setFetchError("");
        setStock(null);

        const cachedStock = readCachedStock(symbolToLoad);

        const [stockResponse, chartResponse] = await Promise.all([
          fetch(`/api/stock?symbol=${symbolToLoad}`),
          fetch(`/api/chart?symbol=${symbolToLoad}`),
        ]);

        const stockData = await stockResponse.json();
        const chartData = await chartResponse.json();

        if (!stockResponse.ok) {
          throw new Error(stockData.error || "Could not load stock data.");
        }

        const incomingStock: Stock = {
          ...stockData,
          chartData:
            chartData?.chartData ||
            createSampleChartData(stockData.price, stockData.change),
        };

        const finalStock: Stock =
          incomingStock.dataSource === "fallback" && cachedStock
            ? cachedStock
            : incomingStock;

        if (!ignore) {
          setStock(finalStock);
        }

        if (incomingStock.dataSource !== "fallback") {
          saveCachedStock(symbolToLoad, incomingStock);
        }
      } catch (error) {
        if (!ignore) {
          const cachedStock = readCachedStock(symbolToLoad);

          if (cachedStock) {
            setStock(cachedStock);
            setFetchError("");
          } else {
            const message =
              error instanceof Error ? error.message : "Could not load stock data.";

            setFetchError(message);
          }
        }
      } finally {
        if (!ignore) {
          setIsFetchingStock(false);
        }
      }
    }

    loadStock();

    return () => {
      ignore = true;
    };
  }, [loaded, currentSymbol]);

  function addTickerToDeck(symbolFromButton?: string) {
    const rawSymbol = symbolFromButton || tickerInput;

    const symbol = rawSymbol
      .trim()
      .toUpperCase()
      .replace(/[^A-Z.]/g, "");

    if (!symbol) {
      setTickerMessage("Type a ticker like META, AMZN, or GOOGL.");
      return;
    }

    if (alreadySeenTickers.includes(symbol)) {
      setTickerMessage(
        `${symbol} is already in your Watchlist or Passed list. Use Undo or Reset to see it again.`
      );
      setTickerInput("");
      return;
    }

    if (allStockSymbols.includes(symbol)) {
      setTickerMessage(`${symbol} is already in your swipe deck.`);
      setTickerInput("");
      return;
    }

    const newExtraSymbols = [...extraSymbols, symbol];

    setExtraSymbols(newExtraSymbols);
    localStorage.setItem("extraStockSymbols", JSON.stringify(newExtraSymbols));

    setTickerInput("");
    setTickerMessage(`${symbol} was added to your swipe deck.`);
  }

  function resetDrag() {
    setDragX(0);
    setDragStartX(null);
    setIsDragging(false);
  }

  function likeStock() {
    if (!stock) return;

    const newLiked = [...liked, stock];
    setLiked(newLiked);
    localStorage.setItem("likedStocks", JSON.stringify(newLiked));

    setLastAction({
      list: "liked",
      stock,
    });

    setSelectedRange("1M");
    resetDrag();
  }

  function passStock() {
    if (!stock) return;

    const newPassed = [...passed, stock];
    setPassed(newPassed);
    localStorage.setItem("passedStocks", JSON.stringify(newPassed));

    setLastAction({
      list: "passed",
      stock,
    });

    setSelectedRange("1M");
    resetDrag();
  }

  function undoLastSwipe() {
    if (!lastAction) return;

    const tickerToUndo = lastAction.stock.ticker.toUpperCase();

    if (lastAction.list === "liked") {
      const newLiked = liked.filter(
        (savedStock) => savedStock.ticker.toUpperCase() !== tickerToUndo
      );

      setLiked(newLiked);
      localStorage.setItem("likedStocks", JSON.stringify(newLiked));
    }

    if (lastAction.list === "passed") {
      const newPassed = passed.filter(
        (savedStock) => savedStock.ticker.toUpperCase() !== tickerToUndo
      );

      setPassed(newPassed);
      localStorage.setItem("passedStocks", JSON.stringify(newPassed));
    }

    setSelectedRange("1M");
    setLastAction(null);
    resetDrag();
  }

  function removeStockFromList(stockToRemove: Stock, list: ListTab) {
    const tickerToRemove = stockToRemove.ticker.toUpperCase();

    if (list === "watchlist") {
      const newLiked = liked.filter(
        (savedStock) => savedStock.ticker.toUpperCase() !== tickerToRemove
      );

      setLiked(newLiked);
      localStorage.setItem("likedStocks", JSON.stringify(newLiked));
    }

    if (list === "passed") {
      const newPassed = passed.filter(
        (savedStock) => savedStock.ticker.toUpperCase() !== tickerToRemove
      );

      setPassed(newPassed);
      localStorage.setItem("passedStocks", JSON.stringify(newPassed));
    }

    setLastAction(null);
  }

  function moveToWatchlist(stockToMove: Stock) {
    const tickerToMove = stockToMove.ticker.toUpperCase();

    const newPassed = passed.filter(
      (savedStock) => savedStock.ticker.toUpperCase() !== tickerToMove
    );

    const alreadyLiked = liked.some(
      (savedStock) => savedStock.ticker.toUpperCase() === tickerToMove
    );

    const newLiked = alreadyLiked ? liked : [...liked, stockToMove];

    setPassed(newPassed);
    setLiked(newLiked);

    localStorage.setItem("passedStocks", JSON.stringify(newPassed));
    localStorage.setItem("likedStocks", JSON.stringify(newLiked));

    setLastAction(null);
  }

  function moveToPassed(stockToMove: Stock) {
    const tickerToMove = stockToMove.ticker.toUpperCase();

    const newLiked = liked.filter(
      (savedStock) => savedStock.ticker.toUpperCase() !== tickerToMove
    );

    const alreadyPassed = passed.some(
      (savedStock) => savedStock.ticker.toUpperCase() === tickerToMove
    );

    const newPassed = alreadyPassed ? passed : [...passed, stockToMove];

    setLiked(newLiked);
    setPassed(newPassed);

    localStorage.setItem("likedStocks", JSON.stringify(newLiked));
    localStorage.setItem("passedStocks", JSON.stringify(newPassed));

    setLastAction(null);
  }

  function resetApp() {
    localStorage.removeItem("likedStocks");
    localStorage.removeItem("passedStocks");
    localStorage.removeItem("extraStockSymbols");

    setLiked([]);
    setPassed([]);
    setExtraSymbols([]);
    setTickerInput("");
    setTickerMessage("");
    setSelectedFilter("all");
    setShowFilters(false);
    setLastAction(null);
    setSelectedStock(null);
    setSelectedRange("1M");
    resetDrag();
  }

  function retryCurrentStock() {
    if (!currentSymbol) return;

    const symbolToRetry = currentSymbol;

    setFetchError("");
    setStock(null);

    Promise.all([
      fetch(`/api/stock?symbol=${symbolToRetry}`),
      fetch(`/api/chart?symbol=${symbolToRetry}`),
    ])
      .then(async ([stockResponse, chartResponse]) => {
        const stockData = await stockResponse.json();
        const chartData = await chartResponse.json();

        return {
          ok: stockResponse.ok,
          stockData,
          chartData,
        };
      })
      .then(({ ok, stockData, chartData }) => {
        if (!ok) {
          throw new Error(stockData.error || "Could not load stock data.");
        }

        const incomingStock: Stock = {
          ...stockData,
          chartData:
            chartData?.chartData ||
            createSampleChartData(stockData.price, stockData.change),
        };

        const cachedStock = readCachedStock(symbolToRetry);

        const finalStock =
          incomingStock.dataSource === "fallback" && cachedStock
            ? cachedStock
            : incomingStock;

        setStock(finalStock);

        if (incomingStock.dataSource !== "fallback") {
          saveCachedStock(symbolToRetry, incomingStock);
        }
      })
      .catch((error) => {
        const cachedStock = readCachedStock(symbolToRetry);

        if (cachedStock) {
          setStock(cachedStock);
          setFetchError("");
          return;
        }

        const message =
          error instanceof Error ? error.message : "Could not load stock data.";

        setFetchError(message);
      });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const target = event.target as Element;

    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("select")
    ) {
      return;
    }

    setDragStartX(event.clientX);
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging || dragStartX === null) return;

    const distance = event.clientX - dragStartX;
    setDragX(distance);
  }

  function handlePointerUp() {
    if (!isDragging) return;

    if (dragX > 120) {
      likeStock();
      return;
    }

    if (dragX < -120) {
      passStock();
      return;
    }

    resetDrag();
  }

  function Header() {
    return (
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-green-400 text-black w-8 h-8 rounded-full flex items-center justify-center font-black">
            ^
          </div>

          <div>
            <h1 className="font-black text-lg leading-none">StockSwipe</h1>
            <p className="text-[11px] text-slate-500 mt-1">
              {selectedFilterLabel} deck
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(true)}
            className="bg-slate-900 border border-slate-800 text-slate-200 px-4 py-2 rounded-full text-sm hover:border-green-400"
          >
            Filter
          </button>

          <button
            onClick={() => setShowLists(true)}
            className="relative text-slate-300 hover:text-white text-sm"
          >
            Lists

            {totalSaved > 0 && (
              <span className="ml-2 bg-slate-800 text-slate-300 px-2 py-1 rounded-full text-xs">
                {totalSaved}
              </span>
            )}
          </button>
        </div>
      </header>
    );
  }

  function FilterModal() {
    if (!showFilters) return null;

    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-[#0f1320] border border-slate-700 rounded-3xl w-full max-w-md p-5 shadow-2xl max-h-[88vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">Filters</h2>
              <p className="text-sm text-slate-500 mt-1">
                Choose what kind of stocks you want to swipe.
              </p>
            </div>

            <button
              onClick={() => setShowFilters(false)}
              className="text-slate-400 hover:text-white text-3xl"
            >
              x
            </button>
          </div>

          <div className="mt-6">
            <p className="text-xs text-slate-500 mb-3">Company type</p>

            <div className="grid grid-cols-2 gap-3">
              {filterOptions.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => {
                    setSelectedFilter(filter.id);
                    setSelectedRange("1M");
                    setTickerMessage("");
                    resetDrag();
                    setShowFilters(false);
                  }}
                  className={
                    selectedFilter === filter.id
                      ? "bg-green-400 text-black px-4 py-3 rounded-2xl text-sm font-bold"
                      : "bg-slate-900 border border-slate-800 text-slate-300 px-4 py-3 rounded-2xl text-sm hover:border-green-400"
                  }
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-slate-800 pt-5">
            <p className="text-xs text-slate-500 mb-3">Add a ticker</p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                addTickerToDeck();
              }}
              className="flex gap-2"
            >
              <input
                value={tickerInput}
                onChange={(event) => setTickerInput(event.target.value)}
                placeholder="Example: META"
                className="flex-1 bg-[#090d18] border border-slate-800 rounded-full px-4 py-3 text-white placeholder:text-slate-600 outline-none focus:border-green-400"
              />

              <button
                type="submit"
                className="bg-green-400 text-black px-5 py-3 rounded-full font-bold"
              >
                Add
              </button>
            </form>

            <div className="flex flex-wrap gap-2 mt-3">
              {popularStockIdeas.map((symbol) => (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => addTickerToDeck(symbol)}
                  className="bg-slate-900 border border-slate-800 text-slate-300 text-xs px-3 py-2 rounded-full hover:border-green-400"
                >
                  {symbol}
                </button>
              ))}
            </div>

            {tickerMessage && (
              <p className="text-xs text-slate-500 mt-3">{tickerMessage}</p>
            )}
          </div>

          <div className="mt-6 bg-[#090d18] border border-slate-800 rounded-2xl p-4">
            <p className="text-sm text-slate-300 font-bold">Browser cache is on</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Stocks and news that load successfully are saved in this browser
              for up to 7 days, so the app can keep working better if the API
              limit is hit.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-[#080c16] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-5 h-8 w-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Loading StockSwipe...</p>
        </div>
      </main>
    );
  }

  if (!currentSymbol) {
    return (
      <main className="min-h-screen bg-[#080c16] text-white overflow-x-hidden">
        <Header />

        <section className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-sm w-full bg-[#0f1320] border border-slate-800 rounded-3xl p-6">
            <h2 className="text-4xl font-bold">No more stocks</h2>

            <p className="text-slate-500 mt-4">
              You have swiped through every stock in the {selectedFilterLabel} deck.
            </p>

            {lastAction && (
              <button
                onClick={undoLastSwipe}
                className="mt-6 border border-slate-700 text-slate-300 px-4 py-2 rounded-full text-sm hover:border-green-400 hover:text-white"
              >
                Undo last swipe: {lastAction.stock.ticker}
              </button>
            )}

            <div className="flex flex-col gap-3 mt-8">
              <button
                onClick={() => setShowFilters(true)}
                className="bg-green-400 text-black px-6 py-3 rounded-full font-bold"
              >
                Change Filter
              </button>

              <button
                onClick={() => setShowLists(true)}
                className="border border-slate-700 text-slate-300 px-6 py-3 rounded-full"
              >
                Open Lists
              </button>

              <button
                onClick={resetApp}
                className="border border-slate-800 text-slate-500 px-6 py-3 rounded-full"
              >
                Reset App
              </button>
            </div>
          </div>
        </section>

        <FilterModal />

        {showLists && (
          <ListsPanel
            liked={liked}
            passed={passed}
            activeTab={activeListTab}
            setActiveTab={setActiveListTab}
            onClose={() => setShowLists(false)}
            onSelectStock={setSelectedStock}
            onReset={resetApp}
            onMoveToWatchlist={moveToWatchlist}
            onMoveToPassed={moveToPassed}
            onRemoveFromList={removeStockFromList}
          />
        )}

        {selectedStock && (
          <StockDetailModal
            stock={selectedStock}
            onClose={() => setSelectedStock(null)}
          />
        )}
      </main>
    );
  }

  if (isFetchingStock) {
    return (
      <main className="min-h-screen bg-[#080c16] text-white overflow-x-hidden">
        <Header />

        <section className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto mb-5 h-10 w-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
            <h2 className="text-2xl font-bold">Fetching stock data...</h2>
            <p className="text-slate-500 mt-2">
              Loading {currentSymbol} from {selectedFilterLabel}
            </p>
          </div>
        </section>

        <FilterModal />

        {showLists && (
          <ListsPanel
            liked={liked}
            passed={passed}
            activeTab={activeListTab}
            setActiveTab={setActiveListTab}
            onClose={() => setShowLists(false)}
            onSelectStock={setSelectedStock}
            onReset={resetApp}
            onMoveToWatchlist={moveToWatchlist}
            onMoveToPassed={moveToPassed}
            onRemoveFromList={removeStockFromList}
          />
        )}
      </main>
    );
  }

  if (fetchError) {
    return (
      <main className="min-h-screen bg-[#080c16] text-white overflow-x-hidden">
        <Header />

        <section className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6">
          <div className="bg-[#0f1320] border border-slate-800 rounded-3xl p-6 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold">
              Could not load {currentSymbol}
            </h2>

            <p className="text-slate-400 mt-4 text-sm">{fetchError}</p>

            <button
              onClick={retryCurrentStock}
              className="mt-6 bg-green-400 text-black px-6 py-3 rounded-full font-bold"
            >
              Try Again
            </button>

            <button
              onClick={passStock}
              className="mt-4 block mx-auto text-slate-500 underline"
            >
              Skip this stock
            </button>
          </div>
        </section>

        <FilterModal />

        {showLists && (
          <ListsPanel
            liked={liked}
            passed={passed}
            activeTab={activeListTab}
            setActiveTab={setActiveListTab}
            onClose={() => setShowLists(false)}
            onSelectStock={setSelectedStock}
            onReset={resetApp}
            onMoveToWatchlist={moveToWatchlist}
            onMoveToPassed={moveToPassed}
            onRemoveFromList={removeStockFromList}
          />
        )}
      </main>
    );
  }

  if (!stock) {
    return null;
  }

  const isPositive = stock.change.startsWith("+");
  const chartPoints = createChartPoints(getChartValues(stock, selectedRange));
  const likeOpacity = Math.min(Math.max(dragX / 120, 0), 1);
  const passOpacity = Math.min(Math.max(-dragX / 120, 0), 1);
  const match = getMatchScore(stock);

  return (
    <main className="min-h-screen bg-[#080c16] text-white overflow-x-hidden">
      <Header />

      <section className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
          <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
            {selectedFilterLabel}
          </span>
          <span>Drag right to like, left to pass</span>
        </div>

        {lastAction && (
          <button
            onClick={undoLastSwipe}
            className="mb-3 border border-slate-700 text-slate-300 px-4 py-2 rounded-full text-sm hover:border-green-400 hover:text-white"
          >
            Undo: {lastAction.stock.ticker}
          </button>
        )}

        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={resetDrag}
          style={{
            transform: `translateX(${dragX}px) rotate(${dragX / 18}deg)`,
            transition: isDragging ? "none" : "transform 0.2s ease",
            touchAction: "pan-y",
          }}
          className="relative bg-[#0f1320] p-5 rounded-3xl w-full max-w-sm text-center shadow-2xl border border-slate-800 select-none cursor-grab active:cursor-grabbing"
        >
          <div
            style={{ opacity: passOpacity }}
            className="absolute left-6 top-8 border-4 border-red-500 text-red-500 px-4 py-2 rounded-xl text-2xl font-black rotate-[-15deg] z-10"
          >
            PASS
          </div>

          <div
            style={{ opacity: likeOpacity }}
            className="absolute right-6 top-8 border-4 border-green-500 text-green-500 px-4 py-2 rounded-xl text-2xl font-black rotate-[15deg] z-10"
          >
            LIKE
          </div>

          <div className="flex justify-between items-center mb-3">
            <p className="text-xs bg-slate-900 text-slate-300 px-3 py-1 rounded-full max-w-[180px] truncate">
              {stock.industry || stock.sector || "Stock"}
            </p>

            <p className="text-xs bg-green-500/20 text-green-300 px-3 py-1 rounded-full">
              {stock.dataSource === "fallback"
                ? "Fallback"
                : stock.dataSource === "cached"
                ? "Cached"
                : "Live"}
            </p>
          </div>

          <div className={`mb-4 rounded-2xl border ${match.bg} ${match.border} p-3`}>
            <p className="text-xs text-slate-400">Match Score</p>
            <div className="flex justify-between items-center">
              <p className={`text-3xl font-black ${match.color}`}>
                {match.score}%
              </p>
              <p className={`text-sm font-bold ${match.color}`}>
                {match.label}
              </p>
            </div>
          </div>

          <h2 className="text-5xl font-black">{stock.ticker}</h2>

          <p className="text-lg mt-2 text-slate-300 line-clamp-1">
            {stock.name}
          </p>

          <div className="flex justify-center items-end gap-4 mt-5">
            <p className="text-3xl font-bold">${stock.price}</p>

            <div className="text-left">
              <p className={isPositive ? "text-green-400" : "text-red-400"}>
                {stock.change}
              </p>

              <p
                className={
                  isPositive
                    ? "text-xs text-green-400"
                    : "text-xs text-red-400"
                }
              >
                {stock.changeDollar || "$0.00"} today
              </p>
            </div>
          </div>

          <div className="mt-5 bg-[#090d18] rounded-2xl p-3">
            <div className="flex justify-between mb-2">
              {ranges.map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedRange(range)}
                  className={
                    selectedRange === range
                      ? "bg-green-400 text-black text-xs px-3 py-1 rounded-full font-bold"
                      : "bg-slate-800 text-slate-400 text-xs px-3 py-1 rounded-full"
                  }
                >
                  {range}
                </button>
              ))}
            </div>

            <svg viewBox="0 0 260 100" className="w-full h-24">
              <polyline
                points={chartPoints}
                fill="none"
                stroke={isPositive ? "#4ade80" : "#f87171"}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 text-left">
            <DataCard compact label="Target" value={stock.analystTargetPrice || "N/A"} />
            <DataCard compact label="EPS" value={stock.eps || "N/A"} />
            <DataCard compact label="Beta" value={stock.beta || "N/A"} />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2 text-left">
            <DataCard compact label="Market Cap" value={stock.marketCap || "N/A"} />
            <DataCard compact label="P/E" value={stock.peRatio || "N/A"} />
            <DataCard compact label="Risk" value={stock.riskLevel || "Research"} />
          </div>

          <div className="mt-4">
            <WeekRangeBar stock={stock} compact />
          </div>

          <button
            onClick={() => setSelectedStock(stock)}
            className="w-full mt-5 border border-slate-700 py-3 rounded-full font-bold text-slate-200 hover:border-slate-500"
          >
            Learn More
          </button>
        </div>

        <div className="flex gap-4 mt-5 justify-center">
          <button
            onClick={passStock}
            className="bg-red-500 hover:bg-red-600 px-8 py-3 rounded-full font-bold shadow-lg"
          >
            Pass
          </button>

          <button
            onClick={likeStock}
            className="bg-green-500 hover:bg-green-600 px-8 py-3 rounded-full font-bold shadow-lg"
          >
            Like
          </button>
        </div>
      </section>

      <FilterModal />

      {showLists && (
        <ListsPanel
          liked={liked}
          passed={passed}
          activeTab={activeListTab}
          setActiveTab={setActiveListTab}
          onClose={() => setShowLists(false)}
          onSelectStock={setSelectedStock}
          onReset={resetApp}
          onMoveToWatchlist={moveToWatchlist}
          onMoveToPassed={moveToPassed}
          onRemoveFromList={removeStockFromList}
        />
      )}

      {selectedStock && (
        <StockDetailModal
          stock={selectedStock}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </main>
  );
}