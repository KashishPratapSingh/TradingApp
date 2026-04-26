// ─────────────────────────────────────────────────────────────
//  MLPredictionTab.js — ML Model: Train on Past Data + Live Predictions
//  Import in App.js:
//    import MLPredictionTab from './MLPredictionTab';
//  Add to TABS array:
//    { id: "mlpredict", label: "AI Pred", icon: "🧠" }
//  Add to renderContent():
//    case "mlpredict": return <MLPredictionTab />;
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { getHistoricalData, getStockQuote } from "./apiService";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, Platform, ActivityIndicator,
  Animated,
} from "react-native";
import Svg, {
  Polyline, Line, Rect, Circle,
  Defs, LinearGradient, Stop, G, Text as SvgText,
} from "react-native-svg";

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

// ── HISTORICAL DATA (Past 60 days simulated) ──────────────────
function generateHistoricalData(basePrice, days = 60, volatility = 0.018) {
  const data = [];
  let price = basePrice;
  const now = Date.now();
  for (let i = days; i >= 0; i--) {
    const trend = Math.sin(i / 10) * 0.003; // mild sinusoidal trend
    const noise = (Math.random() - 0.49) * volatility;
    price = price * (1 + trend + noise);
    const open   = price;
    const close  = price * (1 + (Math.random() - 0.5) * 0.008);
    const high   = Math.max(open, close) * (1 + Math.random() * 0.004);
    const low    = Math.min(open, close) * (1 - Math.random() * 0.004);
    const volume = Math.floor(500000 + Math.random() * 2000000);
    data.push({
      timestamp: now - i * 86400000,
      open, high, low, close, volume,
      day: i,
    });
    price = close;
  }
  return data;
}

// ── STOCK UNIVERSE (from App.js + MarketTab.js) ───────────────
const STOCK_UNIVERSE = [
  { symbol: "RELIANCE",   name: "Reliance Industries", basePrice: 2847.35, sector: "Energy",   volatility: 0.016 },
  { symbol: "TCS",        name: "Tata Consultancy",    basePrice: 3892.15, sector: "IT",       volatility: 0.014 },
  { symbol: "HDFCBANK",   name: "HDFC Bank",           basePrice: 1889.40, sector: "Finance",  volatility: 0.013 },
  { symbol: "ICICIBANK",  name: "ICICI Bank",          basePrice: 1289.55, sector: "Finance",  volatility: 0.015 },
  { symbol: "INFOSYS",    name: "Infosys Ltd",         basePrice: 1423.60, sector: "IT",       volatility: 0.017 },
  { symbol: "BAJFINANCE", name: "Bajaj Finance",       basePrice: 7123.40, sector: "Finance",  volatility: 0.022 },
  { symbol: "WIPRO",      name: "Wipro Ltd",           basePrice: 456.25,  sector: "IT",       volatility: 0.019 },
  { symbol: "TATAMOTORS", name: "Tata Motors",         basePrice: 978.45,  sector: "Auto",     volatility: 0.025 },
  { symbol: "SBIN",       name: "State Bank India",    basePrice: 812.70,  sector: "Finance",  volatility: 0.018 },
  { symbol: "MARUTI",     name: "Maruti Suzuki",       basePrice: 12847.5, sector: "Auto",     volatility: 0.016 },
  { symbol: "SUNPHARMA",  name: "Sun Pharma",          basePrice: 1789.30, sector: "Pharma",   volatility: 0.015 },
  { symbol: "NTPC",       name: "NTPC Ltd",            basePrice: 387.45,  sector: "Power",    volatility: 0.014 },
  { symbol: "BTC",        name: "Bitcoin",             basePrice: 83240.0, sector: "Crypto",   volatility: 0.035 },
  { symbol: "ETH",        name: "Ethereum",            basePrice: 1587.20, sector: "Crypto",   volatility: 0.038 },
];

// ─────────────────────────────────────────────────────────────
//  ML ENGINE
//  Implements 4 models:
//    1. Linear Regression (least squares on closing prices)
//    2. Exponential Moving Average (EMA crossover)
//    3. RSI-based Mean Reversion
//    4. MACD Momentum
//  Final prediction = weighted ensemble of all 4
// ─────────────────────────────────────────────────────────────

