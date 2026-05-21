import { NextResponse } from "next/server";

type SwipeStock = {
  ticker?: string;
  sector?: string;
  industry?: string;
  riskLevel?: string;
};

type UniverseStock = {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  tags: string[];
  market_cap_bucket: string;
  risk_bucket: string;
};

type RecommendationItem = UniverseStock & {
  recommendationScore: number;
  reasons: string[];
};

const nicheUniverse: UniverseStock[] = [
  {
    symbol: "RKLB",
    name: "Rocket Lab USA",
    sector: "Industrials",
    industry: "Aerospace & Defense",
    tags: ["space", "growth", "speculative", "small-cap"],
    market_cap_bucket: "small",
    risk_bucket: "high",
  },
  {
    symbol: "IONQ",
    name: "IonQ",
    sector: "Technology",
    industry: "Quantum Computing",
    tags: ["quantum", "tech", "growth", "speculative"],
    market_cap_bucket: "small",
    risk_bucket: "high",
  },
  {
    symbol: "ASTS",
    name: "AST SpaceMobile",
    sector: "Communication Services",
    industry: "Satellite Communications",
    tags: ["space", "satellite", "growth", "speculative"],
    market_cap_bucket: "small",
    risk_bucket: "high",
  },
  {
    symbol: "ACHR",
    name: "Archer Aviation",
    sector: "Industrials",
    industry: "Air Mobility",
    tags: ["evtol", "aviation", "growth", "speculative"],
    market_cap_bucket: "small",
    risk_bucket: "high",
  },
  {
    symbol: "SOFI",
    name: "SoFi Technologies",
    sector: "Financial Services",
    industry: "Fintech",
    tags: ["fintech", "bank", "growth", "speculative"],
    market_cap_bucket: "mid",
    risk_bucket: "medium",
  },
  {
    symbol: "HOOD",
    name: "Robinhood Markets",
    sector: "Financial Services",
    industry: "Capital Markets",
    tags: ["fintech", "crypto", "trading", "growth"],
    market_cap_bucket: "mid",
    risk_bucket: "medium",
  },
  {
    symbol: "COIN",
    name: "Coinbase Global",
    sector: "Financial Services",
    industry: "Crypto Infrastructure",
    tags: ["crypto", "bitcoin", "blockchain", "growth"],
    market_cap_bucket: "large",
    risk_bucket: "high",
  },
  {
    symbol: "MARA",
    name: "MARA Holdings",
    sector: "Financial Services",
    industry: "Bitcoin Mining",
    tags: ["crypto", "bitcoin", "mining", "speculative"],
    market_cap_bucket: "mid",
    risk_bucket: "high",
  },
  {
    symbol: "RIOT",
    name: "Riot Platforms",
    sector: "Financial Services",
    industry: "Bitcoin Mining",
    tags: ["crypto", "bitcoin", "mining", "speculative"],
    market_cap_bucket: "mid",
    risk_bucket: "high",
  },
  {
    symbol: "PLTR",
    name: "Palantir Technologies",
    sector: "Technology",
    industry: "Data Analytics",
    tags: ["ai", "software", "data", "growth"],
    market_cap_bucket: "large",
    risk_bucket: "medium",
  },
  {
    symbol: "SOUN",
    name: "SoundHound AI",
    sector: "Technology",
    industry: "AI Software",
    tags: ["ai", "software", "voice", "speculative"],
    market_cap_bucket: "small",
    risk_bucket: "high",
  },
  {
    symbol: "CRSP",
    name: "CRISPR Therapeutics",
    sector: "Healthcare",
    industry: "Biotechnology",
    tags: ["biotech", "healthcare", "growth", "speculative"],
    market_cap_bucket: "mid",
    risk_bucket: "high",
  },
  {
    symbol: "BEAM",
    name: "Beam Therapeutics",
    sector: "Healthcare",
    industry: "Biotechnology",
    tags: ["biotech", "gene-editing", "healthcare", "speculative"],
    market_cap_bucket: "small",
    risk_bucket: "high",
  },
  {
    symbol: "ENPH",
    name: "Enphase Energy",
    sector: "Energy",
    industry: "Solar Technology",
    tags: ["energy", "solar", "clean-energy", "growth"],
    market_cap_bucket: "mid",
    risk_bucket: "medium",
  },
  {
    symbol: "SEDG",
    name: "SolarEdge Technologies",
    sector: "Energy",
    industry: "Solar Technology",
    tags: ["energy", "solar", "clean-energy", "speculative"],
    market_cap_bucket: "small",
    risk_bucket: "high",
  },
];

