import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ChartRange = "1D" | "1W" | "1M" | "3M" | "1Y";

type AlphaDailyResponse = {
  "Time Series (Daily)"?: Record<
    string,
    {
      "1. open"?: string;
      "2. high"?: string;
      "3. low"?: string;
      "4. close"?: string;
      "5. volume"?: string;
    }
  >;
  Note?: string;
  Information?: string;
  Error?: string;
};

type ChartResponse = {
  symbol: string;
  dataSource: "live" | "cached" | "fallback";
  chartData: Partial<Record<ChartRange, number[]>>;
  warning?: string;
};

const CACHE_TIME = 1000 * 60 * 60 * 6;
const BLOCK_ALPHA_TIME = 1000 * 60 * 60;

let alphaChartBlockedUntil = 0;

const chartCache = new Map<
  string,
  {
    savedAt: number;
    chart: ChartResponse;
  }
>();

const fallbackBasePrices: Record<string, number> = {
  AAPL: 195,
  MSFT: 420,
  NVDA: 920,
  TSLA: 177,
  AMD: 160,
  GOOGL: 170,
  AMZN: 185,
  META: 500,
  NFLX: 650,
  PLTR: 25,
  SOFI: 8,
  COIN: 220,
  SHOP: 70,
  DIS: 100,
  JPM: 200,
};

function isLimitMessage(data: AlphaDailyResponse) {
  const message = data.Note || data.Information || data.Error || "";

  return (
    message.toLowerCase().includes("api") ||
    message.toLowerCase().includes("limit") ||
    message.toLowerCase().includes("rate") ||
    message.toLowerCase().includes("frequency") ||
    message.toLowerCase().includes("premium")
  );
}

function createFallbackSeries(basePrice: number, isPositive = true) {
  if (isPositive) {
    return {
      "1D": [
        basePrice * 0.985,
        basePrice * 0.99,
        basePrice * 0.988,
        basePrice * 0.996,
        basePrice * 1.002,
        basePrice,
      ],
      "1W": [
        basePrice * 0.96,
        basePrice * 0.97,
        basePrice * 0.965,
        basePrice * 0.985,
        basePrice * 0.995,
        basePrice,
      ],
      "1M": [
        basePrice * 0.92,
        basePrice * 0.94,
        basePrice * 0.935,
        basePrice * 0.965,
        basePrice * 0.985,
        basePrice,
      ],
      "3M": [
        basePrice * 0.88,
        basePrice * 0.9,
        basePrice * 0.93,
        basePrice * 0.95,
        basePrice * 0.98,
        basePrice,
      ],
      "1Y": [
        basePrice * 0.75,
        basePrice * 0.82,
        basePrice * 0.86,
        basePrice * 0.91,
        basePrice * 0.96,
        basePrice,
      ],
    };
  }

  return {
    "1D": [
      basePrice * 1.015,
      basePrice * 1.01,
      basePrice * 1.012,
      basePrice * 1.006,
      basePrice * 1.002,
      basePrice,
    ],
    "1W": [
      basePrice * 1.06,
      basePrice * 1.05,
      basePrice * 1.04,
      basePrice * 1.025,
      basePrice * 1.01,
      basePrice,
    ],
    "1M": [
      basePrice * 1.12,
      basePrice * 1.09,
      basePrice * 1.07,
      basePrice * 1.04,
      basePrice * 1.02,
      basePrice,
    ],
    "3M": [
      basePrice * 1.18,
      basePrice * 1.15,
      basePrice * 1.1,
      basePrice * 1.07,
      basePrice * 1.03,
      basePrice,
    ],
    "1Y": [
      basePrice * 1.25,
      basePrice * 1.2,
      basePrice * 1.15,
      basePrice * 1.1,
      basePrice * 1.05,
      basePrice,
    ],
  };
}

function getFallbackChart(symbol: string, warning?: string): ChartResponse {
  const basePrice = fallbackBasePrices[symbol] || 100;

  return {
    symbol,
    dataSource: "fallback",
    chartData: createFallbackSeries(basePrice, true),
    warning,
  };
}

function sampleEvery(values: number[], targetPoints: number) {
  if (values.length <= targetPoints) return values;

  const result: number[] = [];

  for (let index = 0; index < targetPoints; index++) {
    const sourceIndex = Math.round(
      (index / (targetPoints - 1)) * (values.length - 1)
    );

    result.push(values[sourceIndex]);
  }

  return result;
}

function buildChartRanges(closesNewestFirst: number[]) {
  const closesOldestFirst = [...closesNewestFirst].reverse();

  const last = (days: number, points: number) => {
    const values = closesOldestFirst.slice(Math.max(0, closesOldestFirst.length - days));

    return sampleEvery(values, points).map((value) => Number(value.toFixed(2)));
  };

  return {
    "1D": last(2, 2),
    "1W": last(7, 7),
    "1M": last(22, 10),
    "3M": last(66, 14),
    "1Y": last(100, 20),
  };
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

  const cached = chartCache.get(symbol);

  if (cached && Date.now() - cached.savedAt < CACHE_TIME) {
    return NextResponse.json({
      ...cached.chart,
      dataSource: "cached",
      warning: "Using cached chart data.",
    });
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      getFallbackChart(
        symbol,
        "Missing API key, so fallback chart data is being used."
      )
    );
  }

  if (Date.now() < alphaChartBlockedUntil) {
    return NextResponse.json(
      getFallbackChart(
        symbol,
        "Chart API limit was hit recently, so fallback chart data is being used."
      )
    );
  }

  const chartUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${apiKey}`;

  try {
    const response = await fetch(chartUrl, { cache: "no-store" });
    const data = (await response.json()) as AlphaDailyResponse;

    if (isLimitMessage(data)) {
      alphaChartBlockedUntil = Date.now() + BLOCK_ALPHA_TIME;

      return NextResponse.json(
        getFallbackChart(
          symbol,
          "Chart API limit reached, so fallback chart data is being used."
        )
      );
    }

    const timeSeries = data["Time Series (Daily)"];

    if (!timeSeries) {
      return NextResponse.json(
        getFallbackChart(
          symbol,
          "Live chart data was unavailable, so fallback chart data is being used."
        )
      );
    }

    const datesNewestFirst = Object.keys(timeSeries).sort().reverse();

    const closesNewestFirst = datesNewestFirst
      .map((date) => Number(timeSeries[date]["4. close"]))
      .filter((value) => !Number.isNaN(value) && value > 0);

    if (closesNewestFirst.length < 2) {
      return NextResponse.json(
        getFallbackChart(
          symbol,
          "Not enough live chart points were found, so fallback chart data is being used."
        )
      );
    }

    const chart: ChartResponse = {
      symbol,
      dataSource: "live",
      chartData: buildChartRanges(closesNewestFirst),
    };

    chartCache.set(symbol, {
      savedAt: Date.now(),
      chart,
    });

    return NextResponse.json(chart);
  } catch {
    if (cached) {
      return NextResponse.json({
        ...cached.chart,
        dataSource: "cached",
        warning: "Live chart failed, so cached chart data is being used.",
      });
    }

    return NextResponse.json(
      getFallbackChart(
        symbol,
        "Live chart failed, so fallback chart data is being used."
      )
    );
  }
}