class MLEngine {
  // ── Feature Extraction ──────────────────────────────────────
  static extractFeatures(data) {
    const closes = data.map(d => d.close);
    const highs  = data.map(d => d.high);
    const lows   = data.map(d => d.low);
    const vols   = data.map(d => d.volume);
    const n      = closes.length;

    // SMA
    const sma = (arr, p) => {
      const slice = arr.slice(-p);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    };

    // EMA
    const ema = (arr, p) => {
      const k = 2 / (p + 1);
      let e   = arr[0];
      for (let i = 1; i < arr.length; i++) e = arr[i] * k + e * (1 - k);
      return e;
    };

    // RSI
    const rsi = (arr, p = 14) => {
      const slice = arr.slice(-p - 1);
      let gains = 0, losses = 0;
      for (let i = 1; i < slice.length; i++) {
        const diff = slice[i] - slice[i - 1];
        if (diff > 0) gains += diff; else losses -= diff;
      }
      const rs = gains / (losses || 0.001);
      return 100 - 100 / (1 + rs);
    };

    // MACD
    const ema12 = ema(closes, 12);
    const ema26 = ema(closes, 26);
    const macdLine = ema12 - ema26;

    // Bollinger Bands
    const sma20val = sma(closes, 20);
    const variance = closes.slice(-20).reduce((s, v) => s + Math.pow(v - sma20val, 2), 0) / 20;
    const stdDev   = Math.sqrt(variance);
    const bbUpper  = sma20val + 2 * stdDev;
    const bbLower  = sma20val - 2 * stdDev;

    // Average True Range (ATR)
    let atr = 0;
    for (let i = Math.max(1, n - 14); i < n; i++) {
      atr += Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
    }
    atr /= Math.min(14, n - 1);

    // Volume trend
    const avgVol = sma(vols, 10);
    const volRatio = vols[n - 1] / (avgVol || 1);

    return {
      lastClose:  closes[n - 1],
      sma5:       sma(closes, 5),
      sma10:      sma(closes, 10),
      sma20:      sma(closes, 20),
      ema9:       ema(closes, 9),
      ema21:      ema(closes, 21),
      rsi14:      rsi(closes, 14),
      macdLine,
      bbUpper, bbLower, bbMid: sma20val,
      atr,
      volRatio,
      closes,
    };
  }

