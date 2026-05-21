"use client";

import Link from "next/link";

export default function PassedPage() {
  return (
    <main className="min-h-screen bg-[#080c16] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#0f1320] border border-slate-800 rounded-3xl p-6 text-center shadow-2xl">
        <div className="mx-auto mb-5 bg-red-500/20 border border-red-500/30 text-red-300 w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black">
          ×
        </div>

        <h1 className="text-3xl font-black">Passed Stocks</h1>

        <p className="text-slate-400 mt-4 leading-relaxed">
          Your passed stocks are managed inside the main StockSwipe app. Open
          the app, tap <span className="text-slate-200 font-bold">Lists</span>,
          then choose <span className="text-red-300 font-bold">Passed</span>.
        </p>

        <Link
          href="/"
          className="block mt-8 bg-green-400 hover:bg-green-300 text-black py-3 rounded-full font-bold transition"
        >
          Back to StockSwipe
        </Link>
      </div>
    </main>
  );
}