// ─────────────────────────────────────────────────────────────
//  Trade Mobile — React Native (Expo)
//  v2 — Crypto (BTC/ETH) + Multi-timeframe Charts added
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MarketTab from "./MarketTab";
import MLPredictionTab from './MLPredictionTab';
import { getMultipleStocks } from "./apiService";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Dimensions, Modal, StatusBar,
  KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator,
} from "react-native";
import Svg, {
  Path, Line, Circle, Polyline, Rect,
  Defs, LinearGradient, Stop, G, Text as SvgText,
} from "react-native-svg";

const { width: SW, height: SH } = Dimensions.get("window");

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



// ── DATA ──────────────────────────────────────────────────────
const stockData = [
  { symbol: "RELIANCE",   price: 2847.35, change: 1.24,  signal: "BUY",  confidence: 87, rsi: 58, macd: "Bullish", sector: "Energy"  },
  { symbol: "INFY",       price: 1423.60, change: -0.78, signal: "SELL", confidence: 73, rsi: 67, macd: "Bearish", sector: "IT"      },
  { symbol: "TCS",        price: 3892.15, change: 2.11,  signal: "BUY",  confidence: 91, rsi: 52, macd: "Bullish", sector: "IT"      },
  { symbol: "HDFC",       price: 1674.80, change: 0.45,  signal: "BUY",  confidence: 68, rsi: 55, macd: "Neutral", sector: "Finance" },
  { symbol: "WIPRO",      price: 456.25,  change: -1.32, signal: "SELL", confidence: 79, rsi: 71, macd: "Bearish", sector: "IT"      },
  { symbol: "BAJFINANCE", price: 7123.40, change: 3.05,  signal: "BUY",  confidence: 94, rsi: 44, macd: "Bullish", sector: "Finance" },
  { symbol: "ICICIBANK",  price: 1089.55, change: 0.92,  signal: "BUY",  confidence: 82, rsi: 50, macd: "Bullish", sector: "Finance" },
  { symbol: "SBIN",       price: 812.70,  change: -0.34, signal: "HOLD", confidence: 55, rsi: 60, macd: "Neutral", sector: "Finance" },
];

const indices = [
  { name: "NIFTY 50",   value: "23,847.65", pct: "+0.66%", pos: true  },
  { name: "SENSEX",     value: "78,412.18", pct: "+0.66%", pos: true  },
  { name: "NIFTY BANK", value: "51,234.80", pct: "+0.56%", pos: true  },
  { name: "NIFTY IT",   value: "38,104.25", pct: "-0.81%", pos: false },
];

const DEFAULT_PORTFOLIO = [
  { symbol: "RELIANCE",   qty: 10, avg: 2710, ltp: 2847.35, pnl: 1373.5,  pct: 5.07,  sector: "Energy"  },
  { symbol: "TCS",        qty: 5,  avg: 3750, ltp: 3892.15, pnl: 710.75,  pct: 3.79,  sector: "IT"      },
  { symbol: "BAJFINANCE", qty: 3,  avg: 6890, ltp: 7123.40, pnl: 700.2,   pct: 3.39,  sector: "Finance" },
  { symbol: "WIPRO",      qty: 20, avg: 480,  ltp: 456.25,  pnl: -475.0,  pct: -4.95, sector: "IT"      },
];

// ── CRYPTO ────────────────────────────────────────────────────
const CRYPTO_BASE = {
  BTC: { name: "Bitcoin",  symbol: "BTC", price: 83240.50, change: 2.34,  color: C.orange, icon: "₿" },
  ETH: { name: "Ethereum", symbol: "ETH", price: 1587.20,  change: -1.12, color: C.purple, icon: "Ξ" },
};

function generateCandles(basePrice, count, volatility = 0.02) {
  const candles = [];
  let price = basePrice;
  for (let i = 0; i < count; i++) {
    const open  = price;
    const move  = (Math.random() - 0.48) * volatility * price;
    const close = price + move;
    const high  = Math.max(open, close) + Math.random() * volatility * 0.5 * price;
    const low   = Math.min(open, close) - Math.random() * volatility * 0.5 * price;
    candles.push({ open, high, low, close, bullish: close >= open });
    price = close;
  }
  return candles;
}

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D", "1W"];

const CANDLE_DATA = {
  BTC: {
    "1m":  generateCandles(83240, 40, 0.003),
    "5m":  generateCandles(83240, 40, 0.006),
    "15m": generateCandles(83240, 40, 0.010),
    "1H":  generateCandles(83240, 40, 0.018),
    "4H":  generateCandles(83240, 40, 0.030),
    "1D":  generateCandles(83240, 40, 0.050),
    "1W":  generateCandles(83240, 40, 0.090),
  },
  ETH: {
    "1m":  generateCandles(1587, 40, 0.003),
    "5m":  generateCandles(1587, 40, 0.007),
    "15m": generateCandles(1587, 40, 0.012),
    "1H":  generateCandles(1587, 40, 0.020),
    "4H":  generateCandles(1587, 40, 0.035),
    "1D":  generateCandles(1587, 40, 0.055),
    "1W":  generateCandles(1587, 40, 0.095),
  },
};

// ── ATOMS ─────────────────────────────────────────────────────
function GlowDot({ color, size = 8 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: size }} />
  );
}

function Badge({ text, type }) {
  const color = type === "BUY" ? C.green : type === "SELL" ? C.red : C.yellow;
  return (
    <View style={{ backgroundColor: color + "18", borderWidth: 1, borderColor: color + "40", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ fontSize: 10, fontWeight: "700", color, letterSpacing: 1, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}>{text}</Text>
    </View>
  );
}

function SentimentGauge({ value = 68 }) {
  const angle  = -90 + (value / 100) * 180;
  const r      = 50;
  const needleX = 60 + r * Math.cos((angle * Math.PI) / 180);
  const needleY = 60 + r * Math.sin((angle * Math.PI) / 180);
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={120} height={70} viewBox="0 0 120 70">
        <Defs>
          <LinearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%"   stopColor={C.red}    />
            <Stop offset="50%"  stopColor={C.yellow} />
            <Stop offset="100%" stopColor={C.green}  />
          </LinearGradient>
        </Defs>
        <Path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke={C.border} strokeWidth="8" strokeLinecap="round" />
        <Path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="url(#g1)" strokeWidth="6" strokeLinecap="round" />
        <Line x1="60" y1="60" x2={needleX} y2={needleY} stroke={C.accent} strokeWidth="2" strokeLinecap="round" />
        <Circle cx="60" cy="60" r="4" fill={C.accent} />
      </Svg>
      <Text style={{ fontSize: 12, fontWeight: "700", color: C.green, marginTop: -4 }}>BULLISH</Text>
      <Text style={{ fontSize: 10, color: C.muted }}>{value}% confidence</Text>
    </View>
  );
}

