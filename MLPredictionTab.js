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
import { getPrediction, getStockQuote } from "./apiService";
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

    setModelLog([`[${new Date().toLocaleTimeString()}] Requesting ML prediction from backend for ${selectedSymbol}...`]);
    setTrainProgress(40);

    try {
      const result = await getPrediction(selectedSymbol);
      if (!result || !result.historicalData) {
        throw new Error("Failed to fetch prediction from backend");
      }
      
      setModelLog(prev => [...prev.slice(-6), `[${new Date().toLocaleTimeString()}] ✅ Prediction received. Signal: ${result.signal}`]);
      setTrainProgress(100);

      // Map backend historical chart to include 'bullish' property
      const histData = result.historicalData.map(d => ({...d, bullish: d.close >= d.open}));
      setHistoricalData(histData);
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
