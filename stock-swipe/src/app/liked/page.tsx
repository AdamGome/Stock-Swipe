"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ChartRange = "1D" | "1W" | "1M" | "3M" | "1Y";

type Stock = {
  ticker: string;
  name: string;
  price: number;
  change: string;
  sector?: string;
  marketCap?: string;
  peRatio?: string;
  volume?: string;
  riskLevel?: string;
  summary?: string;
  breakdown?: string;
  chartData?: Record<ChartRange, number[]>;
  changeDollar?: string;
  previousClose?: string;
  latestTradingDay?: string;
  dataSource?: "live" | "cached" | "fallback";
  warning?: string;
};

const ranges: ChartRange[] = ["1D", "1W", "1M", "3M", "1Y"];

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

function getChartValues(stock: Stock, selectedRange: ChartRange) {
  if (stock.chartData?.[selectedRange]) {
    return stock.chartData[selectedRange];
  }

  return [
    stock.price * 0.95,
    stock.price * 0.97,
    stock.price * 0.96,
    stock.price * 0.99,
    stock.price * 1.01,
    stock.price,
  ];
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
  const chartValues = getChartValues(stock, selectedRange);
  const chartPoints = createChartPoints(chartValues);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl max-w-md w-full p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-4xl font-bold">{stock.ticker}</h2>
            <p className="text-zinc-300 mt-1">{stock.name}</p>
          </div>

          <button
            onClick={onClose}
            className="bg-zinc-800 px-4 py-2 rounded-full"
          >
            X
          </button>
        </div>

        <div className="mt-6 bg-zinc-950 rounded-2xl p-4">
          <div className="flex justify-between mb-3">
            {ranges.map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={
                  selectedRange === range
                    ? "bg-white text-black text-xs px-3 py-1 rounded-full font-bold"
                    : "bg-zinc-800 text-zinc-400 text-xs px-3 py-1 rounded-full"
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
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-zinc-800 rounded-2xl p-4">
            <p className="text-xs text-zinc-400">Price</p>
            <p className="text-xl font-bold">${stock.price}</p>
          </div>

          <div className="bg-zinc-800 rounded-2xl p-4">
            <p className="text-xs text-zinc-400">Change</p>
            <p
              className={
                isPositive
                  ? "text-xl font-bold text-green-400"
                  : "text-xl font-bold text-red-400"
              }
            >
              {stock.change}
            </p>
          </div>

          <div className="bg-zinc-800 rounded-2xl p-4">
            <p className="text-xs text-zinc-400">Market Cap</p>
            <p className="text-xl font-bold">{stock.marketCap || "Sample"}</p>
          </div>

          <div className="bg-zinc-800 rounded-2xl p-4">
            <p className="text-xs text-zinc-400">Risk</p>
            <p className="text-xl font-bold">{stock.riskLevel || "Medium"}</p>
          </div>
        </div>

        <div className="bg-zinc-800 rounded-2xl p-4 mt-5">
          <p className="text-sm text-zinc-400 mb-2">
            Beginner-friendly breakdown
          </p>

          <p className="text-zinc-200 leading-relaxed">
            {stock.breakdown ||
              stock.summary ||
              "This saved stock does not have a full breakdown yet. Later, we will connect AI so the app can generate a deeper company explanation automatically."}
          </p>
        </div>

        <p className="text-xs text-zinc-500 mt-4">
          This is educational sample information, not financial advice.
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

export default function LikedPage() {
  const [liked, setLiked] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  useEffect(() => {
    const savedLiked = JSON.parse(localStorage.getItem("likedStocks") || "[]");
    setLiked(savedLiked);
  }, []);

  function clearLiked() {
    localStorage.removeItem("likedStocks");
    setLiked([]);
    setSelectedStock(null);
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        <Link href="/" className="text-zinc-300 underline">
          ← Back to swiping
        </Link>

        <h1 className="text-4xl font-bold mt-8">Liked Stocks</h1>

        <p className="text-zinc-400 mt-2">
          These are the stocks you swiped right on.
        </p>

        {liked.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mt-8">
            <p className="text-zinc-300">No liked stocks yet.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {liked.map((stock, index) => {
              const isPositive = stock.change.startsWith("+");

              return (
                <div
                  key={`${stock.ticker}-${index}`}
                  className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-3xl font-bold">{stock.ticker}</h2>
                      <p className="text-zinc-300">{stock.name}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold">${stock.price}</p>
                      <p className={isPositive ? "text-green-400" : "text-red-400"}>
                        {stock.change}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-400 mt-4">
                    {stock.sector || "Stock"}
                  </p>

                  <p className="text-sm text-zinc-200 mt-2">
                    {stock.summary || "Tap details to learn more."}
                  </p>

                  <button
                    onClick={() => setSelectedStock(stock)}
                    className="w-full mt-4 bg-green-500 hover:bg-green-600 py-3 rounded-full font-bold"
                  >
                    View Full Breakdown
                  </button>

                  <a
                    href={`https://finance.yahoo.com/quote/${stock.ticker}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-center mt-4 text-blue-400 underline"
                  >
                    Open on Yahoo Finance
                  </a>
                </div>
              );
            })}
          </div>
        )}

        {liked.length > 0 && (
          <button
            onClick={clearLiked}
            className="mt-8 border border-zinc-700 px-5 py-3 rounded-full text-zinc-300"
          >
            Clear liked list
          </button>
        )}
      </div>

      {selectedStock && (
        <StockDetailModal
          stock={selectedStock}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </main>
  );
}