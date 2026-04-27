const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "https://trading-backend-14u5.onrender.com";
export const QUOTE_URL = `${API_BASE_URL}/api/quotes`;
export const CHART_URL = `${API_BASE_URL}/api/chart`;

const CRYPTO_SYMBOLS = ["BTC", "ETH", "USDT", "BNB", "XRP", "SOL", "ADA"];
const INDICES_MAPPING = {
  "^NSEI": "^NSEI",
  "^BSESN": "^BSESN",
  "^NSEBANK": "^NSEBANK",
  "^CNXIT": "^CNXIT",
  "^NSMIDCP": "^NSMIDCP",
  "^NSESMCP": "^NSESMCP",
  "^CNXAUTO": "^CNXAUTO",
  "^CNXPHARMA": "^CNXPHARMA",
  "^CNXFMCG": "^CNXFMCG",
  "^CNXMETAL": "^CNXMETAL",
  "^CNXREALTY": "^CNXREALTY",
  "^CNXENERGY": "^CNXENERGY",
};

const CACHE_DURATION_MS = 10000; // 10 seconds cache duration
const cache = {
  quote: {},
  historical: {}
};

// Safe default values if API fails/missing
const defaultQuote = (symbol) => ({
  symbol,
  regularMarketPrice: 0,
  regularMarketChange: 0,
  regularMarketChangePercent: 0,
  price: 0,
  change: 0,
  changePercent: 0,
});

export function formatSymbol(symbol) {
  if (!symbol) return "";
  const sym = symbol.toUpperCase();
  if (INDICES_MAPPING[sym]) return INDICES_MAPPING[sym];
  if (CRYPTO_SYMBOLS.includes(sym)) return `${sym}-USD`;
  if (sym.includes("-USD") || sym.includes(".NS")) return sym;
  return `${sym}.NS`; // default to Indian stock
}

export async function getStockQuote(symbol) {
  try {
    const formatted = formatSymbol(symbol);
    const now = Date.now();
    
    // Check cache
    if (cache.quote[formatted] && now - cache.quote[formatted].time < CACHE_DURATION_MS) {
      return cache.quote[formatted].data;
    }

    const res = await fetch(`${QUOTE_URL}?symbols=${formatted}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    const result = data.quoteResponse?.result?.[0] || defaultQuote(symbol);
    
    // Polyfill generic keys to easily attach default fields requested
    result.price = result.regularMarketPrice || 0;
    result.change = result.regularMarketChange || 0;
    result.changePercent = result.regularMarketChangePercent || 0;

    cache.quote[formatted] = { time: now, data: result };
    return result;
  } catch (error) {
    console.error(`getStockQuote error for ${symbol}:`, error);
    return defaultQuote(symbol);
  }
}

export async function getMultipleStocks(symbols) {
  try {
    if (!symbols || symbols.length === 0) return [];
    
    const formattedSymbolsList = Array.from(new Set(symbols.map(formatSymbol)));
    const cacheKey = formattedSymbolsList.slice().sort().join(",");
    const now = Date.now();
    
    // Check cache
    if (cache.quote[cacheKey] && now - cache.quote[cacheKey].time < CACHE_DURATION_MS) {
      return cache.quote[cacheKey].data;
    }

    const res = await fetch(`${QUOTE_URL}?symbols=${cacheKey}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    const results = data.quoteResponse?.result || [];
    
    const mappedResults = formattedSymbolsList.map(sym => {
       const found = results.find(r => r.symbol === sym) || defaultQuote(sym);
       found.price = found.regularMarketPrice || 0;
       found.change = found.regularMarketChange || 0;
       found.changePercent = found.regularMarketChangePercent || 0;
       return found;
    });

    cache.quote[cacheKey] = { time: now, data: mappedResults };
    return mappedResults;
  } catch (error) {
    console.error("getMultipleStocks error:", error);
    return symbols.map(defaultQuote);
  }
}

export async function getHistoricalData(symbol, range = "3mo", interval = "1d") {
  try {
    const formatted = formatSymbol(symbol);
    const cacheKey = `${formatted}_${range}_${interval}`;
    const now = Date.now();

    // Check cache
    if (cache.historical[cacheKey] && now - cache.historical[cacheKey].time < CACHE_DURATION_MS) {
      return cache.historical[cacheKey].data;
    }

    const res = await fetch(`${CHART_URL}/${formatted}?range=${range}&interval=${interval}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    const result = data.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const { open, high, low, close, volume } = quote;

    const formattedData = timestamps.map((ts, i) => ({
      timestamp: ts * 1000,
      open: open[i] || 0,
      high: high[i] || 0,
      low: low[i] || 0,
      close: close[i] || 0,
      volume: volume?.[i] || 0,
      bullish: (close[i] || 0) >= (open[i] || 0)
    })).filter(c => c.close > 0); // Strip dead data points

    cache.historical[cacheKey] = { time: now, data: formattedData };
    return formattedData;
  } catch (error) {
    console.error(`getHistoricalData error for ${symbol}:`, error);
    return [];
  }
}