function normalize(value?: string) {
  return (value || "").trim().toLowerCase();
}

function getPreferenceWords(stocks: SwipeStock[]) {
  const words = new Set<string>();

  stocks.forEach((stock) => {
    const sector = normalize(stock.sector);
    const industry = normalize(stock.industry);
    const ticker = normalize(stock.ticker);

    if (sector) words.add(sector);
    if (industry) words.add(industry);
    if (ticker) words.add(ticker);

    if (sector.includes("technology")) words.add("tech");
    if (sector.includes("financial")) words.add("fintech");
    if (sector.includes("health")) words.add("healthcare");
    if (sector.includes("energy")) words.add("energy");

    if (industry.includes("semiconductor")) words.add("ai");
    if (industry.includes("software")) words.add("software");
    if (industry.includes("bank")) words.add("bank");
    if (industry.includes("crypto")) words.add("crypto");
  });

  return words;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const likedStocks = (body.likedStocks || []) as SwipeStock[];
    const passedStocks = (body.passedStocks || []) as SwipeStock[];
    const likedSymbols = ((body.likedSymbols || []) as string[]).map((symbol) =>
      symbol.toUpperCase()
    );
    const passedSymbols = ((body.passedSymbols || []) as string[]).map(
      (symbol) => symbol.toUpperCase()
    );
    const seenSymbols = new Set(
      [
        ...likedSymbols,
        ...passedSymbols,
        ...((body.seenSymbols || []) as string[]),
      ].map((symbol) => symbol.toUpperCase())
    );

    const likedWords = getPreferenceWords(likedStocks);
    const passedWords = getPreferenceWords(passedStocks);

    const recommendations: RecommendationItem[] = nicheUniverse
      .filter((stock) => !seenSymbols.has(stock.symbol.toUpperCase()))
      .map((stock) => {
        let score = 50;
        const reasons: string[] = [];

        const searchableWords = [
          stock.sector,
          stock.industry,
          ...stock.tags,
          stock.market_cap_bucket,
          stock.risk_bucket,
        ].map(normalize);

        searchableWords.forEach((word) => {
          if (likedWords.has(word)) {
            score += 12;
          }

          if (passedWords.has(word)) {
            score -= 8;
          }
        });

        if (stock.tags.includes("growth")) {
          score += 8;
          reasons.push("Growth-focused niche company");
        }

        if (stock.tags.includes("speculative")) {
          score += 4;
          reasons.push("Higher-risk idea for research");
        }

        if (stock.tags.includes("ai")) {
          reasons.push("AI-related business");
        }

        if (stock.tags.includes("space")) {
          reasons.push("Space-related business");
        }

        if (stock.tags.includes("crypto")) {
          reasons.push("Crypto-related business");
        }

        if (stock.tags.includes("biotech")) {
          reasons.push("Biotech research idea");
        }

        if (reasons.length === 0) {
          reasons.push(`Similar theme: ${stock.industry}`);
        }

        return {
          ...stock,
          recommendationScore: Math.max(5, Math.min(95, score)),
          reasons,
        };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, Number(body.limit || 12));

    return NextResponse.json({
      recommendations,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create recommendations.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({
    ok: true,
    route: "recommendations",
  });
}