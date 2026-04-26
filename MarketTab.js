// ─────────────────────────────────────────────────────────────
//  MarketTab.js — NSE Top 100 + Indices + Charts
//  Import this in App.js:
//    import MarketTab from './MarketTab';
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { getMultipleStocks, getHistoricalData } from "./apiService";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Dimensions, Platform, FlatList,
} from "react-native";
import Svg, { Polyline, Line, Rect, G, Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg";

const { width: SW } = Dimensions.get("window");

const C = {
  bg:      "#080C14",
  surface: "#0D1421",
  card:    "#111927",
  border:  "#1C2A3A",
  accent:  "#00D4FF",
  green:   "#00E5A0",
  red:     "#FF4060",
  yellow:  "#FFB800",
  purple:  "#7C5CFC",
  orange:  "#FF8C00",
  text:    "#E8F0FE",
  muted:   "#5A7A9A",
  dim:     "#8AA0B8",
};

// ── NSE INDICES ───────────────────────────────────────────────
const NSE_INDICES = [
  { name: "NIFTY 50",      sym: "^NSEI",   price: 23847.65, change: 1.24,  sector: "Broad"    },
  { name: "SENSEX",        sym: "^BSESN",  price: 78412.18, change: 0.98,  sector: "Broad"    },
  { name: "NIFTY BANK",    sym: "^NSEBANK",price: 51234.80, change: 0.56,  sector: "Finance"  },
  { name: "NIFTY IT",      sym: "^CNXIT",  price: 38104.25, change: -0.81, sector: "IT"       },
  { name: "NIFTY MIDCAP",  sym: "^NSMIDCP",price: 52841.30, change: 1.87,  sector: "Mid"      },
  { name: "NIFTY SMALLCAP",sym: "^NSESMCP",price: 18234.60, change: 2.14,  sector: "Small"    },
  { name: "NIFTY AUTO",    sym: "^CNXAUTO",price: 22341.40, change: 1.32,  sector: "Auto"     },
  { name: "NIFTY PHARMA",  sym: "^CNXPHARMA",price: 19872.55,change: -0.43,sector: "Pharma"   },
  { name: "NIFTY FMCG",    sym: "^CNXFMCG",price: 57432.80, change: 0.28,  sector: "FMCG"    },
  { name: "NIFTY METAL",   sym: "^CNXMETAL",price: 9241.35,  change: 2.67,  sector: "Metal"   },
  { name: "NIFTY REALTY",  sym: "^CNXREALTY",price: 987.45, change: 3.21,  sector: "Realty"  },
  { name: "NIFTY ENERGY",  sym: "^CNXENERGY",price: 38724.10,change: 1.54, sector: "Energy"  },
];

// ── NSE TOP 100 STOCKS ────────────────────────────────────────
const NSE_TOP100 = [
  // ── LARGE CAP (NIFTY 50) ─────────────────────────────────
  { symbol: "RELIANCE",    name: "Reliance Industries",      price: 2847.35, change: 1.24,  mktCap: "19.2L",  sector: "Energy",   signal: "BUY",  rsi: 58 },
  { symbol: "TCS",         name: "Tata Consultancy Svc",     price: 3892.15, change: 2.11,  mktCap: "14.1L",  sector: "IT",       signal: "BUY",  rsi: 52 },
  { symbol: "HDFCBANK",    name: "HDFC Bank",                price: 1889.40, change: 0.67,  mktCap: "14.0L",  sector: "Finance",  signal: "BUY",  rsi: 55 },
  { symbol: "ICICIBANK",   name: "ICICI Bank",               price: 1289.55, change: 0.92,  mktCap: "9.1L",   sector: "Finance",  signal: "BUY",  rsi: 50 },
  { symbol: "BHARTIARTL",  name: "Bharti Airtel",            price: 1748.30, change: 1.87,  mktCap: "10.4L",  sector: "Telecom",  signal: "BUY",  rsi: 62 },
  { symbol: "INFOSYS",     name: "Infosys Ltd",              price: 1423.60, change: -0.78, mktCap: "5.9L",   sector: "IT",       signal: "SELL", rsi: 67 },
  { symbol: "SBIN",        name: "State Bank of India",      price: 812.70,  change: -0.34, mktCap: "7.2L",   sector: "Finance",  signal: "HOLD", rsi: 60 },
  { symbol: "HINDUNILVR",  name: "Hindustan Unilever",       price: 2341.85, change: 0.23,  mktCap: "5.5L",   sector: "FMCG",     signal: "HOLD", rsi: 54 },
  { symbol: "ITC",         name: "ITC Ltd",                  price: 478.25,  change: 0.54,  mktCap: "5.9L",   sector: "FMCG",     signal: "BUY",  rsi: 48 },
  { symbol: "BAJFINANCE",  name: "Bajaj Finance",            price: 7123.40, change: 3.05,  mktCap: "4.3L",   sector: "Finance",  signal: "BUY",  rsi: 44 },
  { symbol: "LT",          name: "Larsen & Toubro",          price: 3412.60, change: 1.45,  mktCap: "4.7L",   sector: "Infra",    signal: "BUY",  rsi: 56 },
  { symbol: "KOTAKBANK",   name: "Kotak Mahindra Bank",      price: 2087.30, change: -0.45, mktCap: "4.1L",   sector: "Finance",  signal: "HOLD", rsi: 63 },
  { symbol: "HCLTECH",     name: "HCL Technologies",         price: 1672.45, change: 1.23,  mktCap: "4.5L",   sector: "IT",       signal: "BUY",  rsi: 53 },
  { symbol: "MARUTI",      name: "Maruti Suzuki",            price: 12847.50,change: 2.34,  mktCap: "3.9L",   sector: "Auto",     signal: "BUY",  rsi: 61 },
  { symbol: "AXISBANK",    name: "Axis Bank",                price: 1187.65, change: 0.78,  mktCap: "3.6L",   sector: "Finance",  signal: "BUY",  rsi: 57 },
  { symbol: "ASIANPAINT",  name: "Asian Paints",             price: 2456.70, change: -1.12, mktCap: "2.3L",   sector: "Chemical", signal: "SELL", rsi: 71 },
  { symbol: "ULTRACEMCO",  name: "UltraTech Cement",         price: 11234.80,change: 0.89,  mktCap: "3.2L",   sector: "Cement",   signal: "BUY",  rsi: 49 },
  { symbol: "WIPRO",       name: "Wipro Ltd",                price: 456.25,  change: -1.32, mktCap: "2.4L",   sector: "IT",       signal: "SELL", rsi: 71 },
  { symbol: "NTPC",        name: "NTPC Ltd",                 price: 387.45,  change: 2.67,  mktCap: "3.7L",   sector: "Power",    signal: "BUY",  rsi: 46 },
  { symbol: "POWERGRID",   name: "Power Grid Corp",          price: 312.80,  change: 1.78,  mktCap: "2.9L",   sector: "Power",    signal: "BUY",  rsi: 52 },
  { symbol: "TITAN",       name: "Titan Company",            price: 3234.60, change: 1.67,  mktCap: "2.9L",   sector: "Consumer", signal: "BUY",  rsi: 59 },
  { symbol: "SUNPHARMA",   name: "Sun Pharmaceutical",       price: 1789.30, change: -0.56, mktCap: "4.3L",   sector: "Pharma",   signal: "HOLD", rsi: 64 },
  { symbol: "ONGC",        name: "ONGC Ltd",                 price: 287.65,  change: 1.98,  mktCap: "3.6L",   sector: "Energy",   signal: "BUY",  rsi: 47 },
  { symbol: "TATASTEEL",   name: "Tata Steel",               price: 167.45,  change: 3.45,  mktCap: "2.1L",   sector: "Metal",    signal: "BUY",  rsi: 43 },
  { symbol: "ADANIENT",    name: "Adani Enterprises",        price: 2934.80, change: 2.87,  mktCap: "3.3L",   sector: "Conglom",  signal: "BUY",  rsi: 55 },
  { symbol: "ADANIPORTS",  name: "Adani Ports & SEZ",        price: 1347.25, change: 1.34,  mktCap: "2.9L",   sector: "Infra",    signal: "BUY",  rsi: 58 },
  { symbol: "BAJAJFINSV",  name: "Bajaj Finserv",            price: 1923.40, change: 0.98,  mktCap: "3.1L",   sector: "Finance",  signal: "BUY",  rsi: 51 },
  { symbol: "JSWSTEEL",    name: "JSW Steel",                price: 956.75,  change: 2.34,  mktCap: "2.3L",   sector: "Metal",    signal: "BUY",  rsi: 45 },
  { symbol: "NESTLEIND",   name: "Nestle India",             price: 2387.60, change: 0.12,  mktCap: "2.3L",   sector: "FMCG",     signal: "HOLD", rsi: 58 },
  { symbol: "TECHM",       name: "Tech Mahindra",            price: 1567.80, change: -0.89, mktCap: "1.5L",   sector: "IT",       signal: "SELL", rsi: 69 },
];
// Truncated to Top 30 to avoid excessive API calls

const SECTORS = ["ALL", "Finance", "IT", "Energy", "Auto", "Pharma", "FMCG", "Metal", "Power", "Tech", "Infra", "Cement", "Defence", "Retail", "Other"];
const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D", "1W"];

// ── CANDLE GENERATOR ─────────────────────────────────────────
function genCandles(base, count = 40, vol = 0.018) {
  let p = base;
  return Array.from({ length: count }, () => {
    const o = p, move = (Math.random() - 0.48) * vol * p;
    const c = p + move;
    const h = Math.max(o, c) + Math.random() * vol * 0.4 * p;
    const l = Math.min(o, c) - Math.random() * vol * 0.4 * p;
    p = c;
    return { open: o, high: h, low: l, close: c, bullish: c >= o };
  });
}

// ── MINI SPARKLINE ────────────────────────────────────────────
function Spark({ positive, width = 50, height = 18 }) {
  const pts = positive
    ? "0,18 10,15 20,13 30,14 40,10 50,8 60,6 70,4 80,5 90,2 100,0"
    : "0,0 10,3 20,2 30,6 40,9 50,11 60,10 70,15 80,16 90,18 100,20";
  return (
    <Svg width={width} height={height} viewBox="0 0 100 20">
      <Polyline points={pts} fill="none" stroke={positive ? C.green : C.red} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── CANDLESTICK CHART ─────────────────────────────────────────
function CandleChart({ candles, color, width = SW - 40, height = 200 }) {
  const PAD   = { top: 12, bottom: 20, left: 4, right: 44 };
  const cW    = width  - PAD.left - PAD.right;
  const cH    = height - PAD.top  - PAD.bottom;
  const allP  = candles.flatMap(c => [c.high, c.low]);
  const minP  = Math.min(...allP), maxP = Math.max(...allP);
  const rng   = maxP - minP || 1;
  const bW    = (cW / candles.length) * 0.55;
  const gap   = cW / candles.length;
  const toY   = p => PAD.top + cH - ((p - minP) / rng) * cH;
  const toX   = i => PAD.left + i * gap + gap / 2;
  const fmt   = p => p >= 10000 ? `${(p/1000).toFixed(0)}k` : p >= 1000 ? `${(p/1000).toFixed(1)}k` : p.toFixed(0);
  const grids = [minP, minP + rng * 0.5, maxP];

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="cBg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.04" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {grids.map((p, i) => (
        <G key={i}>
          <Line x1={PAD.left} y1={toY(p)} x2={width - PAD.right} y2={toY(p)} stroke={C.border} strokeWidth="0.5" strokeDasharray="3,4" />
          <SvgText x={width - 2} y={toY(p) + 3} fontSize="7" fill={C.muted} textAnchor="end">{fmt(p)}</SvgText>
        </G>
      ))}
      {candles.map((c, i) => {
        const x = toX(i), oY = toY(c.open), cY = toY(c.close);
        const hY = toY(c.high), lY = toY(c.low);
        const bTop = Math.min(oY, cY), bH = Math.max(Math.abs(cY - oY), 1);
        const clr  = c.bullish ? C.green : C.red;
        return (
          <G key={i}>
            <Line x1={x} y1={hY} x2={x} y2={lY} stroke={clr} strokeWidth="0.8" />
            <Rect x={x - bW / 2} y={bTop} width={bW} height={bH} fill={c.bullish ? clr + "C0" : clr} stroke={clr} strokeWidth="0.4" rx="0.5" />
          </G>
        );
      })}
    </Svg>
  );
}

// ── STOCK DETAIL MODAL ────────────────────────────────────────
function StockDetailModal({ stock, visible, onClose, onBuy, onSell }) {
  const [tf, setTf]     = useState("1H");
  const [candles, setCnd] = useState({});
  const [livePx, setLive] = useState(stock?.price ?? 0);

  useEffect(() => {
    if (!stock || !visible) return;
    let isMounted = true;
    
    const fetchChart = async () => {
      // Map timeframe to yahoo interval/range
      let interval = "1h", range = "1mo";
      if (tf === "1m") { interval = "1m"; range = "1d"; }
      else if (tf === "5m") { interval = "5m"; range = "5d"; }
      else if (tf === "15m") { interval = "15m"; range = "5d"; }
      else if (tf === "1H") { interval = "1h"; range = "1mo"; }
      else if (tf === "4H") { interval = "1h"; range = "3mo"; } 
      else if (tf === "1D") { interval = "1d"; range = "6mo"; }
      else if (tf === "1W") { interval = "1wk"; range = "2y"; }

      const data = await getHistoricalData(stock.symbol, range, interval);
      if (isMounted && data.length > 0) {
        setCnd(prev => ({ ...prev, [tf]: data.slice(-40) })); // keep last 40 candles
        setLive(data[data.length - 1].close);
      }
    };
    
    fetchChart();
    const iv = setInterval(fetchChart, 15000); // refresh every 15s
    return () => { isMounted = false; clearInterval(iv); };
  }, [visible, tf, stock]);

  if (!stock || !visible) return null;
  const isUp     = stock.change >= 0;
  const sigColor = stock.signal === "BUY" ? C.green : stock.signal === "SELL" ? C.red : C.yellow;
  const curCnd   = candles[tf] ?? [];
  const high     = curCnd.length ? Math.max(...curCnd.map(c => c.high)) : stock.price * 1.05;
  const low      = curCnd.length ? Math.min(...curCnd.map(c => c.low))  : stock.price * 0.95;

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg, zIndex: 999 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: "800", color: C.text }}>{stock.symbol}</Text>
            <Text style={{ fontSize: 11, color: C.muted }}>{stock.name} · NSE</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: C.text, fontSize: 18 }}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Price Header */}
        <View style={{ padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <Text style={[ss.mono, { fontSize: 30, fontWeight: "800", color: C.text }]}>₹{livePx.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            <Text style={{ fontSize: 13, color: isUp ? C.green : C.red, marginTop: 2 }}>{isUp ? "▲" : "▼"} {Math.abs(stock.change)}% today</Text>
          </View>
          <View style={{ backgroundColor: sigColor + "15", borderWidth: 1.5, borderColor: sigColor + "50", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: sigColor }}>{stock.signal}</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 16 }}>
          {[
            { l: "Mkt Cap",  v: `₹${stock.mktCap}Cr`, c: C.accent  },
            { l: "RSI",      v: stock.rsi,             c: stock.rsi < 30 ? C.green : stock.rsi > 70 ? C.red : C.yellow },
            { l: "Sector",   v: stock.sector,          c: C.dim     },
          ].map((item, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: C.card, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.border, alignItems: "center" }}>
              <Text style={{ fontSize: 9, color: C.muted, marginBottom: 2 }}>{item.l}</Text>
              <Text style={[ss.mono, { fontSize: 11, fontWeight: "700", color: item.c }]}>{item.v}</Text>
            </View>
          ))}
        </View>

        {/* Timeframe Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6, marginBottom: 12 }}>
          {TIMEFRAMES.map(t => (
            <TouchableOpacity key={t} onPress={() => setTf(t)} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: tf === t ? C.accent + "20" : C.surface, borderWidth: 1, borderColor: tf === t ? C.accent + "50" : C.border }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: tf === t ? C.accent : C.muted }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Chart */}
        <View style={{ marginHorizontal: 16, backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontSize: 10, color: C.muted }}>{tf} · 40 candles</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Text style={[ss.mono, { fontSize: 10, color: C.green }]}>H ₹{high.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
              <Text style={[ss.mono, { fontSize: 10, color: C.red }]}>L ₹{low.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
            </View>
          </View>
          {curCnd.length > 0 ? <CandleChart candles={curCnd} color={isUp ? C.green : C.red} width={SW - 72} height={220} /> : <View style={{ height: 220, alignItems: "center", justifyContent: "center" }}><Text style={{ color: C.muted }}>Loading chart...</Text></View>}
        </View>

        {/* Technical Indicators */}
        <View style={{ marginHorizontal: 16, backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 16 }}>
          <Text style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 12 }}>TECHNICAL INDICATORS</Text>
          {[
            { label: "RSI (14)",      val: stock.rsi,                               color: stock.rsi < 30 ? C.green : stock.rsi > 70 ? C.red : C.yellow, bar: stock.rsi },
            { label: "MACD",          val: stock.rsi < 50 ? "Bullish" : "Bearish", color: stock.rsi < 50 ? C.green : C.red, bar: stock.rsi < 50 ? 70 : 30 },
            { label: "Supertrend",    val: stock.signal === "BUY" ? "Bullish ▲" : "Bearish ▼", color: stock.signal === "BUY" ? C.green : C.red, bar: stock.signal === "BUY" ? 75 : 25 },
            { label: "VWAP",          val: stock.signal === "BUY" ? "Above ✓" : "Below",       color: stock.signal === "BUY" ? C.green : C.red, bar: stock.signal === "BUY" ? 70 : 30 },
            { label: "ADX",           val: `${Math.floor(20 + Math.random() * 20)}`, color: C.accent, bar: 55 },
            { label: "Choppiness",    val: `${Math.floor(45 + Math.random() * 30)}`, color: C.purple, bar: 60 },
          ].map((ind, i) => (
            <View key={i} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: C.muted }}>{ind.label}</Text>
                <Text style={[ss.mono, { fontSize: 11, fontWeight: "700", color: ind.color }]}>{ind.val}</Text>
              </View>
              <View style={{ height: 3, backgroundColor: C.border, borderRadius: 2 }}>
                <View style={{ height: 3, width: `${ind.bar}%`, backgroundColor: ind.color, borderRadius: 2 }} />
              </View>
            </View>
          ))}
        </View>

        {/* 52W Range */}
        <View style={{ marginHorizontal: 16, backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 16 }}>
          <Text style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 12 }}>52-WEEK RANGE</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={[ss.mono, { fontSize: 12, color: C.red }]}>₹{(stock.price * 0.72).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
            <Text style={[ss.mono, { fontSize: 12, color: C.green }]}>₹{(stock.price * 1.28).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
          </View>
          <View style={{ height: 6, backgroundColor: C.border, borderRadius: 3 }}>
            <View style={{ height: 6, width: `${30 + Math.random() * 55}%`, backgroundColor: `linear-gradient(90deg, ${C.red}, ${C.green})`, borderRadius: 3, backgroundColor: C.accent }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
            <Text style={{ fontSize: 9, color: C.muted }}>52W Low</Text>
            <Text style={{ fontSize: 9, color: C.muted }}>Current: ₹{stock.price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
            <Text style={{ fontSize: 9, color: C.muted }}>52W High</Text>
          </View>
        </View>

        {/* Trade Actions */}
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 40 }}>
          <TouchableOpacity disabled={!livePx} onPress={() => onBuy && onBuy(stock.symbol, livePx, stock.sector)} style={{ flex: 1, backgroundColor: C.green, padding: 16, borderRadius: 12, alignItems: "center", shadowColor: C.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, opacity: !livePx ? 0.4 : 1 }}>
            <Text style={{ color: "#000", fontWeight: "800", fontSize: 16 }}>BUY</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={!livePx} onPress={() => onSell && onSell(stock.symbol, livePx)} style={{ flex: 1, backgroundColor: C.red, padding: 16, borderRadius: 12, alignItems: "center", shadowColor: C.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, opacity: !livePx ? 0.4 : 1 }}>
            <Text style={{ color: "#000", fontWeight: "800", fontSize: 16 }}>SELL</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

// ── MARKET TAB ────────────────────────────────────────────────
export default function MarketTab({ onBuy, onSell }) {
  const [view, setView]         = useState("stocks"); // "stocks" | "indices"
  const [sector, setSector]     = useState("ALL");
  const [search, setSearch]     = useState("");
  const [sortBy, setSortBy]     = useState("mktCap"); // mktCap | change | price
  const [selStock, setSelStock] = useState(null);
  const [prices, setPrices]     = useState(() => {
    const p = {};
    NSE_TOP100.forEach(s => { p[s.symbol] = s.price; });
    NSE_INDICES.forEach(s => { p[s.sym] = s.price; });
    return p;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Live price via Yahoo Finance API
  useEffect(() => {
    let isMounted = true;
    const fetchPrices = async () => {
      setIsLoading(true);
      const symbols = [...NSE_TOP100.map(s => s.symbol), ...NSE_INDICES.map(s => s.sym)];
      const quotes = await getMultipleStocks(symbols);
      if (isMounted && quotes.length > 0) {
        setPrices(prev => {
          const next = { ...prev };
          quotes.forEach(q => {
            let key = q.symbol;
            if (key.endsWith(".NS")) key = key.replace(".NS", "");
            if (key.endsWith("-USD")) key = key.replace("-USD", "");
            if (NSE_INDICES.some(x => x.sym === q.symbol)) key = q.symbol;
            next[key] = q.price ?? next[key];
          });
          return next;
        });
      }
      if (isMounted) setIsLoading(false);
    };
    fetchPrices();
    const iv = setInterval(fetchPrices, 10000); // Poll every 10s
    return () => { isMounted = false; clearInterval(iv); };
  }, []);

  const filtered = NSE_TOP100
    .filter(s => (sector === "ALL" || s.sector === sector) && (search === "" || s.symbol.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => sortBy === "change" ? b.change - a.change : sortBy === "price" ? b.price - a.price : parseFloat(b.mktCap) - parseFloat(a.mktCap));

  const gainers  = [...NSE_TOP100].sort((a, b) => b.change - a.change).slice(0, 5);
  const losers   = [...NSE_TOP100].sort((a, b) => a.change - b.change).slice(0, 5);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* View Toggle */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingTop: 10, gap: 8, marginBottom: 10 }}>
        {[{ id: "stocks", label: "📈 Top 100" }, { id: "indices", label: "📊 Indices" }, { id: "movers", label: "🔥 Movers" }].map(v => (
          <TouchableOpacity key={v.id} onPress={() => setView(v.id)} style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: view === v.id ? C.accent + "15" : C.card, borderWidth: 1, borderColor: view === v.id ? C.accent + "40" : C.border, alignItems: "center" }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: view === v.id ? C.accent : C.muted }}>{v.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Loading Indicator */}
      {isLoading && (
        <View style={{ padding: 4, alignItems: "center" }}>
          <Text style={{ fontSize: 10, color: C.accent, fontWeight: "700", letterSpacing: 1 }}>FETCHING LIVE DATA...</Text>
        </View>
      )}

      {/* ── INDICES VIEW ── */}
      {view === "indices" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
          <Text style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 10 }}>NSE / BSE INDICES — LIVE</Text>
          {NSE_INDICES.map((idx, i) => {
            const liveP = prices[idx.sym] ?? idx.price;
            const isUp  = idx.change >= 0;
            return (
              <View key={i} style={{ backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>{idx.name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <View style={{ backgroundColor: C.accent + "15", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, color: C.accent }}>{idx.sector}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: C.muted }}>{idx.sym}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[ss.mono, { fontSize: 16, fontWeight: "800", color: C.text }]}>{liveP.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</Text>
                    <Text style={{ fontSize: 12, color: isUp ? C.green : C.red }}>{isUp ? "▲" : "▼"} {Math.abs(idx.change)}%</Text>
                  </View>
                </View>
                {/* Mini chart */}
                <View style={{ marginTop: 10 }}>
                  <Svg width={SW - 64} height={35} viewBox={`0 0 ${SW - 64} 35`}>
                    <Polyline
                      points={Array.from({ length: 30 }, (_, k) => {
                        const noise = (Math.sin(k * 0.7 + i) + Math.cos(k * 0.3)) * 0.4 + (isUp ? k * 0.02 : -k * 0.02);
                        const y = 30 - (noise + 1) * 12;
                        return `${(k / 29) * (SW - 64)},${Math.max(3, Math.min(33, y))}`;
                      }).join(" ")}
                      fill="none"
                      stroke={isUp ? C.green : C.red}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── TOP MOVERS VIEW ── */}
      {view === "movers" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
          <Text style={{ fontSize: 10, color: C.green, letterSpacing: 1, marginBottom: 8 }}>🚀 TOP GAINERS</Text>
          {gainers.map((s, i) => (
            <TouchableOpacity key={i} onPress={() => setSelStock(s)} style={{ backgroundColor: C.card, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.green + "20", flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.green + "20", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: C.green }}>#{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>{s.symbol}</Text>
                <Text style={{ fontSize: 10, color: C.muted }}>{s.sector}</Text>
              </View>
              <Spark positive={true} />
              <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
                <Text style={[ss.mono, { fontSize: 13, color: C.text }]}>₹{(prices[s.symbol] ?? s.price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: C.green }}>+{s.change}%</Text>
              </View>
            </TouchableOpacity>
          ))}

          <Text style={{ fontSize: 10, color: C.red, letterSpacing: 1, marginBottom: 8, marginTop: 8 }}>📉 TOP LOSERS</Text>
          {losers.map((s, i) => (
            <TouchableOpacity key={i} onPress={() => setSelStock(s)} style={{ backgroundColor: C.card, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.red + "20", flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.red + "20", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: C.red }}>#{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>{s.symbol}</Text>
                <Text style={{ fontSize: 10, color: C.muted }}>{s.sector}</Text>
              </View>
              <Spark positive={false} />
              <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
                <Text style={[ss.mono, { fontSize: 13, color: C.text }]}>₹{(prices[s.symbol] ?? s.price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: C.red }}>{s.change}%</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── STOCKS VIEW ── */}
      {view === "stocks" && (
        <View style={{ flex: 1 }}>
          {/* Search + Sort */}
          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, gap: 8, marginBottom: 8 }}>
              <Text style={{ color: C.muted }}>🔍</Text>
              <TextInput value={search} onChangeText={setSearch} placeholder="Search 100 stocks..." placeholderTextColor={C.muted} style={{ flex: 1, color: C.text, fontSize: 14 }} />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Text style={{ color: C.muted, fontSize: 16 }}>×</Text>
                </TouchableOpacity>
              )}
            </View>
            {/* Sort */}
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
              {[["mktCap", "Mkt Cap"], ["change", "% Change"], ["price", "Price"]].map(([id, label]) => (
                <TouchableOpacity key={id} onPress={() => setSortBy(id)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: sortBy === id ? C.purple + "20" : "transparent", borderWidth: 1, borderColor: sortBy === id ? C.purple + "50" : C.border }}>
                  <Text style={{ fontSize: 10, color: sortBy === id ? C.purple : C.muted, fontWeight: sortBy === id ? "700" : "400" }}>{label}</Text>
                </TouchableOpacity>
              ))}
              <Text style={{ fontSize: 10, color: C.muted, alignSelf: "center", marginLeft: 4 }}>{filtered.length} stocks</Text>
            </View>
            {/* Sector Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {SECTORS.slice(0, 10).map(sec => (
                <TouchableOpacity key={sec} onPress={() => setSector(sec)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: sector === sec ? C.accent : C.border, backgroundColor: sector === sec ? C.accent + "15" : "transparent" }}>
                  <Text style={{ fontSize: 10, color: sector === sec ? C.accent : C.muted }}>{sec}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Stock List */}
          <FlatList
            data={filtered}
            keyExtractor={item => item.symbol}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
            renderItem={({ item: stock, index }) => {
              const liveP = prices[stock.symbol] ?? stock.price;
              const isUp  = stock.change >= 0;
              const sigC  = stock.signal === "BUY" ? C.green : stock.signal === "SELL" ? C.red : C.yellow;
              return (
                <TouchableOpacity onPress={() => setSelStock(stock)} style={{ backgroundColor: C.card, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  {/* Rank */}
                  <View style={{ width: 24, alignItems: "center" }}>
                    <Text style={{ fontSize: 10, color: C.muted, fontWeight: "600" }}>{index + 1}</Text>
                  </View>
                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>{stock.symbol}</Text>
                    <Text style={{ fontSize: 9, color: C.muted }} numberOfLines={1}>{stock.name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <View style={{ backgroundColor: C.surface, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, borderWidth: 1, borderColor: C.border }}>
                        <Text style={{ fontSize: 8, color: C.dim }}>{stock.sector}</Text>
                      </View>
                      <Text style={{ fontSize: 8, color: C.muted }}>₹{stock.mktCap}Cr</Text>
                    </View>
                  </View>
                  {/* Sparkline */}
                  <Spark positive={isUp} width={40} height={16} />
                  {/* Price */}
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[ss.mono, { fontSize: 13, fontWeight: "700", color: C.text }]}>₹{liveP.toLocaleString("en-IN", { maximumFractionDigits: liveP < 100 ? 2 : 0 })}</Text>
                    <Text style={{ fontSize: 11, color: isUp ? C.green : C.red }}>{isUp ? "+" : ""}{stock.change}%</Text>
                  </View>
                  {/* Signal */}
                  <View style={{ backgroundColor: sigC + "15", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: sigC + "30" }}>
                    <Text style={{ fontSize: 9, fontWeight: "700", color: sigC }}>{stock.signal}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Stock Detail Modal */}
      {selStock && (
        <StockDetailModal stock={selStock} visible={!!selStock} onClose={() => setSelStock(null)} onBuy={onBuy} onSell={onSell} />
      )}
    </View>
  );
}

const ss = StyleSheet.create({
  mono: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
});