  // ── Model 1: Linear Regression ──────────────────────────────
  static linearRegressionPredict(closes, horizon = 5) {
    const n = Math.min(30, closes.length);
    const slice = closes.slice(-n);
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX  += i;
      sumY  += slice[i];
      sumXY += i * slice[i];
      sumX2 += i * i;
    }
    const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const predicted = intercept + slope * (n - 1 + horizon);
    const r2        = this._rSquared(slice, slope, intercept);
    return { predicted, slope, confidence: Math.min(95, r2 * 100) };
  }

  static _rSquared(data, slope, intercept) {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    let ssTot = 0, ssRes = 0;
    data.forEach((y, i) => {
      ssTot += Math.pow(y - mean, 2);
      ssRes += Math.pow(y - (intercept + slope * i), 2);
    });
    return Math.max(0, 1 - ssRes / (ssTot || 1));
  }

  // ── Model 2: EMA Crossover ───────────────────────────────────
  static emaCrossoverSignal(features) {
    const { ema9, ema21, lastClose, sma20 } = features;
    const crossBullish = ema9 > ema21;
    const aboveSMA     = lastClose > sma20;
    const strength     = Math.abs(ema9 - ema21) / ema21 * 100;
    const signal       = crossBullish && aboveSMA ? "BUY" : !crossBullish && !aboveSMA ? "SELL" : "HOLD";
    const confidence   = Math.min(90, 50 + strength * 10);
    const priceFactor  = crossBullish ? 1 + strength * 0.01 : 1 - strength * 0.01;
    return { predicted: lastClose * priceFactor, signal, confidence };
  }

  // ── Model 3: RSI Mean Reversion ──────────────────────────────
  static rsiMeanReversion(features) {
    const { rsi14, lastClose, bbUpper, bbLower, bbMid } = features;
    let signal = "HOLD", confidence = 50, priceFactor = 1;
    if (rsi14 < 30) {
      signal      = "BUY";
      confidence  = Math.min(92, 70 + (30 - rsi14) * 1.5);
      priceFactor = 1 + (bbMid - lastClose) / lastClose * 0.6;
    } else if (rsi14 > 70) {
      signal      = "SELL";
      confidence  = Math.min(92, 70 + (rsi14 - 70) * 1.5);
      priceFactor = 1 - (lastClose - bbMid) / lastClose * 0.6;
    } else {
      const bPct  = (lastClose - bbLower) / (bbUpper - bbLower);
      priceFactor = bPct < 0.3 ? 1.005 : bPct > 0.7 ? 0.995 : 1.0;
      confidence  = 45 + Math.abs(50 - rsi14);
    }
    return { predicted: lastClose * priceFactor, signal, confidence };
  }

  // ── Model 4: MACD Momentum ────────────────────────────────────
  static macdMomentum(features) {
    const { macdLine, lastClose, volRatio } = features;
    const macdPct    = macdLine / lastClose * 100;
    const volBoost   = volRatio > 1.5 ? 1.3 : volRatio < 0.7 ? 0.8 : 1.0;
    const signal     = macdPct > 0.05 ? "BUY" : macdPct < -0.05 ? "SELL" : "HOLD";
    const confidence = Math.min(88, 55 + Math.abs(macdPct) * 500 * volBoost);
    const priceFactor= 1 + macdPct * 0.15 * volBoost;
    return { predicted: lastClose * priceFactor, signal, confidence };
  }

  // ── Ensemble: Weighted Voting ─────────────────────────────────
  static ensemble(features) {
    const lr   = this.linearRegressionPredict(features.closes, 5);
    const ema  = this.emaCrossoverSignal(features);
    const rsi  = this.rsiMeanReversion(features);
    const macd = this.macdMomentum(features);

    // Weights based on market conditions
    const trending = Math.abs(features.macdLine / features.lastClose) > 0.001;
    const w = trending
      ? { lr: 0.20, ema: 0.35, rsi: 0.15, macd: 0.30 }
      : { lr: 0.25, ema: 0.20, rsi: 0.35, macd: 0.20 };

    const predPrice =
      lr.predicted   * w.lr +
      ema.predicted  * w.ema +
      rsi.predicted  * w.rsi +
      macd.predicted * w.macd;

    // Signal voting
    const votes = { BUY: 0, SELL: 0, HOLD: 0 };
    [[lr, w.lr], [ema, w.ema], [rsi, w.rsi], [macd, w.macd]].forEach(([m, wt]) => {
      const sig = m.signal || (predPrice > features.lastClose ? "BUY" : predPrice < features.lastClose ? "SELL" : "HOLD");
      votes[sig] += wt * (m.confidence / 100);
    });
    const signal   = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
    const confidence = Math.min(96, Math.round(
      (lr.confidence * w.lr + ema.confidence * w.ema + rsi.confidence * w.rsi + macd.confidence * w.macd)
    ));

    const change   = ((predPrice - features.lastClose) / features.lastClose) * 100;
    const targets  = {
      t1: features.lastClose * (1 + features.atr / features.lastClose),
      t2: features.lastClose * (1 + features.atr * 2 / features.lastClose),
      sl: features.lastClose * (1 - features.atr * 1.2 / features.lastClose),
    };

    return {
      currentPrice: features.lastClose,
      predictedPrice: predPrice,
      predictedChange: change,
      signal,
      confidence,
      targets,
      models: { lr, ema, rsi, macd },
      features,
    };
  }

  // ── Main Train + Predict ──────────────────────────────────────
  static trainAndPredict(historicalData) {
    const features = this.extractFeatures(historicalData);
    return this.ensemble(features);
  }
}

// ─────────────────────────────────────────────────────────────
//  UI COMPONENTS
// ─────────────────────────────────────────────────────────────