function MiniSparkline({ positive }) {
  const pts   = positive ? "0,20 10,18 20,15 30,16 40,12 50,10 60,8 70,5 80,6 90,3 100,0" : "0,0 10,3 20,2 30,6 40,8 50,10 60,9 70,14 80,15 90,18 100,20";
  const color = positive ? C.green : C.red;
  return (
    <Svg width={60} height={20} viewBox="0 0 100 20" opacity={0.8}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── CANDLESTICK CHART ─────────────────────────────────────────
function CandlestickChart({ candles, color, width = SW - 32, height = 200 }) {
  const PAD = { top: 16, bottom: 24, left: 8, right: 40 };
  const chartW = width - PAD.left - PAD.right;
  const chartH = height - PAD.top - PAD.bottom;

  const allP  = candles.flatMap(c => [c.high, c.low]);
  const minP  = Math.min(...allP);
  const maxP  = Math.max(...allP);
  const range = maxP - minP || 1;

  const candleW = (chartW / candles.length) * 0.55;
  const gap     = chartW / candles.length;
  const toY     = (p) => PAD.top + chartH - ((p - minP) / range) * chartH;
  const toX     = (i) => PAD.left + i * gap + gap / 2;

  const fmt = (p) => p >= 1000 ? `${(p / 1000).toFixed(1)}k` : p.toFixed(0);
  const gridPrices = [minP, minP + range * 0.5, maxP];

  return (
    <Svg width={width} height={height}>
      {/* Grid */}
      {gridPrices.map((p, i) => (
        <G key={i}>
          <Line x1={PAD.left} y1={toY(p)} x2={width - PAD.right} y2={toY(p)} stroke={C.border} strokeWidth="0.5" strokeDasharray="3,4" />
          <SvgText x={width - 4} y={toY(p) + 3} fontSize="7" fill={C.muted} textAnchor="end">{fmt(p)}</SvgText>
        </G>
      ))}
      {/* Candles */}
      {candles.map((c, i) => {
        const x       = toX(i);
        const openY   = toY(c.open);
        const closeY  = toY(c.close);
        const highY   = toY(c.high);
        const lowY    = toY(c.low);
        const bodyTop = Math.min(openY, closeY);
        const bodyH   = Math.max(Math.abs(closeY - openY), 1);
        const clr     = c.bullish ? C.green : C.red;
        return (
          <G key={i}>
            <Line x1={x} y1={highY} x2={x} y2={lowY} stroke={clr} strokeWidth="0.8" />
            <Rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={c.bullish ? clr + "CC" : clr} stroke={clr} strokeWidth="0.5" rx="0.5" />
          </G>
        );
      })}
    </Svg>
  );
}

// ── CRYPTO TAB ────────────────────────────────────────────────
function CryptoTab() {
  const [selected, setSelected]     = useState("BTC");
  const [timeframe, setTimeframe]   = useState("1H");
  const [cryptoPrices, setCryptoPrices] = useState({ ...CRYPTO_BASE });
  const [candles, setCandles]       = useState(CANDLE_DATA);

  useEffect(() => {
    let isMounted = true;
    const fetchCrypto = async () => {
      const quotes = await getMultipleStocks(["BTC-USD", "ETH-USD"]);
      if (!isMounted || !quotes.length) return;
      
      setCryptoPrices(prev => {
        const next = { ...prev };
        quotes.forEach(q => {
          const sym = q.symbol.replace("-USD", "");
          if (next[sym]) {
            next[sym] = { ...next[sym], price: q.price || next[sym].price, change: parseFloat((q.changePercent || 0).toFixed(2)) };
          }
        });
        return next;
      });
    };
    fetchCrypto();
    const interval = setInterval(fetchCrypto, 10000); // Poll via Yahoo Finance
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  const coin    = cryptoPrices[selected];
  const clr     = coin.color;
  const isUp    = coin.change > 0;
  const curCandles = candles[selected][timeframe];
  const lastC   = curCandles.slice(-1)[0];
  const high24  = Math.max(...curCandles.map(c => c.high));
  const low24   = Math.min(...curCandles.map(c => c.low));

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Coin Toggle */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 10, marginBottom: 14 }}>
        {["BTC", "ETH"].map(id => {
          const cd     = cryptoPrices[id];
          const active = selected === id;
          return (
            <TouchableOpacity key={id} onPress={() => setSelected(id)} style={[s.card, { flex: 1, padding: 14, borderColor: active ? cd.color + "50" : C.border, backgroundColor: active ? cd.color + "08" : C.card }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: cd.color + "20", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 14, color: cd.color, fontWeight: "800" }}>{cd.icon}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: C.text }}>{cd.symbol}</Text>
                  <Text style={{ fontSize: 9, color: C.muted }}>{cd.name}</Text>
                </View>
              </View>
              <Text style={[s.mono, { fontSize: 15, fontWeight: "800", color: C.text }]}>${cd.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              <Text style={{ fontSize: 11, color: cd.change > 0 ? C.green : C.red, marginTop: 2 }}>{cd.change > 0 ? "▲" : "▼"} {Math.abs(cd.change)}%</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Chart Card */}
      <View style={[s.card, { marginHorizontal: 16, marginBottom: 14, padding: 14 }]}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <GlowDot color={clr} size={8} />
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>{selected}/USDT</Text>
            </View>
            <Text style={[s.mono, { fontSize: 22, fontWeight: "800", color: C.text, marginTop: 2 }]}>${lastC.close.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            <Text style={{ fontSize: 12, color: isUp ? C.green : C.red }}>{isUp ? "▲" : "▼"} {Math.abs(coin.change)}% {timeframe}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 9, color: C.muted }}>24H HIGH</Text>
            <Text style={[s.mono, { fontSize: 12, color: C.green }]}>${high24.toLocaleString("en-US", { maximumFractionDigits: 0 })}</Text>
            <Text style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>24H LOW</Text>
            <Text style={[s.mono, { fontSize: 12, color: C.red }]}>${low24.toLocaleString("en-US", { maximumFractionDigits: 0 })}</Text>
          </View>
        </View>

        {/* Timeframe Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12 }}>
          {TIMEFRAMES.map(tf => (
            <TouchableOpacity key={tf} onPress={() => setTimeframe(tf)} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: timeframe === tf ? clr + "20" : C.surface, borderWidth: 1, borderColor: timeframe === tf ? clr + "50" : C.border }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: timeframe === tf ? clr : C.muted }}>{tf}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Chart */}
        <CandlestickChart candles={curCandles} color={clr} width={SW - 64} height={220} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
          <Text style={{ fontSize: 9, color: C.muted }}>VOL 24H: ${selected === "BTC" ? "28.4B" : "12.1B"}</Text>
          <Text style={{ fontSize: 9, color: C.muted }}>40 candles · {timeframe}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 14 }}>
        {[
          { label: "Market Cap", val: selected === "BTC" ? "$1.64T" : "$191B", color: C.accent  },
          { label: "24H Vol",    val: selected === "BTC" ? "$28.4B" : "$12.1B",color: C.yellow  },
          { label: "Dominance",  val: selected === "BTC" ? "54.2%"  : "8.4%",  color: clr       },
        ].map((stat, i) => (
          <View key={i} style={[s.card, { flex: 1, padding: 10, alignItems: "center" }]}>
            <Text style={{ fontSize: 9, color: C.muted, marginBottom: 3 }}>{stat.label}</Text>
            <Text style={[s.mono, { fontSize: 12, fontWeight: "700", color: stat.color }]}>{stat.val}</Text>
          </View>
        ))}
      </View>

      {/* Fear & Greed */}
      <View style={[s.card, { marginHorizontal: 16, padding: 14, marginBottom: 14 }]}>
        <Text style={[s.label, { marginBottom: 10 }]}>CRYPTO FEAR & GREED INDEX</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ alignItems: "center" }}>
            <Text style={[s.mono, { fontSize: 36, fontWeight: "800", color: C.green }]}>62</Text>
            <Text style={{ fontSize: 11, fontWeight: "700", color: C.green }}>Greed</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ height: 8, backgroundColor: C.border, borderRadius: 4, marginBottom: 6 }}>
              <View style={{ height: 8, width: "62%", borderRadius: 4, backgroundColor: C.green }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 9, color: C.red }}>Fear</Text>
              <Text style={{ fontSize: 9, color: C.muted }}>Neutral</Text>
              <Text style={{ fontSize: 9, color: C.green }}>Greed</Text>
            </View>
          </View>
        </View>
      </View>

      {/* AI Signal */}
      <View style={[s.card, { marginHorizontal: 16, padding: 14, marginBottom: 14, borderColor: clr + "30" }]}>
        <Text style={[s.label, { marginBottom: 10 }]}>AI SIGNAL — {selected}</Text>
        {[
          { label: "Signal",     val: selected === "BTC" ? "BUY"     : "SELL",    color: selected === "BTC" ? C.green : C.red },
          { label: "Confidence", val: selected === "BTC" ? "82%"     : "71%",     color: clr      },
          { label: "RSI",        val: selected === "BTC" ? "48"      : "63",      color: C.text   },
          { label: "MACD",       val: selected === "BTC" ? "Bullish" : "Bearish", color: selected === "BTC" ? C.green : C.red },
          { label: "Support",    val: selected === "BTC" ? "$81,200" : "$1,520",  color: C.green  },
          { label: "Resistance", val: selected === "BTC" ? "$85,400" : "$1,650",  color: C.red    },
        ].map((item, i, arr) => (
          <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
            <Text style={{ fontSize: 12, color: C.muted }}>{item.label}</Text>
            <Text style={[s.mono, { fontSize: 12, fontWeight: "700", color: item.color }]}>{item.val}</Text>
          </View>
        ))}
      </View>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ── LOGIN SCREEN ──────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr]   = useState("");

  const handleLogin = async () => {
    if (user.toLowerCase() === "admin" && pass === "1234") {
      setErr("");
      await AsyncStorage.setItem("auth_token", "dummy_token");
      onLogin();
    } else {
      setErr("Invalid username or password");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", padding: 32 }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={{ alignItems: "center", marginBottom: 40 }}>
        <Text style={{ fontSize: 64, marginBottom: 10 }}>⚡</Text>
        <Text style={{ fontSize: 24, fontWeight: "800", color: C.text, letterSpacing: 1 }}>ANTIGRAVITY TRADE</Text>
        <Text style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>High Frequency Edge Dashboard</Text>
      </View>
      <View style={{ backgroundColor: C.card, padding: 24, borderRadius: 16, borderWidth: 1, borderColor: C.border }}>
        <Text style={[s.label, { marginBottom: 8 }]}>USERNAME</Text>
        <TextInput 
          value={user} onChangeText={setUser} placeholder="Enter admin" placeholderTextColor={C.dim} 
          style={{ backgroundColor: C.surface, color: C.text, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: err ? C.red : C.border, marginBottom: 16, fontSize: 14 }}
          autoCapitalize="none"
        />
        <Text style={[s.label, { marginBottom: 8 }]}>PASSWORD</Text>
        <TextInput 
          value={pass} onChangeText={setPass} placeholder="Enter 1234" placeholderTextColor={C.dim} secureTextEntry 
          style={{ backgroundColor: C.surface, color: C.text, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: err ? C.red : C.border, marginBottom: 20, fontSize: 14 }}
        />
        {err ? <Text style={{ color: C.red, fontSize: 12, marginBottom: 20, textAlign: "center", fontWeight: "600" }}>{err}</Text> : null}
        
        <TouchableOpacity onPress={handleLogin} style={{ backgroundColor: C.accent, padding: 16, borderRadius: 10, alignItems: "center", shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
          <Text style={{ color: "#000", fontWeight: "800", fontSize: 15, letterSpacing: 1 }}>SECURE LOGIN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── HOME TAB ──────────────────────────────────────────────────
function HomeTab() {
  const [activeIdx, setActiveIdx] = useState(0);
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
        {indices.map((idx, i) => (
          <TouchableOpacity key={i} onPress={() => setActiveIdx(i)} style={[s.card, { minWidth: 130, padding: 12, borderColor: activeIdx === i ? C.accent + "40" : C.border, backgroundColor: activeIdx === i ? C.accent + "10" : C.card }]}>
            <Text style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 4 }}>{idx.name}</Text>
            <Text style={[s.mono, { fontSize: 14, fontWeight: "700", color: C.text }]}>{idx.value}</Text>
            <Text style={{ fontSize: 11, color: idx.pos ? C.green : C.red, marginTop: 2 }}>{idx.pct}</Text>
          </TouchableOpacity>
        ))}
        {[CRYPTO_BASE.BTC, CRYPTO_BASE.ETH].map((coin, i) => (
          <View key={i} style={[s.card, { minWidth: 130, padding: 12, borderColor: coin.color + "30" }]}>
            <Text style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 4 }}>{coin.name} {coin.icon}</Text>
            <Text style={[s.mono, { fontSize: 14, fontWeight: "700", color: C.text }]}>${coin.price.toLocaleString()}</Text>
            <Text style={{ fontSize: 11, color: coin.change > 0 ? C.green : C.red, marginTop: 2 }}>{coin.change > 0 ? "+" : ""}{coin.change}%</Text>
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <View style={[s.card, { flex: 1, padding: 14 }]}>
          <Text style={s.label}>MARKET SENTIMENT</Text>
          <SentimentGauge value={68} />
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          {[
            { label: "Active Signals", val: "14",    color: C.green  },
            { label: "Buy / Sell",     val: "9 / 5", color: C.accent },
            { label: "Avg Confidence", val: "81%",   color: C.purple },
          ].map((stat, i) => (
            <View key={i} style={[s.card, { flex: 1, padding: 10 }]}>
              <Text style={s.label}>{stat.label}</Text>
              <Text style={[s.mono, { fontSize: 16, fontWeight: "700", color: stat.color }]}>{stat.val}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <Text style={[s.label, { marginBottom: 10 }]}>TOP MOVERS</Text>
        {stockData.slice(0, 4).map((stock, i) => (
          <View key={i} style={[s.card, { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, marginBottom: 8 }]}>
            <GlowDot color={stock.change > 0 ? C.green : C.red} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>{stock.symbol}</Text>
              <Text style={{ fontSize: 10, color: C.muted }}>{stock.sector}</Text>
            </View>
            <MiniSparkline positive={stock.change > 0} />
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[s.mono, { fontSize: 13, fontWeight: "600", color: C.text }]}>₹{stock.price.toLocaleString()}</Text>
              <Text style={{ fontSize: 11, color: stock.change > 0 ? C.green : C.red }}>{stock.change > 0 ? "+" : ""}{stock.change}%</Text>
            </View>
            <Badge text={stock.signal} type={stock.signal} />
          </View>
        ))}
      </View>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ── SIGNALS TAB ───────────────────────────────────────────────
function SignalsTab() {
  const [idx, setIdx]           = useState(0);
  const [showSheet, setShowSheet] = useState(false);
  const signals = stockData.filter(s => s.signal !== "HOLD");
  const stock   = signals[idx];
  const isBuy   = stock.signal === "BUY";
  const color   = isBuy ? C.green : C.red;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <Text style={s.label}>AI SIGNALS</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Badge text="BUY 8" type="BUY" /><Badge text="SELL 4" type="SELL" />
        </View>
      </View>
      <View style={[s.card, { margin: 16, padding: 24, borderColor: color + "30" }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20 }}>
          <View>
            <Text style={s.label}>SIGNAL {idx + 1}/{signals.length}</Text>
            <Text style={{ fontSize: 28, fontWeight: "800", color: C.text, letterSpacing: -1 }}>{stock.symbol}</Text>
            <Text style={{ fontSize: 12, color: C.muted }}>{stock.sector} · NSE</Text>
          </View>
          <View style={{ backgroundColor: color + "15", borderWidth: 2, borderColor: color + "40", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, justifyContent: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color }}>{stock.signal}</Text>
          </View>
        </View>
        <Text style={[s.mono, { fontSize: 26, fontWeight: "700", color: C.text }]}>₹{stock.price.toLocaleString()}</Text>
        <Text style={{ fontSize: 13, color: stock.change > 0 ? C.green : C.red, marginBottom: 16 }}>{stock.change > 0 ? "▲" : "▼"} {Math.abs(stock.change)}%</Text>
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={s.label}>CONFIDENCE</Text>
            <Text style={{ fontSize: 13, fontWeight: "700", color }}>{stock.confidence}%</Text>
          </View>
          <View style={{ height: 6, backgroundColor: C.border, borderRadius: 3 }}>
            <View style={{ height: 6, width: `${stock.confidence}%`, backgroundColor: color, borderRadius: 3 }} />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {[{ l: "RSI", v: stock.rsi }, { l: "MACD", v: stock.macd }, { l: "MA", v: isBuy ? "Golden" : "Death" }].map((d, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: C.bg + "80", borderRadius: 8, padding: 8, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 9, color: C.muted }}>{d.l}</Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: C.text }}>{d.v}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity onPress={() => setShowSheet(true)} style={{ backgroundColor: color + "15", borderWidth: 1, borderColor: color + "40", borderRadius: 12, padding: 12, alignItems: "center" }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color }}>📊 Technical Breakdown →</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => setIdx((idx - 1 + signals.length) % signals.length)} style={[s.card, { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }]}>
          <Text style={{ color: C.text }}>←</Text>
        </TouchableOpacity>
        {signals.map((_, i) => <View key={i} style={{ width: i === idx ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: i === idx ? color : C.border }} />)}
        <TouchableOpacity onPress={() => setIdx((idx + 1) % signals.length)} style={[s.card, { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }]}>
          <Text style={{ color: C.text }}>→</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={showSheet} transparent animationType="slide" onRequestClose={() => setShowSheet(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "#00000080" }} activeOpacity={1} onPress={() => setShowSheet(false)}>
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border }}>
            <View style={{ width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />
            <Text style={{ fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 16 }}>Breakdown — {stock.symbol}</Text>
            {[
              { indicator: "RSI (14)",    value: stock.rsi,  bar: stock.rsi,                          note: stock.rsi < 50 ? "Oversold zone" : "Overbought" },
              { indicator: "MACD Signal", value: stock.macd, bar: stock.macd === "Bullish" ? 72 : 28, note: stock.macd === "Bullish" ? "Above zero" : "Below zero" },
              { indicator: "MA Cross",    value: isBuy ? "Golden" : "Death", bar: isBuy ? 80 : 20,   note: isBuy ? "20-EMA above 50-EMA" : "Below 50-EMA" },
            ].map((item, i) => (
              <View key={i} style={[s.card, { padding: 12, marginBottom: 10 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, color: C.muted }}>{item.indicator}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color }}>{item.value}</Text>
                </View>
                <View style={{ height: 4, backgroundColor: C.border, borderRadius: 2, marginBottom: 6 }}>
                  <View style={{ height: 4, width: `${item.bar}%`, backgroundColor: color, borderRadius: 2 }} />
                </View>
                <Text style={{ fontSize: 11, color: C.dim }}>{item.note}</Text>
              </View>
            ))}
            <TouchableOpacity onPress={() => setShowSheet(false)} style={{ backgroundColor: color, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#000" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

// ── SCREENER TAB ──────────────────────────────────────────────
function ScreenerTab() {
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("ALL");
  const [expanded, setExpanded] = useState(null);
  const sectors  = ["ALL", "IT", "Finance", "Energy"];
  const filtered = stockData.filter(s => (filter === "ALL" || s.sector === filter) && s.symbol.toLowerCase().includes(search.toLowerCase()));
  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, paddingBottom: 8, backgroundColor: C.bg }}>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
          <Text style={{ color: C.muted }}>🔍</Text>
          <TextInput value={search} onChangeText={setSearch} placeholder="Search stocks..." placeholderTextColor={C.muted} style={{ flex: 1, color: C.text, fontSize: 14 }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 10, gap: 8 }}>
          {sectors.map(sec => (
            <TouchableOpacity key={sec} onPress={() => setFilter(sec)} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: filter === sec ? C.accent : C.border, backgroundColor: filter === sec ? C.accent + "15" : "transparent" }}>
              <Text style={{ fontSize: 12, color: filter === sec ? C.accent : C.muted }}>{sec}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {filtered.map((stock, i) => (
          <View key={i}>
            <TouchableOpacity onPress={() => setExpanded(expanded === i ? null : i)} style={[s.card, { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, marginBottom: expanded === i ? 0 : 8 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>{stock.symbol}</Text>
                <Text style={{ fontSize: 10, color: C.muted }}>{stock.sector}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[s.mono, { fontSize: 13, color: C.text }]}>₹{stock.price.toLocaleString()}</Text>
                <Text style={{ fontSize: 11, color: stock.change > 0 ? C.green : C.red }}>{stock.change > 0 ? "+" : ""}{stock.change}%</Text>
              </View>
              <Badge text={stock.signal} type={stock.signal} />
            </TouchableOpacity>
            {expanded === i && (
              <View style={[s.card, { padding: 12, marginBottom: 8, flexDirection: "row", flexWrap: "wrap", gap: 4 }]}>
                {[["RSI", stock.rsi], ["Volume", "4.2M"], ["52W H", `₹${(stock.price*1.18).toFixed(0)}`], ["MACD", stock.macd], ["Mkt Cap", "₹12T"], ["52W L", `₹${(stock.price*0.78).toFixed(0)}`]].map(([l, v], j) => (
                  <View key={j} style={{ width: "30%", alignItems: "center", paddingVertical: 4 }}>
                    <Text style={{ fontSize: 9, color: C.muted }}>{l}</Text>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: C.text }}>{v}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// ── PORTFOLIO TAB ─────────────────────────────────────────────
function PortfolioTab({ portfolio, onSell }) {
  const totalInvestment = portfolio.reduce((a, s) => a + s.qty * s.avg, 0);
  const totalValue = portfolio.reduce((a, s) => a + s.qty * s.ltp, 0);
  const totalPnl   = totalValue - totalInvestment;
  const totalPct   = totalInvestment > 0 ? (totalPnl / totalInvestment) * 100 : 0;
  
  const sectors = {};
  portfolio.forEach(s => { sectors[s.sector] = (sectors[s.sector] || 0) + s.qty * s.ltp; });
  const sectorColors = [C.accent, C.purple, C.green, C.yellow];
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
      <View style={[s.card, { padding: 18, marginBottom: 16, borderColor: totalPnl >= 0 ? C.green + "30" : C.red + "30", backgroundColor: totalPnl >= 0 ? C.green + "05" : C.red + "05" }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <Text style={s.label}>CURRENT VALUE</Text>
            <Text style={[s.mono, { fontSize: 28, fontWeight: "800", color: C.text, marginTop: 2 }]}>₹{totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.label}>INVESTED</Text>
            <Text style={[s.mono, { fontSize: 16, fontWeight: "600", color: C.muted, marginTop: 2 }]}>₹{totalInvestment.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
          </View>
        </View>
        
        <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 13, color: C.muted }}>Total Profit & Loss</Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[s.mono, { fontSize: 18, fontWeight: "700", color: totalPnl >= 0 ? C.green : C.red }]}>{totalPnl >= 0 ? "+" : "-"}₹{Math.abs(totalPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
            <Text style={{ fontSize: 12, color: totalPnl >= 0 ? C.green : C.red, fontWeight: "600" }}>{totalPct >= 0 ? "▲" : "▼"} {Math.abs(totalPct).toFixed(2)}%</Text>
          </View>
        </View>
      </View>
      <View style={[s.card, { padding: 14, marginBottom: 16 }]}>
        <Text style={[s.label, { marginBottom: 12 }]}>SECTOR ALLOCATION</Text>
        <View style={{ flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 10 }}>
          {Object.entries(sectors).map(([_, val], i) => <View key={i} style={{ flex: val, backgroundColor: sectorColors[i] }} />)}
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {Object.entries(sectors).map(([name], i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: sectorColors[i] }} />
              <Text style={{ fontSize: 10, color: C.muted }}>{name}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={[s.label, { marginBottom: 10 }]}>HOLDINGS</Text>
      {portfolio.map((stock, i) => (
        <View key={i} style={[s.card, { padding: 12, marginBottom: 8 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>{stock.symbol}</Text>
              <Text style={{ fontSize: 10, color: C.muted }}>{stock.qty} shares · Avg ₹{stock.avg}</Text>
            </View>
            <View style={{ alignItems: "flex-end", flexDirection: "row", gap: 10 }}>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 13, color: C.text }}>₹{(stock.qty * stock.ltp).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
                <Text style={{ fontSize: 11, color: stock.pnl > 0 ? C.green : C.red }}>{stock.pnl > 0 ? "+" : ""}₹{stock.pnl.toFixed(0)} ({stock.pct > 0 ? "+" : ""}{stock.pct}%)</Text>
              </View>
              <TouchableOpacity onPress={() => onSell && onSell(stock.symbol, stock.ltp)} style={{ backgroundColor: C.red + "15", borderWidth: 1, borderColor: C.red + "30", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, justifyContent: "center" }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: C.red }}>SELL</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ height: 3, backgroundColor: C.border, borderRadius: 2 }}>
            <View style={{ height: 3, width: `${Math.min(100, Math.abs(stock.pct) * 5)}%`, backgroundColor: stock.pnl > 0 ? C.green : C.red, borderRadius: 2 }} />
          </View>
        </View>
      ))}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ── RISK TAB ──────────────────────────────────────────────────
function RiskTab() {
  const [capital, setCapital] = useState(100000);
  const [risk, setRisk]       = useState(2);
  const [entry, setEntry]     = useState(1423);
  const [sl, setSl]           = useState(1380);
  const posSize = Math.floor((capital * risk / 100) / Math.max(1, entry - sl));
  const riskAmt = capital * risk / 100;

  const Stepper = ({ label, val, set, step, min = 0, max = 999999 }) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={[s.label, { marginBottom: 6 }]}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TouchableOpacity onPress={() => set(Math.max(min, val - step))} style={[s.card, { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" }]}>
          <Text style={{ color: C.text, fontSize: 18 }}>−</Text>
        </TouchableOpacity>
        <Text style={[s.mono, { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: C.text }]}>
          {label.includes("₹") ? `₹${val.toLocaleString()}` : val}
        </Text>
        <TouchableOpacity onPress={() => set(Math.min(max, val + step))} style={[s.card, { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" }]}>
          <Text style={{ color: C.text, fontSize: 18 }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
      {[{ icon: "⚠️", msg: "High IT concentration (42%)", color: C.yellow }, { icon: "ℹ️", msg: "3 positions near stop-loss", color: C.accent }].map((a, i) => (
        <View key={i} style={{ backgroundColor: a.color + "10", borderWidth: 1, borderColor: a.color + "30", borderRadius: 12, padding: 10, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text>{a.icon}</Text>
          <Text style={{ flex: 1, fontSize: 12, color: C.text }}>{a.msg}</Text>
        </View>
      ))}
      <View style={[s.card, { padding: 18, marginBottom: 16 }]}>
        <Text style={[s.label, { marginBottom: 16 }]}>POSITION SIZING CALCULATOR</Text>
        <Stepper label="Capital (₹)" val={capital} set={setCapital} step={10000} min={10000} />
        <Stepper label="Risk %"      val={risk}    set={setRisk}    step={0.5}   min={0.5} max={5} />
        <Stepper label="Entry (₹)"   val={entry}   set={setEntry}   step={10}    min={10} />
        <Stepper label="Stop Loss (₹)" val={sl}    set={setSl}      step={5}     min={5} />
        <View style={{ backgroundColor: C.accent + "10", borderWidth: 1, borderColor: C.accent + "30", borderRadius: 12, padding: 14, marginTop: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontSize: 12, color: C.muted }}>Risk Amount</Text>
            <Text style={[s.mono, { fontSize: 14, fontWeight: "700", color: C.yellow }]}>₹{riskAmt.toLocaleString()}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, color: C.muted }}>Suggested Qty</Text>
            <Text style={[s.mono, { fontSize: 20, fontWeight: "800", color: C.accent }]}>{posSize > 0 ? posSize : "—"} shares</Text>
          </View>
        </View>
      </View>
      <View style={[s.card, { padding: 14 }]}>
        <Text style={[s.label, { marginBottom: 12 }]}>MACRO INDICATORS</Text>
        {[
          { name: "India VIX", val: "14.2",      status: "Low",      color: C.green  },
          { name: "DXY (USD)", val: "104.8",     status: "Neutral",  color: C.yellow },
          { name: "Crude Oil", val: "$82.4",     status: "Moderate", color: C.yellow },
          { name: "FII Flow",  val: "+₹2,840Cr", status: "Bullish",  color: C.green  },
        ].map((m, i, arr) => (
          <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 10, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
            <Text style={{ fontSize: 13, color: C.text }}>{m.name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={[s.mono, { fontSize: 13, color: C.text }]}>{m.val}</Text>
              <View style={{ backgroundColor: m.color + "15", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, color: m.color }}>{m.status}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ── LIVE TAB ──────────────────────────────────────────────────
function LiveTab() {
  const [mode, setMode]             = useState("direct");
  const [latency, setLatency]       = useState(12);
  const [cloudLatency, setCloud]    = useState(148);
  const [pingHistory, setPingHist]  = useState(Array.from({ length: 20 }, () => Math.floor(Math.random() * 8) + 8));
  const [ticks, setTicks]           = useState([
    { symbol: "RELIANCE",  price: 2847.35, prev: 2844.10, isCrypto: false },
    { symbol: "TCS",       price: 3892.15, prev: 3889.00, isCrypto: false },
    { symbol: "BTC/USDT",  price: 83240.50,prev: 83180.00,isCrypto: true  },
    { symbol: "ETH/USDT",  price: 1587.20, prev: 1590.00, isCrypto: true  },
  ]);
  const [selStock, setSelStock]     = useState("RELIANCE");
  const [orderBook, setOrderBook]   = useState({
    bids: [{ price: 2846.00, qty: 340 },{ price: 2845.50, qty: 520 },{ price: 2844.75, qty: 890 },{ price: 2844.00, qty: 1200 },{ price: 2843.25, qty: 670 }],
    asks: [{ price: 2847.35, qty: 210 },{ price: 2848.00, qty: 450 },{ price: 2848.75, qty: 780 },{ price: 2849.50, qty: 1100 },{ price: 2850.00, qty: 560 }],
  });

  useEffect(() => {
    const iv = setInterval(() => {
      setTicks(prev => prev.map(t => ({ ...t, prev: t.price, price: parseFloat((t.price + (Math.random() - 0.48) * (t.symbol.includes("BTC") ? 80 : t.symbol.includes("ETH") ? 8 : 3)).toFixed(2)) })));
      const ping = mode === "direct" ? Math.floor(Math.random() * 10) + 8 : Math.floor(Math.random() * 60) + 120;
      setLatency(mode === "direct" ? Math.floor(Math.random() * 10) + 8 : Math.floor(Math.random() * 60) + 120);
      setCloud(Math.floor(Math.random() * 60) + 120);
      setPingHist(prev => [...prev.slice(1), ping]);
      setOrderBook(prev => ({
        bids: prev.bids.map(b => ({ ...b, qty: Math.max(50, b.qty + Math.floor((Math.random() - 0.5) * 100)) })),
        asks: prev.asks.map(a => ({ ...a, qty: Math.max(50, a.qty + Math.floor((Math.random() - 0.5) * 100)) })),
      }));
    }, 800);
    return () => clearInterval(iv);
  }, [mode]);

  const isDirect = mode === "direct";
  const activeLat = isDirect ? latency : cloudLatency;
  const latColor  = activeLat < 30 ? C.green : activeLat < 100 ? C.yellow : C.red;
  const pingMax   = Math.max(...pingHistory, 1);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
      {/* Mode Toggle */}
      <View style={[s.card, { padding: 14, marginBottom: 14 }]}>
        <Text style={[s.label, { marginBottom: 10 }]}>DATA SOURCE MODE</Text>
        <View style={{ flexDirection: "row", backgroundColor: C.surface, borderRadius: 12, padding: 3, gap: 3 }}>
          {[{ id: "direct", label: "⚡ Direct API", sub: "NSE / Kite / Binance WS" }, { id: "cloud", label: "☁ Cloud Relay", sub: "Via backend server" }].map(m => (
            <TouchableOpacity key={m.id} onPress={() => setMode(m.id)} style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: mode === m.id ? (m.id === "direct" ? C.green + "15" : C.muted + "15") : "transparent", borderWidth: 1, borderColor: mode === m.id ? (m.id === "direct" ? C.green + "40" : C.border) : "transparent" }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: mode === m.id ? (m.id === "direct" ? C.green : C.dim) : C.muted, textAlign: "center" }}>{m.label}</Text>
              <Text style={{ fontSize: 9, color: C.muted, textAlign: "center", marginTop: 2 }}>{m.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: isDirect ? C.green + "08" : C.yellow + "08", borderWidth: 1, borderColor: isDirect ? C.green + "20" : C.yellow + "20" }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: isDirect ? C.green : C.yellow, marginBottom: 3 }}>{isDirect ? "✓ Low Latency Mode Active" : "⚠ Cloud Relay Mode Active"}</Text>
          <Text style={{ fontSize: 10, color: C.muted, lineHeight: 16 }}>{isDirect ? "Direct WebSocket to NSE/Kite/Binance — no intermediate server." : "Data via cloud backend — adds ~120–180ms per tick. Like Groww/Zerodha web."}</Text>
        </View>
      </View>

      {/* Latency */}
      <View style={[s.card, { padding: 14, marginBottom: 14 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
          <View>
            <Text style={s.label}>LIVE LATENCY</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 2 }}>
              <Text style={[s.mono, { fontSize: 32, fontWeight: "800", color: latColor }]}>{activeLat}</Text>
              <Text style={{ fontSize: 13, color: C.muted }}>ms</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <GlowDot color={C.green} size={8} />
            <Text style={{ fontSize: 11, color: C.green, fontWeight: "600" }}>CONNECTED</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: 36, marginBottom: 8 }}>
          {pingHistory.map((p, i) => {
            const h = Math.max(4, (p / pingMax) * 36);
            const col = p < 30 ? C.green : p < 100 ? C.yellow : C.red;
            return <View key={i} style={{ flex: 1, height: h, borderRadius: 2, backgroundColor: i === pingHistory.length - 1 ? col : col + "50" }} />;
          })}
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[{ label: "Direct API", val: `${latency}ms`, color: C.green, active: isDirect }, { label: "Cloud Relay", val: `${cloudLatency}ms`, color: C.yellow, active: !isDirect }].map((item, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: item.active ? item.color + "10" : C.surface, borderWidth: 1, borderColor: item.active ? item.color + "30" : C.border, borderRadius: 10, padding: 10 }}>
              <Text style={{ fontSize: 9, color: C.muted }}>{item.label}</Text>
              <Text style={[s.mono, { fontSize: 15, fontWeight: "700", color: item.color }]}>{item.val}</Text>
              {item.active && <Text style={{ fontSize: 9, color: item.color }}>● ACTIVE</Text>}
            </View>
          ))}
        </View>
      </View>

      {/* Tick Feed */}
      <View style={[s.card, { padding: 14, marginBottom: 14 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={s.label}>LIVE TICK FEED</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }} />
            <Text style={{ fontSize: 9, color: C.green }}>STREAMING</Text>
          </View>
        </View>
        {ticks.map((t, i) => {
          const up = t.price >= t.prev;
          return (
            <TouchableOpacity key={i} onPress={() => setSelStock(t.symbol)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: i < ticks.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
              <View style={{ width: 4, height: 28, borderRadius: 2, backgroundColor: up ? C.green : C.red }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: selStock === t.symbol ? C.accent : C.text }}>{t.symbol}</Text>
                <Text style={{ fontSize: 9, color: C.muted }}>{t.isCrypto ? "CRYPTO" : "NSE"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[s.mono, { fontSize: 14, fontWeight: "700", color: C.text }]}>{t.isCrypto ? "$" : "₹"}{t.price.toFixed(2)}</Text>
                <Text style={{ fontSize: 10, color: up ? C.green : C.red }}>{up ? "▲" : "▼"} {Math.abs(t.price - t.prev).toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Order Book */}
      <View style={[s.card, { padding: 14 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={s.label}>ORDER BOOK</Text>
          <Text style={[s.mono, { fontSize: 11, fontWeight: "700", color: C.accent }]}>{selStock}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, color: C.green, letterSpacing: 1, marginBottom: 6, textAlign: "center" }}>BID</Text>
            {orderBook.bids.map((b, i) => {
              const maxQ = Math.max(...orderBook.bids.map(x => x.qty));
              return (
                <View key={i} style={{ position: "relative", marginBottom: 3, backgroundColor: C.bg, borderRadius: 3 }}>
                  <View style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${(b.qty / maxQ) * 100}%`, backgroundColor: C.green + "18", borderRadius: 3 }} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 3, paddingHorizontal: 6 }}>
                    <Text style={[s.mono, { fontSize: 10, color: C.green }]}>{b.price.toFixed(2)}</Text>
                    <Text style={{ fontSize: 10, color: C.muted }}>{b.qty}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, color: C.red, letterSpacing: 1, marginBottom: 6, textAlign: "center" }}>ASK</Text>
            {orderBook.asks.map((a, i) => {
              const maxQ = Math.max(...orderBook.asks.map(x => x.qty));
              return (
                <View key={i} style={{ position: "relative", marginBottom: 3, backgroundColor: C.bg, borderRadius: 3 }}>
                  <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(a.qty / maxQ) * 100}%`, backgroundColor: C.red + "18", borderRadius: 3 }} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 3, paddingHorizontal: 6 }}>
                    <Text style={[s.mono, { fontSize: 10, color: C.red }]}>{a.price.toFixed(2)}</Text>
                    <Text style={{ fontSize: 10, color: C.muted }}>{a.qty}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        <View style={{ marginTop: 10, alignItems: "center", padding: 6, backgroundColor: C.surface, borderRadius: 8 }}>
          <Text style={{ fontSize: 10, color: C.muted }}>Spread: <Text style={[s.mono, { fontSize: 11, fontWeight: "700", color: C.accent }]}>₹{(orderBook.asks[0].price - orderBook.bids[0].price).toFixed(2)}</Text></Text>
        </View>
      </View>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ── INDICATOR MATH HELPERS ────────────────────────────────────
function calcRSI(candles, period = 14) {
  const closes = candles.map(c => c.close);
  const results = Array(period).fill(null);
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(0, diff)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -diff)) / period;
    results.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return results;
}

function calcEMA(closes, period) {
  const k = 2 / (period + 1);
  const results = Array(period - 1).fill(null);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  results.push(ema);
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    results.push(ema);
  }
  return results;
}

function calcMACD(candles) {
  const closes = candles.map(c => c.close);
  const ema12  = calcEMA(closes, 12);
  const ema26  = calcEMA(closes, 26);
  const macdLine = closes.map((_, i) => ema12[i] != null && ema26[i] != null ? ema12[i] - ema26[i] : null);
  const validMACD = macdLine.filter(v => v != null);
  const signalRaw = calcEMA(validMACD, 9);
  const signal = Array(macdLine.length - validMACD.length).fill(null).concat(
    Array(validMACD.length - signalRaw.length).fill(null).concat(signalRaw)
  );
  const histogram = macdLine.map((v, i) => v != null && signal[i] != null ? v - signal[i] : null);
  return { macdLine, signal, histogram };
}

function calcADX(candles, period = 14) {
  // Simplified ADX approximation from true range
  const results = Array(period * 2).fill(null);
  for (let i = period * 2; i < candles.length; i++) {
    const slice = candles.slice(i - period, i);
    const ranges = slice.map((c, j) => {
      if (j === 0) return c.high - c.low;
      return Math.max(c.high - c.low, Math.abs(c.high - slice[j-1].close), Math.abs(c.low - slice[j-1].close));
    });
    const atr   = ranges.reduce((a, b) => a + b, 0) / period;
    const highs = slice.map(c => c.high);
    const lows  = slice.map(c => c.low);
    const dmPlus  = Math.max(0, highs[highs.length-1] - highs[highs.length-2]);
    const dmMinus = Math.max(0, lows[lows.length-2]  - lows[lows.length-1]);
    const diPlus  = (dmPlus  / (atr || 1)) * 100;
    const diMinus = (dmMinus / (atr || 1)) * 100;
    const dx = Math.abs(diPlus - diMinus) / ((diPlus + diMinus) || 1) * 100;
    results.push(Math.min(100, dx * 1.4)); // scale for visual
  }
  return results;
}

function calcChoppiness(candles, period = 14) {
  const results = Array(period).fill(null);
  for (let i = period; i < candles.length; i++) {
    const slice = candles.slice(i - period, i);
    const trueRanges = slice.map((c, j) => {
      if (j === 0) return c.high - c.low;
      return Math.max(c.high - c.low, Math.abs(c.high - slice[j-1].close), Math.abs(c.low - slice[j-1].close));
    });
    const atrSum = trueRanges.reduce((a, b) => a + b, 0);
    const highestHigh = Math.max(...slice.map(c => c.high));
    const lowestLow   = Math.min(...slice.map(c => c.low));
    const range = highestHigh - lowestLow || 1;
    const ci = 100 * Math.log10(atrSum / range) / Math.log10(period);
    results.push(Math.min(100, Math.max(0, ci)));
  }
  return results;
}

function calcVWAP(candles) {
  let cumVolPrice = 0, cumVol = 0;
  return candles.map((c, i) => {
    const vol    = 1000 + Math.sin(i * 0.5) * 400 + Math.random() * 200; // simulated vol
    const typical = (c.high + c.low + c.close) / 3;
    cumVolPrice += typical * vol;
    cumVol      += vol;
    return cumVolPrice / cumVol;
  });
}

function calcSupertrend(candles, period = 10, multiplier = 3) {
  const results = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period) { results.push(null); continue; }
    const slice = candles.slice(i - period, i + 1);
    const atr = slice.reduce((sum, c, j) => {
      if (j === 0) return sum + (c.high - c.low);
      return sum + Math.max(c.high - c.low, Math.abs(c.high - slice[j-1].close), Math.abs(c.low - slice[j-1].close));
    }, 0) / period;
    const hl2    = (candles[i].high + candles[i].low) / 2;
    const upper  = hl2 + multiplier * atr;
    const lower  = hl2 - multiplier * atr;
    const bull   = candles[i].close > lower;
    results.push({ value: bull ? lower : upper, bull });
  }
  return results;
}

function calcVolumeProfile(candles) {
  // Bin prices into buckets and sum simulated volume
  const prices   = candles.flatMap(c => [c.high, c.low]);
  const minP     = Math.min(...prices);
  const maxP     = Math.max(...prices);
  const buckets  = 10;
  const range    = (maxP - minP) / buckets;
  const profile  = Array(buckets).fill(0);
  candles.forEach((c, i) => {
    const vol   = 500 + Math.sin(i * 0.7) * 300 + Math.random() * 400;
    const bin   = Math.min(buckets - 1, Math.floor((c.close - minP) / range));
    profile[bin] += vol;
  });
  return { profile, minP, maxP, range };
}

// ── MINI LINE CHART ───────────────────────────────────────────
function MiniLineChart({ data, color, width = SW - 64, height = 60, showZero = false }) {
  const valid = data.filter(v => v != null);
  if (valid.length < 2) return null;
  const minV  = Math.min(...valid);
  const maxV  = Math.max(...valid);
  const rng   = maxV - minV || 1;
  const allData = data.filter(v => v != null);
  const W  = width, H = height;
  const toX = (i) => (i / (allData.length - 1)) * W;
  const toY = (v) => H - ((v - minV) / rng) * (H - 8) - 4;
  const pts = allData.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const zeroY = showZero ? toY(0) : null;
  return (
    <Svg width={W} height={H}>
      {showZero && zeroY != null && <Line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke={C.border} strokeWidth="0.8" strokeDasharray="3,3" />}
      <Polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── MINI HISTOGRAM ────────────────────────────────────────────
function MiniHistogram({ data, width = SW - 64, height = 60 }) {
  const valid = data.filter(v => v != null);
  if (valid.length < 2) return null;
  const maxAbs = Math.max(...valid.map(Math.abs), 1);
  const W = width, H = height;
  const barW = W / valid.length;
  const midY = H / 2;
  return (
    <Svg width={W} height={H}>
      <Line x1={0} y1={midY} x2={W} y2={midY} stroke={C.border} strokeWidth="0.8" strokeDasharray="3,3" />
      {valid.map((v, i) => {
        const barH = Math.abs(v / maxAbs) * (H / 2 - 4);
        const y    = v >= 0 ? midY - barH : midY;
        const clr  = v >= 0 ? C.green : C.red;
        return <Rect key={i} x={i * barW + 1} y={y} width={Math.max(1, barW - 2)} height={barH} fill={clr + "CC"} rx="1" />;
      })}
    </Svg>
  );
}

// ── INDICATORS TAB ────────────────────────────────────────────
function IndicatorsTab() {
  const [asset, setAsset]   = useState("BTC");
  const [tf, setTf]         = useState("1H");
  const [candles, setCandles] = useState(CANDLE_DATA);
  const [tick, setTick]     = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setCandles(prev => {
        const last = prev[asset][tf].slice(-1)[0];
        const nc   = last.close + (Math.random() - 0.49) * last.close * 0.003;
        const newC = { open: last.close, close: nc, high: Math.max(last.close, nc) * 1.001, low: Math.min(last.close, nc) * 0.999, bullish: nc >= last.close };
        return { ...prev, [asset]: { ...prev[asset], [tf]: [...prev[asset][tf].slice(1), newC] } };
      });
      setTick(t => t + 1);
    }, 1500);
    return () => clearInterval(iv);
  }, [asset, tf]);

  const cur    = candles[asset][tf];
  const closes = cur.map(c => c.close);
  const clr    = asset === "BTC" ? C.orange : C.purple;

  // Compute all indicators
  const rsi        = calcRSI(cur).filter(v => v != null);
  const { macdLine, signal, histogram } = calcMACD(cur);
  const macdValid  = macdLine.filter(v => v != null);
  const histValid  = histogram.filter(v => v != null);
  const adx        = calcADX(cur).filter(v => v != null);
  const chop       = calcChoppiness(cur).filter(v => v != null);
  const vwap       = calcVWAP(cur);
  const supertrend = calcSupertrend(cur).filter(v => v != null);
  const volProf    = calcVolumeProfile(cur);

  const lastRSI    = rsi.slice(-1)[0]?.toFixed(1)     ?? "–";
  const lastMACD   = macdValid.slice(-1)[0]?.toFixed(2)  ?? "–";
  const lastADX    = adx.slice(-1)[0]?.toFixed(1)     ?? "–";
  const lastChop   = chop.slice(-1)[0]?.toFixed(1)    ?? "–";
  const lastVWAP   = vwap.slice(-1)[0]?.toFixed(2)    ?? "–";
  const lastST     = supertrend.slice(-1)[0];
  const lastPrice  = closes.slice(-1)[0];

  // Signals derived from indicators
  const adxNum   = parseFloat(lastADX);
  const chopNum  = parseFloat(lastChop);
  const rsiNum   = parseFloat(lastRSI);
  const isTrending  = adxNum > 25 && chopNum < 61.8;
  const stBull      = lastST?.bull ?? true;
  const vwapBull    = lastPrice > (vwap.slice(-1)[0] ?? lastPrice);
  const rsiOk       = rsiNum > 40 && rsiNum < 70;
  const macdBull    = (histValid.slice(-1)[0] ?? 0) > 0;

  const finalSignal = isTrending && stBull && vwapBull && macdBull ? "BUY"
    : isTrending && !stBull && !vwapBull && !macdBull ? "SELL" : "NEUTRAL";
  const sigColor    = finalSignal === "BUY" ? C.green : finalSignal === "SELL" ? C.red : C.yellow;

  // Score (out of 6 checks)
  const checks = [isTrending, stBull, vwapBull, rsiOk, macdBull, adxNum > 20];
  const score  = checks.filter(Boolean).length;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Asset + TF Picker */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 8, marginBottom: 12 }}>
        {["BTC", "ETH"].map(id => (
          <TouchableOpacity key={id} onPress={() => setAsset(id)} style={[s.card, { flex: 1, padding: 10, alignItems: "center", borderColor: asset === id ? (id === "BTC" ? C.orange : C.purple) + "50" : C.border, backgroundColor: asset === id ? (id === "BTC" ? C.orange : C.purple) + "10" : C.card }]}>
            <Text style={{ fontSize: 16 }}>{id === "BTC" ? "₿" : "Ξ"}</Text>
            <Text style={{ fontSize: 11, fontWeight: "700", color: asset === id ? (id === "BTC" ? C.orange : C.purple) : C.muted }}>{id}</Text>
          </TouchableOpacity>
        ))}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: "center" }}>
          {["15m","1H","4H","1D"].map(t => (
            <TouchableOpacity key={t} onPress={() => setTf(t)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: tf === t ? clr + "20" : C.surface, borderWidth: 1, borderColor: tf === t ? clr + "50" : C.border }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: tf === t ? clr : C.muted }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* EXPERT SIGNAL SUMMARY */}
      <View style={[s.card, { marginHorizontal: 16, marginBottom: 12, padding: 16, borderColor: sigColor + "40", backgroundColor: sigColor + "06" }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <View>
            <Text style={s.label}>EXPERT COMBO SIGNAL</Text>
            <Text style={{ fontSize: 24, fontWeight: "800", color: sigColor, marginTop: 2 }}>{finalSignal}</Text>
            <Text style={{ fontSize: 10, color: C.muted }}>{asset}/USDT · {tf}</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: sigColor + "60", alignItems: "center", justifyContent: "center", backgroundColor: sigColor + "12" }}>
              <Text style={[s.mono, { fontSize: 18, fontWeight: "800", color: sigColor }]}>{score}/6</Text>
            </View>
            <Text style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>Score</Text>
          </View>
        </View>
        {/* Check list */}
        <View style={{ gap: 6 }}>
          {[
            { label: "ADX > 25 (Trending)",       ok: isTrending },
            { label: "Choppiness < 61.8",          ok: chopNum < 61.8 },
            { label: "Supertrend Bullish",         ok: stBull },
            { label: "Price above VWAP",           ok: vwapBull },
            { label: "RSI 40–70 (Entry zone)",     ok: rsiOk },
            { label: "MACD Histogram Positive",    ok: macdBull },
          ].map((item, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: item.ok ? C.green + "20" : C.red + "20", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 10, color: item.ok ? C.green : C.red }}>{item.ok ? "✓" : "✗"}</Text>
              </View>
              <Text style={{ fontSize: 11, color: item.ok ? C.text : C.muted }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── 1. TREND FILTER: ADX ── */}
      <View style={[s.card, { marginHorizontal: 16, marginBottom: 10, padding: 14 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: C.accent }}>📊 ADX — Trend Strength</Text>
            <Text style={{ fontSize: 9, color: C.muted }}>Trend Filter · {">"} 25 = Trending</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[s.mono, { fontSize: 18, fontWeight: "800", color: adxNum > 25 ? C.green : C.yellow }]}>{lastADX}</Text>
            <Text style={{ fontSize: 9, color: adxNum > 25 ? C.green : C.yellow }}>{adxNum > 25 ? "TRENDING" : "CHOPPY"}</Text>
          </View>
        </View>
        <MiniLineChart data={adx} color={adxNum > 25 ? C.green : C.yellow} height={50} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
          <Text style={{ fontSize: 9, color: C.muted }}>Weak {"<"} 20</Text>
          <Text style={{ fontSize: 9, color: C.yellow }}>Moderate 20–25</Text>
          <Text style={{ fontSize: 9, color: C.green }}>Strong {">"} 25</Text>
        </View>
      </View>

      {/* ── 2. TREND FILTER: CHOPPINESS ── */}
      <View style={[s.card, { marginHorizontal: 16, marginBottom: 10, padding: 14 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: C.purple }}>〰 Choppiness Index</Text>
            <Text style={{ fontSize: 9, color: C.muted }}>Trend Filter · {"<"} 61.8 = Trending</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[s.mono, { fontSize: 18, fontWeight: "800", color: chopNum < 61.8 ? C.green : C.red }]}>{lastChop}</Text>
            <Text style={{ fontSize: 9, color: chopNum < 61.8 ? C.green : C.red }}>{chopNum < 61.8 ? "TRENDING" : "RANGING"}</Text>
          </View>
        </View>
        <MiniLineChart data={chop} color={C.purple} height={50} />
        <View style={{ height: 4, backgroundColor: C.border, borderRadius: 2, marginTop: 8 }}>
          <View style={{ height: 4, width: `${chopNum}%`, backgroundColor: chopNum < 61.8 ? C.green : C.red, borderRadius: 2 }} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          <Text style={{ fontSize: 9, color: C.green }}>Trending (38.2)</Text>
          <Text style={{ fontSize: 9, color: C.muted }}>61.8</Text>
          <Text style={{ fontSize: 9, color: C.red }}>Ranging (100)</Text>
        </View>
      </View>

      {/* ── 3. DIRECTION: VWAP ── */}
      <View style={[s.card, { marginHorizontal: 16, marginBottom: 10, padding: 14 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: C.accent }}>⚖ VWAP</Text>
            <Text style={{ fontSize: 9, color: C.muted }}>Direction · Price vs VWAP</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[s.mono, { fontSize: 13, fontWeight: "700", color: vwapBull ? C.green : C.red }]}>{asset === "BTC" ? "$" : "$"}{parseFloat(lastVWAP).toLocaleString("en-US", { maximumFractionDigits: 0 })}</Text>
            <Text style={{ fontSize: 9, color: vwapBull ? C.green : C.red }}>Price {vwapBull ? "ABOVE" : "BELOW"} VWAP</Text>
          </View>
        </View>
        {/* VWAP vs Price overlay chart */}
        <Svg width={SW - 64} height={55}>
          <Polyline points={closes.map((v, i) => { const minV = Math.min(...closes,...vwap); const maxV = Math.max(...closes,...vwap); const rng = maxV-minV||1; return `${(i/(closes.length-1))*(SW-64)},${55-((v-minV)/rng)*47}`; }).join(" ")} fill="none" stroke={clr} strokeWidth="1.5" strokeLinecap="round" />
          <Polyline points={vwap.map((v, i) => { const minV = Math.min(...closes,...vwap); const maxV = Math.max(...closes,...vwap); const rng = maxV-minV||1; return `${(i/(vwap.length-1))*(SW-64)},${55-((v-minV)/rng)*47}`; }).join(" ")} fill="none" stroke={C.accent} strokeWidth="1" strokeDasharray="4,3" strokeLinecap="round" />
        </Svg>
        <View style={{ flexDirection: "row", gap: 16, marginTop: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 12, height: 2, backgroundColor: clr }} /><Text style={{ fontSize: 9, color: C.muted }}>Price</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 12, height: 1, backgroundColor: C.accent, borderStyle: "dashed" }} /><Text style={{ fontSize: 9, color: C.muted }}>VWAP</Text>
          </View>
        </View>
      </View>

      {/* ── 4. DIRECTION: SUPERTREND ── */}
      <View style={[s.card, { marginHorizontal: 16, marginBottom: 10, padding: 14 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: lastST?.bull ? C.green : C.red }}>🔺 Supertrend</Text>
            <Text style={{ fontSize: 9, color: C.muted }}>Direction · ATR-based trend line</Text>
          </View>
          <View style={{ backgroundColor: (lastST?.bull ? C.green : C.red) + "15", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: (lastST?.bull ? C.green : C.red) + "40" }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: lastST?.bull ? C.green : C.red }}>{lastST?.bull ? "▲ BULLISH" : "▼ BEARISH"}</Text>
          </View>
        </View>
        <Svg width={SW - 64} height={55}>
          {/* Price line */}
          <Polyline points={closes.map((v, i) => { const minV = Math.min(...closes); const maxV = Math.max(...closes); const rng = maxV-minV||1; return `${(i/(closes.length-1))*(SW-64)},${55-((v-minV)/rng)*47}`; }).join(" ")} fill="none" stroke={clr} strokeWidth="1.5" strokeLinecap="round" />
          {/* Supertrend dots */}
          {supertrend.map((st, i) => {
            if (!st) return null;
            const allPrices = closes;
            const minV = Math.min(...allPrices); const maxV = Math.max(...allPrices); const rng = maxV-minV||1;
            const x = (i / (cur.length-1)) * (SW-64);
            const y = 55 - ((st.value - minV) / rng) * 47;
            if (y < 0 || y > 55) return null;
            return <Circle key={i} cx={x} cy={y} r="1.5" fill={st.bull ? C.green : C.red} />;
          })}
        </Svg>
        <View style={{ flexDirection: "row", gap: 16, marginTop: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.green }} /><Text style={{ fontSize: 9, color: C.muted }}>Bullish zone</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.red }} /><Text style={{ fontSize: 9, color: C.muted }}>Bearish zone</Text>
          </View>
        </View>
      </View>

      {/* ── 5. ENTRY TIMING: RSI ── */}
      <View style={[s.card, { marginHorizontal: 16, marginBottom: 10, padding: 14 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: C.yellow }}>📈 RSI (14)</Text>
            <Text style={{ fontSize: 9, color: C.muted }}>Entry Timing · 30–70 healthy zone</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[s.mono, { fontSize: 18, fontWeight: "800", color: rsiNum < 30 ? C.green : rsiNum > 70 ? C.red : C.yellow }]}>{lastRSI}</Text>
            <Text style={{ fontSize: 9, color: rsiNum < 30 ? C.green : rsiNum > 70 ? C.red : C.yellow }}>
              {rsiNum < 30 ? "OVERSOLD ✓" : rsiNum > 70 ? "OVERBOUGHT" : "NEUTRAL"}
            </Text>
          </View>
        </View>
        <MiniLineChart data={rsi} color={C.yellow} height={50} />
        {/* OB/OS zones */}
        <View style={{ marginTop: 8 }}>
          <View style={{ height: 4, backgroundColor: C.border, borderRadius: 2 }}>
            <View style={{ height: 4, width: `${rsiNum}%`, backgroundColor: rsiNum < 30 ? C.green : rsiNum > 70 ? C.red : C.yellow, borderRadius: 2 }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
            <Text style={{ fontSize: 9, color: C.green }}>Oversold (30)</Text>
            <Text style={{ fontSize: 9, color: C.muted }}>50</Text>
            <Text style={{ fontSize: 9, color: C.red }}>Overbought (70)</Text>
          </View>
        </View>
      </View>

      {/* ── 6. ENTRY TIMING: MACD ── */}
      <View style={[s.card, { marginHorizontal: 16, marginBottom: 10, padding: 14 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: macdBull ? C.green : C.red }}>⚡ MACD (12,26,9)</Text>
            <Text style={{ fontSize: 9, color: C.muted }}>Entry Timing · Signal crossover</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[s.mono, { fontSize: 14, fontWeight: "800", color: macdBull ? C.green : C.red }]}>{lastMACD}</Text>
            <Text style={{ fontSize: 9, color: macdBull ? C.green : C.red }}>{macdBull ? "BULLISH ✓" : "BEARISH"}</Text>
          </View>
        </View>
        <MiniHistogram data={histValid} height={55} />
        <View style={{ flexDirection: "row", gap: 16, marginTop: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: C.green + "CC" }} /><Text style={{ fontSize: 9, color: C.muted }}>Bullish histogram</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: C.red + "CC" }} /><Text style={{ fontSize: 9, color: C.muted }}>Bearish histogram</Text>
          </View>
        </View>
      </View>

      {/* ── 7. CONFIRMATION: VOLUME PROFILE ── */}
      <View style={[s.card, { marginHorizontal: 16, marginBottom: 16, padding: 14 }]}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: C.dim, marginBottom: 4 }}>📦 Volume Profile</Text>
        <Text style={{ fontSize: 9, color: C.muted, marginBottom: 10 }}>Confirmation · High vol nodes = strong S/R</Text>
        <View style={{ flexDirection: "row", gap: 4, alignItems: "flex-end", height: 80 }}>
          {volProf.profile.map((vol, i) => {
            const maxVol = Math.max(...volProf.profile, 1);
            const h      = Math.max(4, (vol / maxVol) * 76);
            const price  = volProf.minP + i * volProf.range;
            const isHVN  = vol > maxVol * 0.7; // High Volume Node
            const isLVN  = vol < maxVol * 0.3; // Low Volume Node
            return (
              <View key={i} style={{ flex: 1, alignItems: "center" }}>
                <View style={{ width: "100%", height: h, backgroundColor: isHVN ? C.accent + "CC" : isLVN ? C.border : C.accent + "40", borderRadius: 2, borderWidth: isHVN ? 1 : 0, borderColor: C.accent }} />
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
          <Text style={[s.mono, { fontSize: 9, color: C.muted }]}>{asset === "BTC" ? "$" : "$"}{volProf.minP.toLocaleString("en-US", { maximumFractionDigits: 0 })}</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <View style={{ width: 8, height: 8, borderRadius: 1, backgroundColor: C.accent }} /><Text style={{ fontSize: 9, color: C.muted }}>HVN</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <View style={{ width: 8, height: 8, borderRadius: 1, backgroundColor: C.border }} /><Text style={{ fontSize: 9, color: C.muted }}>LVN</Text>
            </View>
          </View>
          <Text style={[s.mono, { fontSize: 9, color: C.muted }]}>{asset === "BTC" ? "$" : "$"}{volProf.maxP.toLocaleString("en-US", { maximumFractionDigits: 0 })}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ── TABS ──────────────────────────────────────────────────────
const TABS = [
  { id: "home",       label: "Home",    icon: "⬡" },
  { id: "portfolio",  label: "Holdings",icon: "💼"},
  { id: "market",     label: "Market",  icon: "📈" },
  { id: "crypto",     label: "Crypto",  icon: "₿"  },
  { id: "indicators", label: "Signals", icon: "◈" },
  { id: "risk",       label: "Risk",    icon: "⚡" },
  { id: "live",       label: "Live",    icon: "◉" },
  { id: "mlpredict",  label: "AI Pred", icon: "🧠" },
];

// ── ROOT ──────────────────────────────────────────────────────
export default function App() {
  const [appLoaded, setAppLoaded] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [showAI, setShowAI]       = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [userName, setUserName]   = useState("admin");
  const [aiMsg, setAiMsg]         = useState("");
  const [aiChat, setAiChat]       = useState([{ from: "ai", text: "Namaste! Ask me about BTC, ETH, or Indian stocks — signals, charts, risk." }]);
  const [portfolioState, setPortfolioState] = useState(DEFAULT_PORTFOLIO);
  const [toast, setToast]         = useState(null);

  useEffect(() => {
    let isMounted = true;
    const checkLoginInfo = async () => {
      const token = await AsyncStorage.getItem("auth_token");
      if (token === "dummy_token" && isMounted) setIsAuthenticated(true);
      if (isMounted) setCheckingAuth(false);
    };
    checkLoginInfo();

    const initApp = async () => {
      const symbols = stockData.map(s => s.symbol);
      const quotes = await getMultipleStocks(symbols);
      if (!isMounted) return;
      if (quotes.length) {
        quotes.forEach(q => {
          const sym = q.symbol.replace(".NS", "");
          const sd = stockData.find(s => s.symbol === sym);
          if (sd) {
             sd.price = q.price || sd.price;
             sd.change = q.changePercent ? parseFloat(q.changePercent.toFixed(2)) : sd.change;
          }
        });
        
        // Update live prices in portfolio state
        setPortfolioState(prev => prev.map(pItem => {
          const matched = quotes.find(q => q.symbol.replace(".NS", "") === pItem.symbol || q.symbol.replace("-USD", "") === pItem.symbol);
          if (matched && matched.price) {
            const newLtp = matched.price;
            const pnl = (newLtp - pItem.avg) * pItem.qty;
            const pct = (newLtp - pItem.avg) / pItem.avg * 100;
            return { ...pItem, ltp: newLtp, pnl, pct: parseFloat(pct.toFixed(2)) };
          }
          return pItem;
        }));
        
        setApiFailed(false);
        setAppLoaded(true);
      } else {
        // Fallback gracefully to default data if network strictly fails completely
        setApiFailed(true);
        setAppLoaded(true);
      }
    };
    initApp();
    const intervalId = setInterval(initApp, 10000);
    return () => { isMounted = false; clearInterval(intervalId); };
  }, []);

  const showToast = (msg, color = C.green) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  };

  const onBuy = (symbol, price, sector = "Unknown") => {
    if (!price) return;
    setPortfolioState(prev => {
      const exist = prev.find(p => p.symbol === symbol);
      if (exist) {
        const newQty = exist.qty + 1;
        const newTotalCost = (exist.qty * exist.avg) + price;
        const newAvg = newTotalCost / newQty;
        const newPnl = (price - newAvg) * newQty;
        const newPct = ((price - newAvg) / newAvg) * 100;
        return prev.map(p => p.symbol === symbol ? { ...p, qty: newQty, avg: newAvg, ltp: price, pnl: newPnl, pct: parseFloat(newPct.toFixed(2)) } : p);
      }
      return [...prev, { symbol, qty: 1, avg: price, ltp: price, pnl: 0, pct: 0, sector }];
    });
    showToast(`✓ Purchased 1 ${symbol}`);
  };

  const onSell = (symbol, price) => {
    if (!price) return;
    setPortfolioState(prev => {
      const exist = prev.find(p => p.symbol === symbol);
      if (!exist) return prev;
      if (exist.qty <= 1) {
        return prev.filter(p => p.symbol !== symbol);
      }
      const newQty = exist.qty - 1;
      const newPnl = (price - exist.avg) * newQty;
      const newPct = ((price - exist.avg) / exist.avg) * 100;
      return prev.map(p => p.symbol === symbol ? { ...p, qty: newQty, ltp: price, pnl: newPnl, pct: parseFloat(newPct.toFixed(2)) } : p);
    });
    showToast(`✓ Sold 1 ${symbol}`, C.orange);
  };

  const sendAiMsg = () => {
    if (!aiMsg.trim()) return;
    setAiChat(c => [...c,
      { from: "user", text: aiMsg },
      { from: "ai",   text: `Analyzing "${aiMsg}"... BTC bullish at $83,240 (RSI 48). ETH SELL signal 71% confidence. NIFTY resistance 24,000. RELIANCE BUY 87%.` },
    ]);
    setAiMsg("");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "home":       return <HomeTab />;
      case "portfolio":  return <PortfolioTab portfolio={portfolioState} onSell={onSell} />;
      case "market":     return <MarketTab onBuy={onBuy} onSell={onSell} />;
      case "crypto":     return <CryptoTab />;
      case "indicators": return <IndicatorsTab />;
      case "risk":       return <RiskTab />;
      case "live":       return <LiveTab />;
      case "mlpredict":  return <MLPredictionTab />;
    }
  };

  if (checkingAuth || !appLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={{ fontSize: 13, color: C.accent, marginTop: 16, fontWeight: "700", letterSpacing: 1 }}>{checkingAuth ? "CHECKING SESSION..." : "CONNECTING TO MARKET DATA..."}</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => {
      setIsAuthenticated(true);
      showToast(`Welcome back, admin! 👋`, C.accent);
    }} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent={true} />

      {apiFailed && (
        <View style={{ backgroundColor: C.red + "20", padding: 8, alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.red + "50" }}>
          <Text style={{ color: C.red, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 }}>⚠️ LIVE FETCH FAILED. USING CACHED DATA.</Text>
        </View>
      )}

      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <TouchableOpacity onPress={() => setShowProfile(true)}>
          <Text style={{ fontSize: 11, color: C.muted }}>Good morning, {userName} 👋</Text>
          <Text style={{ fontSize: 18, fontWeight: "800", color: C.text, letterSpacing: -0.5 }}>{TABS.find(t => t.id === activeTab)?.label}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowProfile(true)} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#000" }}>{userName ? userName.charAt(0).toUpperCase() : "U"}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>{renderContent()}</View>

      {/* Floating Toast */}
      {toast && (
        <View style={{ position: "absolute", top: 100, alignSelf: "center", backgroundColor: C.card, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30, borderWidth: 1, borderColor: toast.color, zIndex: 9999, shadowColor: "#000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 }}>
          <Text style={{ color: toast.color, fontSize: 13, fontWeight: "700" }}>{toast.msg}</Text>
        </View>
      )}

      {/* AI FAB */}
      <TouchableOpacity onPress={() => setShowAI(true)} style={{ position: "absolute", bottom: 90, right: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 12, elevation: 8 }}>
        <Text style={{ fontSize: 20 }}>🤖</Text>
      </TouchableOpacity>

      {/* Tab Bar */}
      <View style={{ flexDirection: "row", backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: Platform.OS === "ios" ? 20 : 8, paddingTop: 8 }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)} style={{ flex: 1, alignItems: "center", gap: 2 }}>
              <Text style={{ fontSize: tab.id === "crypto" ? 13 : 17, color: active ? C.accent : C.muted }}>{tab.icon}</Text>
              <Text style={{ fontSize: 8, color: active ? C.accent : C.muted, fontWeight: active ? "700" : "400" }}>{tab.label}</Text>
              {active && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.accent }} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* AI Modal */}
      <Modal visible={showAI} transparent animationType="slide" onRequestClose={() => setShowAI(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: "#000000CC" }} activeOpacity={1} onPress={() => setShowAI(false)}>
            <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, borderWidth: 1, borderColor: C.border, maxHeight: SH * 0.7 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <GlowDot color={C.accent} size={10} />
                  <Text style={{ fontSize: 14, fontWeight: "700", color: C.text }}>AI Assistant</Text>
                </View>
                <TouchableOpacity onPress={() => setShowAI(false)}>
                  <Text style={{ color: C.muted, fontSize: 20 }}>×</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ paddingBottom: 8 }}>
                {aiChat.map((msg, i) => (
                  <View key={i} style={{ marginBottom: 10, alignItems: msg.from === "user" ? "flex-end" : "flex-start" }}>
                    <View style={{ maxWidth: "80%", backgroundColor: msg.from === "user" ? C.accent + "20" : C.card, borderWidth: 1, borderColor: msg.from === "user" ? C.accent + "30" : C.border, borderRadius: 12, padding: 10 }}>
                      <Text style={{ fontSize: 12, color: C.text, lineHeight: 18 }}>{msg.text}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TextInput value={aiMsg} onChangeText={setAiMsg} onSubmitEditing={sendAiMsg} placeholder="Ask about BTC, ETH, stocks..." placeholderTextColor={C.muted} style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, color: C.text, fontSize: 13 }} />
                <TouchableOpacity onPress={sendAiMsg} style={{ backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" }}>
                  <Text style={{ color: "#000", fontWeight: "700", fontSize: 14 }}>→</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Profile Modal */}
      <Modal visible={showProfile} transparent animationType="fade" onRequestClose={() => setShowProfile(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: "#000000CC", alignItems: "center", justifyContent: "center" }} activeOpacity={1} onPress={() => setShowProfile(false)}>
            <TouchableOpacity activeOpacity={1} style={{ width: "80%", backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 12 }}>Edit Profile</Text>
              <Text style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Enter your name</Text>
              <TextInput value={userName} onChangeText={setUserName} placeholder="E.g. Ganesh, Sarah..." placeholderTextColor={C.muted} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, color: C.text, fontSize: 14, marginBottom: 16 }} />
              <TouchableOpacity onPress={() => setShowProfile(false)} style={{ backgroundColor: C.accent, borderRadius: 10, paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ color: "#000", fontWeight: "700", fontSize: 14 }}>Save Profile</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12 },
  label: { fontSize: 10, color: C.muted, letterSpacing: 1 },
  mono: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
});
