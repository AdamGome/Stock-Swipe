import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

type StockUniverseRow = {
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  tags: string[] | null;
  market_cap_bucket: string | null;
  risk_bucket: string | null;
};

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("stock_universe")
      .select(
        "symbol, name, sector, industry, tags, market_cap_bucket, risk_bucket"
      )
      .eq("is_active", true)
      .order("symbol", { ascending: true });

    if (error) {
      console.error("Universe read error:", error.message);

      return NextResponse.json(
        { error: "Could not load stock universe." },
        { status: 500 }
      );
    }

    const stocks = (data || []).map((row: StockUniverseRow) => ({
      symbol: row.symbol,
      name: row.name || row.symbol,
      sector: row.sector || "Unknown",
      industry: row.industry || "Unknown",
      tags: row.tags || [],
      marketCapBucket: row.market_cap_bucket || "unknown",
      riskBucket: row.risk_bucket || "medium",
    }));

    return NextResponse.json({
      stocks,
      count: stocks.length,
      dataSource: "supabase",
    });
  } catch (error) {
    console.error("Universe route error:", error);

    return NextResponse.json(
      { error: "Could not load stock universe." },
      { status: 500 }
    );
  }
}