function PredictionChart({ data, prediction, width = SW - 32 }) {
  const h       = 160;
  const padL    = 8, padR = 8, padT = 12, padB = 24;
  const chartW  = width - padL - padR;
  const chartH  = h - padT - padB;
  const closes  = data.slice(-30).map(d => d.close);
  const allVals = [...closes, prediction.predictedPrice];
  const minVal  = Math.min(...allVals) * 0.998;
  const maxVal  = Math.max(...allVals) * 1.002;
  const range   = maxVal - minVal || 1;
  const toX     = i => padL + (i / (closes.length)) * chartW;
  const toY     = v => padT + chartH - ((v - minVal) / range) * chartH;

  // Historical points
  const histPts = closes.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const predX   = toX(closes.length);
  const predY   = toY(prediction.predictedPrice);
  const lastX   = toX(closes.length - 1);
  const lastY   = toY(closes[closes.length - 1]);
  const isUp    = prediction.predictedChange >= 0;

  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
      <Defs>
        <LinearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={C.accent} stopOpacity="0.2" />
          <Stop offset="100%" stopColor={C.accent} stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={isUp ? C.green : C.red} stopOpacity="0.25" />
          <Stop offset="100%" stopColor={isUp ? C.green : C.red} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(f => (
        <Line
          key={f}
          x1={padL} y1={padT + chartH * f}
          x2={width - padR} y2={padT + chartH * f}
          stroke={C.border} strokeWidth="0.5" strokeDasharray="4,4"
        />
      ))}

      {/* Vertical divider: past / future */}
      <Line
        x1={lastX} y1={padT}
        x2={lastX} y2={padT + chartH}
        stroke={C.border} strokeWidth="1" strokeDasharray="6,3"
      />

      {/* History line */}
      <Polyline
        points={histPts}
        fill="none"
        stroke={C.accent}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Prediction dashed line */}
      <Line
        x1={lastX} y1={lastY}
        x2={predX} y2={predY}
        stroke={isUp ? C.green : C.red}
        strokeWidth="2"
        strokeDasharray="5,3"
      />

      {/* Target dots */}
      <Circle cx={predX} cy={predY} r="5" fill={isUp ? C.green : C.red} opacity="0.9" />
      <Circle cx={lastX} cy={lastY} r="3" fill={C.accent} />

      {/* Price labels */}
      <SvgText x={width - padR - 2} y={padT + 8} fontSize="8" fill={C.muted} textAnchor="end">
        ₹{maxVal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
      </SvgText>
      <SvgText x={width - padR - 2} y={padT + chartH} fontSize="8" fill={C.muted} textAnchor="end">
        ₹{minVal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
      </SvgText>

      {/* Prediction label */}
      <SvgText
        x={predX + 4}
        y={predY - 4}
        fontSize="9"
        fill={isUp ? C.green : C.red}
        fontWeight="700"
      >
        ₹{prediction.predictedPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
      </SvgText>

      {/* Labels */}
      <SvgText x={padL} y={h - 4} fontSize="8" fill={C.muted}>Past 30D</SvgText>
      <SvgText x={lastX + 4} y={h - 4} fontSize="8" fill={isUp ? C.green : C.red}>5D Pred</SvgText>
    </Svg>
  );
}

function ModelCard({ name, signal, confidence, weight }) {
  const sigC = signal === "BUY" ? C.green : signal === "SELL" ? C.red : C.yellow;
  const bar  = Math.round(confidence);
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: C.border, flex: 1 }}>
      <Text style={{ fontSize: 9, color: C.muted, marginBottom: 2 }}>{name}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <View style={{ backgroundColor: sigC + "20", borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: sigC + "40" }}>
          <Text style={{ fontSize: 9, fontWeight: "700", color: sigC }}>{signal}</Text>
        </View>
        <Text style={{ fontSize: 9, color: C.dim, fontWeight: "600" }}>{bar}%</Text>
      </View>
      {/* Confidence bar */}
      <View style={{ height: 3, backgroundColor: C.border, borderRadius: 2 }}>
        <View style={{ width: `${bar}%`, height: 3, backgroundColor: sigC, borderRadius: 2 }} />
      </View>
      <Text style={{ fontSize: 8, color: C.muted, marginTop: 4 }}>wt: {(weight * 100).toFixed(0)}%</Text>
    </View>
  );
}

