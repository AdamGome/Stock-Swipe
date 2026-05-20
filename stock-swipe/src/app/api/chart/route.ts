import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

type ChartRange = "1D" | "1W" | "1M" | "3M" | "1Y";

type ChartPoint = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type ChartStats = {
  start: number;
  end: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
};

type ChartResponse = {
  symbol: string;
  dataSource: "live" | "cached";
  chartData: Record<ChartRange, number[]>;
  chartPoints: Record<ChartRange, ChartPoint[]>;
  stats: Record<ChartRange, ChartStats>;
  updatedAt: string;
  warning?: string;
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
  return Number.isNaN(numberValue) ? 0 : numberValue;
}

function normalizeTimeSeries(values: unknown): ChartPoint[] {
  if (!Array.isArray(values)) return [];

  return values
    .map((item) => {
      const point = item as {
        datetime?: string;
        open?: string;
        high?: string;
        low?: string;
        close?: string;
        volume?: string;
      };

      return {
        datetime: point.datetime || "",
        open: toNumber(point.open),
        high: toNumber(point.high),
        low: toNumber(point.low),
        close: toNumber(point.close),
        volume: toNumber(point.volume),
      };
    })
    .filter((point) => point.datetime && point.close > 0)
    .reverse();
}

function sliceLast(points: ChartPoint[], count: number) {
  return points.slice(Math.max(points.length - count, 0));
}

function getStats(points: ChartPoint[]): ChartStats {
  if (points.length === 0) {
    return {
      start: 0,
      end: 0,
      high: 0,
      low: 0,
      change: 0,
      changePercent: 0,
    };
  }

  const start = points[0].close;
  const end = points[points.length - 1].close;
  const high = Math.max(...points.map((point) => point.high || point.close));
  const low = Math.min(...points.map((point) => point.low || point.close));
  const change = end - start;
  const changePercent = start === 0 ? 0 : (change / start) * 100;

  return {
    start: Number(start.toFixed(2)),
    end: Number(end.toFixed(2)),
    high: Number(high.toFixed(2)),
    low: Number(low.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
  };
}

function buildChartResponse(
  symbol: string,
  intradayPoints: ChartPoint[],
  dailyPoints: ChartPoint[],
  dataSource: "live" | "cached",
  updatedAt: string,
  warning?: string
): ChartResponse {
  const oneDay =
    intradayPoints.length >= 2
      ? intradayPoints
      : dailyPoints.length >= 2
      ? sliceLast(dailyPoints, 2)
      : dailyPoints;

  const chartPoints: Record<ChartRange, ChartPoint[]> = {
    "1D": oneDay,
    "1W": sliceLast(dailyPoints, 5),
    "1M": sliceLast(dailyPoints, 22),
    "3M": sliceLast(dailyPoints, 66),
    "1Y": sliceLast(dailyPoints, 252),
  };

  const chartData: Record<ChartRange, number[]> = {
    "1D": chartPoints["1D"].map((point) => point.close),
    "1W": chartPoints["1W"].map((point) => point.close),
    "1M": chartPoints["1M"].map((point) => point.close),
    "3M": chartPoints["3M"].map((point) => point.close),
    "1Y": chartPoints["1Y"].map((point) => point.close),
  };

  const stats: Record<ChartRange, ChartStats> = {
    "1D": getStats(chartPoints["1D"]),
    "1W": getStats(chartPoints["1W"]),
    "1M": getStats(chartPoints["1M"]),
    "3M": getStats(chartPoints["3M"]),
    "1Y": getStats(chartPoints["1Y"]),
  };

  return {
    symbol,
    dataSource,
    chartData,
    chartPoints,
    stats,
    updatedAt,
    warning,
  };
}

async function getCachedChart(symbol: string) {
  const { data, error } = await supabaseServer
    .from("stock_cache")
    .select("chart_data, chart_updated_at")
    .eq("symbol", symbol)
    .maybeSingle();

  if (error) {
    console.error("Supabase chart read error:", error.message);
    return null;
  }

  if (!data?.chart_data || !isUpdatedToday(data.chart_updated_at)) {
    return null;
  }

  return {
    ...(data.chart_data as ChartResponse),
    dataSource: "cached" as const,
    warning: "Using shared chart cache from today.",
  };
}

async function getOlderCachedChart(symbol: string) {
  const { data, error } = await supabaseServer
    .from("stock_cache")
    .select("chart_data")
    .eq("symbol", symbol)
    .maybeSingle();

  if (error) {
    console.error("Supabase older chart read error:", error.message);
    return null;
  }

  if (!data?.chart_data) return null;

  return {
    ...(data.chart_data as ChartResponse),
    dataSource: "cached" as const,
    warning:
      "Live chart data is unavailable, so older shared chart cache is being used.",
  };
}

async function saveChartCache(symbol: string, chartResponse: ChartResponse) {
  const now = new Date().toISOString();

  const { error } = await supabaseServer.from("stock_cache").upsert({
    symbol,
    chart_data: chartResponse,
    chart_updated_at: now,
    updated_at: now,
  });

  if (error) {
    console.error("Supabase chart write error:", error.message);
  }
}

async function fetchTimeSeries(symbol: string, interval: string, outputsize: number) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey || apiKey === "your_twelve_data_key_here") {
    throw new Error("Missing Twelve Data API key.");
  }

  const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${apiKey}`;

  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();

  if (data.status === "error") {
    throw new Error(data.message || "Twelve Data chart error.");
  }

  if (!data.values || !Array.isArray(data.values)) {
    throw new Error("No chart values returned.");
  }

  return normalizeTimeSeries(data.values);
}

async function fetchTwelveDataChart(symbol: string): Promise<ChartResponse> {
  const [intradayPoints, dailyPoints] = await Promise.all([
    fetchTimeSeries(symbol, "5min", 78),
    fetchTimeSeries(symbol, "1day", 260),
  ]);

  if (dailyPoints.length < 2 && intradayPoints.length < 2) {
    throw new Error("Not enough chart data returned.");
  }

  return buildChartResponse(
    symbol,
    intradayPoints,
    dailyPoints,
    "live",
    new Date().toISOString()
  );
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
    const cachedChart = await getCachedChart(symbol);

    if (cachedChart) {
      return NextResponse.json(cachedChart);
    }

    const liveChart = await fetchTwelveDataChart(symbol);

    await saveChartCache(symbol, liveChart);

    return NextResponse.json(liveChart);
  } catch (error) {
    console.error("Chart route error:", error);

    const olderCachedChart = await getOlderCachedChart(symbol);

    if (olderCachedChart) {
      return NextResponse.json(olderCachedChart);
    }

    return NextResponse.json(
      {
        error: "Real chart data is unavailable for this symbol right now.",
        symbol,
        dataSource: "unavailable",
      },
      { status: 503 }
    );
  }
}