import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AlphaNewsItem = {
  title?: string;
  url?: string;
  source?: string;
  time_published?: string;
  summary?: string;
  overall_sentiment_label?: string;
  overall_sentiment_score?: number;
};

type AlphaNewsResponse = {
  feed?: AlphaNewsItem[];
  Note?: string;
  Information?: string;
  Error?: string;
};

type NewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  sentiment: string;
};

const CACHE_TIME = 1000 * 60 * 60 * 6;
const BLOCK_ALPHA_TIME = 1000 * 60 * 60;

let alphaNewsBlockedUntil = 0;

const newsCache = new Map<
  string,
  {
    savedAt: number;
    news: NewsItem[];
  }
>();

const fallbackNews: Record<string, NewsItem[]> = {
  AAPL: [
    {
      title: "Apple investors watch iPhone demand and services growth",
      url: "https://finance.yahoo.com/quote/AAPL",
      source: "Fallback",
      publishedAt: "Sample",
      summary:
        "Apple is often followed for iPhone sales, services revenue, margins, and new product launches.",
      sentiment: "Neutral",
    },
    {
      title: "Apple services business remains a key long-term focus",
      url: "https://finance.yahoo.com/quote/AAPL",
      source: "Fallback",
      publishedAt: "Sample",
      summary:
        "Services can help Apple create recurring revenue beyond hardware sales.",
      sentiment: "Neutral",
    },
  ],
  MSFT: [
    {
      title: "Microsoft cloud and AI growth remain key investor themes",
      url: "https://finance.yahoo.com/quote/MSFT",
      source: "Fallback",
      publishedAt: "Sample",
      summary:
        "Investors often watch Azure growth, AI tools, enterprise software demand, and margins.",
      sentiment: "Neutral",
    },
  ],
  NVDA: [
    {
      title: "NVIDIA remains closely tied to AI chip demand",
      url: "https://finance.yahoo.com/quote/NVDA",
      source: "Fallback",
      publishedAt: "Sample",
      summary:
        "NVIDIA is watched for data center revenue, AI chip demand, supply, and competition.",
      sentiment: "Neutral",
    },
  ],
  TSLA: [
    {
      title: "Tesla investors watch deliveries, margins, and EV competition",
      url: "https://finance.yahoo.com/quote/TSLA",
      source: "Fallback",
      publishedAt: "Sample",
      summary:
        "Tesla often moves on delivery numbers, pricing, margin pressure, and self-driving updates.",
      sentiment: "Neutral",
    },
  ],
  AMD: [
    {
      title: "AMD investors watch data center and AI chip progress",
      url: "https://finance.yahoo.com/quote/AMD",
      source: "Fallback",
      publishedAt: "Sample",
      summary:
        "AMD is followed for server chips, AI products, PC demand, and competition with NVIDIA and Intel.",
      sentiment: "Neutral",
    },
  ],
};

function isLimitMessage(data: AlphaNewsResponse) {
  const message = data.Note || data.Information || data.Error || "";

  return (
    message.toLowerCase().includes("api") ||
    message.toLowerCase().includes("limit") ||
    message.toLowerCase().includes("rate") ||
    message.toLowerCase().includes("frequency")
  );
}

function getFallbackNews(symbol: string): NewsItem[] {
  return (
    fallbackNews[symbol] || [
      {
        title: `${symbol} news is unavailable right now`,
        url: `https://finance.yahoo.com/quote/${symbol}`,
        source: "Fallback",
        publishedAt: "Sample",
        summary:
          "Live news is unavailable right now. Use Yahoo Finance to check the latest company headlines.",
        sentiment: "Neutral",
      },
    ]
  );
}

function formatAlphaDate(value?: string) {
  if (!value) return "Unknown";

  if (value.length < 8) return value;

  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);

  return `${year}-${month}-${day}`;
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

  const cached = newsCache.get(symbol);

  if (cached && Date.now() - cached.savedAt < CACHE_TIME) {
    return NextResponse.json({
      symbol,
      dataSource: "cached",
      news: cached.news,
    });
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      symbol,
      dataSource: "fallback",
      warning: "Missing API key, so fallback news is being used.",
      news: getFallbackNews(symbol),
    });
  }

  if (Date.now() < alphaNewsBlockedUntil) {
    return NextResponse.json({
      symbol,
      dataSource: "fallback",
      warning: "News API limit was hit recently, so fallback news is being used.",
      news: getFallbackNews(symbol),
    });
  }

  const newsUrl = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&limit=6&apikey=${apiKey}`;

  try {
    const response = await fetch(newsUrl, { cache: "no-store" });
    const data = (await response.json()) as AlphaNewsResponse;

    if (isLimitMessage(data)) {
      alphaNewsBlockedUntil = Date.now() + BLOCK_ALPHA_TIME;

      return NextResponse.json({
        symbol,
        dataSource: "fallback",
        warning: "News API limit reached, so fallback news is being used.",
        news: getFallbackNews(symbol),
      });
    }

    const feed = data.feed || [];

    const news = feed.slice(0, 5).map((item) => ({
      title: item.title || "Untitled news item",
      url: item.url || `https://finance.yahoo.com/quote/${symbol}`,
      source: item.source || "Unknown source",
      publishedAt: formatAlphaDate(item.time_published),
      summary: item.summary || "No summary available.",
      sentiment: item.overall_sentiment_label || "Neutral",
    }));

    if (news.length === 0) {
      return NextResponse.json({
        symbol,
        dataSource: "fallback",
        warning: "No live news was found, so fallback news is being used.",
        news: getFallbackNews(symbol),
      });
    }

    newsCache.set(symbol, {
      savedAt: Date.now(),
      news,
    });

    return NextResponse.json({
      symbol,
      dataSource: "live",
      news,
    });
  } catch {
    if (cached) {
      return NextResponse.json({
        symbol,
        dataSource: "cached",
        warning: "Live news failed, so cached news is being used.",
        news: cached.news,
      });
    }

    return NextResponse.json({
      symbol,
      dataSource: "fallback",
      warning: "Live news failed, so fallback news is being used.",
      news: getFallbackNews(symbol),
    });
  }
}