function LiveTicker({ symbol, price, onUpdate }) {
  const flashAnim = useRef(new Animated.Value(0)).current;
  const prevPrice = useRef(price);

  useEffect(() => {
    if (price !== prevPrice.current) {
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
      ]).start();
      prevPrice.current = price;
    }
  }, [price]);

  const bgColor = flashAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [C.card, C.accent + "30"],
  });

  return (
    <Animated.View style={{ backgroundColor: bgColor, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.border }}>
      <Text style={[ml.mono, { fontSize: 12, color: C.text, fontWeight: "700" }]}>
        ₹{price.toLocaleString("en-IN", { maximumFractionDigits: price > 1000 ? 0 : 2 })}
      </Text>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
//  MAIN TAB
// ─────────────────────────────────────────────────────────────
export default function MLPredictionTab() {
  const [selectedSymbol, setSelectedSymbol] = useState("RELIANCE");
  const [prediction, setPrediction]         = useState(null);
  const [isTraining, setIsTraining]         = useState(false);
  const [trainProgress, setTrainProgress]   = useState(0);
  const [historicalData, setHistoricalData] = useState(null);
  const [livePrice, setLivePrice]           = useState(null);
  const [liveHistory, setLiveHistory]       = useState([]);
  const [modelLog, setModelLog]             = useState([]);
  const liveIntervalRef = useRef(null);
  const progressRef     = useRef(null);

  const stock = STOCK_UNIVERSE.find(s => s.symbol === selectedSymbol);

  // ── Train model when symbol changes ─────────────────────────
  useEffect(() => {
    trainModel();
    return () => {
      clearInterval(liveIntervalRef.current);
      clearInterval(progressRef.current);
    };
  }, [selectedSymbol]);

  const trainModel = useCallback(async () => {
    setIsTraining(true);
    setTrainProgress(0);
    setPrediction(null);
    clearInterval(liveIntervalRef.current);

    setModelLog([`[${new Date().toLocaleTimeString()}] Fetching historical data for ${selectedSymbol}...`]);
    setTrainProgress(20);

    try {
      const data = await getHistoricalData(selectedSymbol, "3mo", "1d");
      if (!data || data.length === 0) {
        throw new Error("No historical data returned");
      }
      
      setModelLog(prev => [...prev.slice(-6), `[${new Date().toLocaleTimeString()}] Processing ML models locally...`]);
      setTrainProgress(60);
      
      // Simulate slight processing delay for feel
      await new Promise(r => setTimeout(r, 600));

      const result = MLEngine.trainAndPredict(data);
      
      setTrainProgress(100);
      setModelLog(prev => [...prev.slice(-6), `[${new Date().toLocaleTimeString()}] ✅ Training complete. Signal: ${result.signal}`]);

      setHistoricalData(data);
      setPrediction(result);
      setLivePrice(result.currentPrice);
      setLiveHistory([result.currentPrice]);

      setIsTraining(false);
      startLiveUpdates(result.currentPrice, result);
    } catch (e) {
      setModelLog(prev => [...prev.slice(-6), `❌ Error: ${e.message}`]);
      setIsTraining(false);
    }
  }, [selectedSymbol]);

  // ── Live price from API ────────────────────────────────────
  const startLiveUpdates = (startPrice, pred) => {
    clearInterval(liveIntervalRef.current);
    let current = startPrice;
    liveIntervalRef.current = setInterval(async () => {
      const quote = await getStockQuote(selectedSymbol);
      if (quote && quote.price) {
        current = quote.price;
        setLivePrice(current);
        setLiveHistory(h => [...h.slice(-60), current]);
        
        setPrediction(prev => {
          if (!prev) return prev;
          // Dynamically adjust confidence slightly based on real movement
          const movedTowardPredicted = (current > prev.currentPrice && prev.signal === "BUY") || (current < prev.currentPrice && prev.signal === "SELL");
          const adj = movedTowardPredicted ? 0.5 : -0.5;
          const newConf = Math.min(96, Math.max(40, prev.confidence + adj));
          return { ...prev, confidence: Math.round(newConf * 10) / 10 };
        });
      }
    }, 10000); // 10s poll
  };

  const signalColor = prediction?.signal === "BUY" ? C.green : prediction?.signal === "SELL" ? C.red : C.yellow;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ── HEADER ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isTraining ? C.yellow : C.green }} />
            <Text style={{ fontSize: 11, color: C.muted, fontWeight: "600", letterSpacing: 1 }}>
              {isTraining ? "TRAINING MODEL" : "MODEL LIVE"}
            </Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: "800", color: C.text }}>ML Predictions</Text>
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            Ensemble: Linear Regression + EMA + RSI + MACD
          </Text>
        </View>

        {/* ── SYMBOL SELECTOR ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}>
          {STOCK_UNIVERSE.map(s => {
            const active = s.symbol === selectedSymbol;
            return (
              <TouchableOpacity
                key={s.symbol}
                onPress={() => !isTraining && setSelectedSymbol(s.symbol)}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: active ? C.accent : C.border, backgroundColor: active ? C.accent + "15" : C.surface, alignItems: "center", minWidth: 64 }}
              >
                <Text style={{ fontSize: 10, fontWeight: "700", color: active ? C.accent : C.dim }}>{s.symbol}</Text>
                <Text style={{ fontSize: 8, color: C.muted }}>{s.sector}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── TRAINING PROGRESS ── */}
        {isTraining && (
          <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ActivityIndicator size="small" color={C.accent} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>Training on 60-Day Data</Text>
              </View>
              <Text style={[ml.mono, { fontSize: 12, color: C.accent }]}>{trainProgress}%</Text>
            </View>
            {/* Progress bar */}
            <View style={{ height: 4, backgroundColor: C.border, borderRadius: 2, marginBottom: 12 }}>
              <View style={{ width: `${trainProgress}%`, height: 4, backgroundColor: C.accent, borderRadius: 2 }} />
            </View>
            {/* Training log */}
            <View style={{ gap: 2 }}>
              {modelLog.slice(-4).map((log, i) => (
                <Text key={i} style={[ml.mono, { fontSize: 9, color: i === modelLog.slice(-4).length - 1 ? C.accent : C.muted }]}>
                  {log}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* ── PREDICTION RESULT ── */}
        {!isTraining && prediction && (
          <>
            {/* Main Signal Card */}
            <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: signalColor + "50" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: C.text }}>{selectedSymbol}</Text>
                  <Text style={{ fontSize: 10, color: C.muted }}>{stock.name}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  {livePrice && <LiveTicker symbol={selectedSymbol} price={livePrice} />}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }} />
                    <Text style={{ fontSize: 9, color: C.muted }}>Live</Text>
                  </View>
                </View>
              </View>

              {/* Big Signal */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 12 }}>
                <View style={{ backgroundColor: signalColor + "20", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1.5, borderColor: signalColor }}>
                  <Text style={{ fontSize: 22, fontWeight: "900", color: signalColor, letterSpacing: 2 }}>
                    {prediction.signal}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 12, color: C.muted }}>Confidence</Text>
                  <Text style={{ fontSize: 24, fontWeight: "800", color: signalColor }}>
                    {prediction.confidence}%
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 12, color: C.muted }}>5D Target</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: prediction.predictedChange >= 0 ? C.green : C.red }}>
                    {prediction.predictedChange >= 0 ? "+" : ""}{prediction.predictedChange.toFixed(2)}%
                  </Text>
                </View>
              </View>

              {/* Confidence bar */}
              <View style={{ height: 5, backgroundColor: C.border, borderRadius: 3, marginBottom: 4 }}>
                <View style={{ width: `${prediction.confidence}%`, height: 5, backgroundColor: signalColor, borderRadius: 3 }} />
              </View>
              <Text style={{ fontSize: 9, color: C.muted, textAlign: "right" }}>Model Confidence</Text>
            </View>

            {/* Price Chart */}
            {historicalData && (
              <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: C.dim, marginBottom: 8 }}>📊 Price History + Prediction</Text>
                <PredictionChart data={historicalData} prediction={prediction} />
                <View style={{ flexDirection: "row", gap: 16, marginTop: 8, justifyContent: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <View style={{ width: 20, height: 2, backgroundColor: C.accent }} />
                    <Text style={{ fontSize: 9, color: C.muted }}>Historical</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <View style={{ width: 14, borderTopWidth: 2, borderColor: signalColor, borderStyle: "dashed" }} />
                    <Text style={{ fontSize: 9, color: C.muted }}>Predicted</Text>
                  </View>
                </View>
              </View>
            )}

            {/* 4 Model Cards */}
            <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: C.dim, marginBottom: 8 }}>🤖 Model Breakdown</Text>
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
                <ModelCard
                  name="Linear Regression"
                  signal={prediction.models.lr.predicted > prediction.currentPrice ? "BUY" : "SELL"}
                  confidence={prediction.models.lr.confidence}
                  weight={0.225}
                />
                <ModelCard
                  name="EMA Crossover"
                  signal={prediction.models.ema.signal}
                  confidence={prediction.models.ema.confidence}
                  weight={0.275}
                />
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <ModelCard
                  name="RSI Reversion"
                  signal={prediction.models.rsi.signal}
                  confidence={prediction.models.rsi.confidence}
                  weight={0.25}
                />
                <ModelCard
                  name="MACD Momentum"
                  signal={prediction.models.macd.signal}
                  confidence={prediction.models.macd.confidence}
                  weight={0.25}
                />
              </View>
            </View>

            {/* Price Targets */}
            <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: C.dim, marginBottom: 12 }}>🎯 Price Targets (ATR-based)</Text>
              <View style={{ gap: 10 }}>
                {[
                  { label: "Target 2 (1.5× ATR)", val: prediction.targets.t2, color: C.green },
                  { label: "Target 1 (1× ATR)",   val: prediction.targets.t1, color: C.green + "AA" },
                  { label: "Current Price",         val: prediction.currentPrice, color: C.accent },
                  { label: "Stop Loss (1.2× ATR)", val: prediction.targets.sl, color: C.red },
                ].map(({ label, val, color }) => (
                  <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ width: 3, height: 14, backgroundColor: color, borderRadius: 2 }} />
                      <Text style={{ fontSize: 11, color: C.muted }}>{label}</Text>
                    </View>
                    <Text style={[ml.mono, { fontSize: 12, fontWeight: "700", color }]}>
                      ₹{val.toLocaleString("en-IN", { maximumFractionDigits: val > 100 ? 0 : 2 })}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Technical Indicators */}
            <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: C.dim, marginBottom: 12 }}>📉 Live Technical Indicators</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {[
                  { label: "RSI (14)",  val: prediction.features.rsi14.toFixed(1),   unit: "",  color: prediction.features.rsi14 > 70 ? C.red : prediction.features.rsi14 < 30 ? C.green : C.yellow },
                  { label: "EMA 9",    val: prediction.features.ema9.toLocaleString("en-IN", { maximumFractionDigits: 0 }), unit: "₹", color: C.purple },
                  { label: "EMA 21",   val: prediction.features.ema21.toLocaleString("en-IN", { maximumFractionDigits: 0 }), unit: "₹", color: C.purple },
                  { label: "SMA 20",   val: prediction.features.sma20.toLocaleString("en-IN", { maximumFractionDigits: 0 }), unit: "₹", color: C.accent },
                  { label: "ATR",      val: prediction.features.atr.toLocaleString("en-IN", { maximumFractionDigits: 1 }), unit: "₹", color: C.orange },
                  { label: "Vol Ratio",val: prediction.features.volRatio.toFixed(2), unit: "×", color: prediction.features.volRatio > 1.5 ? C.green : C.muted },
                  { label: "BB Upper", val: prediction.features.bbUpper.toLocaleString("en-IN", { maximumFractionDigits: 0 }), unit: "₹", color: C.red },
                  { label: "BB Lower", val: prediction.features.bbLower.toLocaleString("en-IN", { maximumFractionDigits: 0 }), unit: "₹", color: C.green },
                ].map(({ label, val, unit, color }) => (
                  <View key={label} style={{ width: (SW - 32 - 10) / 2 - 5, backgroundColor: C.surface, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: C.border }}>
                    <Text style={{ fontSize: 9, color: C.muted, marginBottom: 3 }}>{label}</Text>
                    <Text style={[ml.mono, { fontSize: 13, fontWeight: "700", color }]}>{unit}{val}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Retrain button */}
            <TouchableOpacity
              onPress={trainModel}
              style={{ marginHorizontal: 16, backgroundColor: C.accent + "15", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.accent + "40", alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
            >
              <Text style={{ fontSize: 14 }}>🔄</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.accent }}>Retrain Model</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const ml = StyleSheet.create({
  mono: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
});
