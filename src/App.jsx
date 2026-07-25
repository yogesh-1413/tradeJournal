import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard, PlusCircle, History as HistoryIcon, Settings as SettingsIcon,
  TrendingUp, TrendingDown, Target, Award, Flame, Snowflake, Star, Search,
  Download, X, Copy, RotateCcw, Save, Activity, Percent, Clock, BarChart3,
  Sparkles, Trash2, ChevronDown, Wallet, Gauge, Trophy, ShieldAlert, Filter,
  ArrowUpRight, ArrowDownRight, Zap, LogOut, Menu, Moon, Sun
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line
} from "recharts";

import { isFirebaseConfigured, auth, db } from "./firebase";
import FirebaseConfigModal from "./FirebaseConfigModal";
import AuthPage from "./AuthPage";
import { 
  collection, doc, setDoc, deleteDoc, onSnapshot, query, writeBatch 
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

/* ============================== TOKENS ============================== */
const C_DARK = {
  bg: "#0A0A0C",
  surface: "#111114",
  surface2: "#17171B",
  border: "#26262C",
  borderLite: "#323238",
  text: "#F2F1ED",
  textDim: "#9A9AA2",
  textFaint: "#5C5C64",
  amber: "#F0B90B",
  amberDim: "rgba(240,185,11,0.10)",
  amberBorder: "rgba(240,185,11,0.35)",
  green: "#3838f8", // Set profits and longs to Sky Blue
  greenDim: "rgba(14, 10, 238, 0.1)",
  greenBorder: "rgba(43, 29, 240, 0.35)",
  red: "#F5455C",
  redDim: "rgba(245,69,92,0.10)",
  redBorder: "rgba(245,69,92,0.35)",
  blue: "#2338f0",
};

const C_LIGHT = {
  bg: "#F2F1ED",
  surface: "#FFFFFF",
  surface2: "#E6E5E0",
  border: "#CCCCCC",
  borderLite: "#BBBBBB",
  text: "#0A0A0C",
  textDim: "#44444A",
  textFaint: "#77777D",
  amber: "#D49E00",
  amberDim: "rgba(212,158,0,0.10)",
  amberBorder: "rgba(212,158,0,0.35)",
  green: "#0284C7", // Set profits and longs to Blue
  greenDim: "rgba(2, 5, 199, 0.08)",
  greenBorder: "rgba(15, 2, 199, 0.25)",
  red: "#D32F2F",
  redDim: "rgba(211,47,47,0.10)",
  redBorder: "rgba(211,47,47,0.25)",
  blue: "#2712df",
};

const ColorContext = React.createContext(C_DARK);

const getInputStyle = (C) => ({ width: "100%", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 11px", color: C.text, fontSize: 13.5, fontFamily: FONT.body });

const FONT = {
  display: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const ASSETS = ["BTCUSDT","ETHUSDT","SOLUSDT","XAUUSD","EURUSD","NASDAQ","NIFTY","Custom"];
const STRATEGIES = ["Breakout","Pullback","Scalping","Swing","ICT-FVG","Liquidity Sweep","Custom"];
const TIMEFRAMES = ["1m","3m","5m","15m","30m","1H","4H","Daily"];
const MISTAKE_OPTIONS = ["Entered Early","Exited Early","Moved Stop Loss","Ignored Trend","Over Leveraged","FOMO","Overtrading","No Mistake"];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const DEFAULT_SETTINGS = {
  defaultExchange: "Binance",
  defaultMarket: "Crypto",
  defaultLeverage: 1,
  accountCurrency: "USD",
  feePercent: 0.05,
  startingBalance: 10000,
  monthlyGoal: 1000,
  dailyMaxLoss: 300,
  riskPercent: 1,
};

const emptyDraft = (settings) => ({
  id: null,
  date: new Date().toISOString().slice(0, 10),
  entryTime: "",
  exitTime: new Date().toTimeString().slice(0,5),
  asset: "SOLUSDT",
  customAsset: "",
  direction: "Long",
  entryPrice: "",
  exitPrice: "",
  size: "",
  leverage: settings.defaultLeverage || 1,
  strategy: "ICT-FVG",
  customStrategy: "",
  timeframe: "1m",
  rating: 3,
  mistakes: [],
  notes: "",
  screenshotUrl: "",
  partials: [],
});

/* ============================== CALC ENGINE ============================== */
function assetName(t){ return t.asset === "Custom" ? (t.customAsset || "Custom") : t.asset; }
function strategyName(t){ return t.strategy === "Custom" ? (t.customStrategy || "Custom") : t.strategy; }

function calcDurationMin(t) {
  const [eh, em] = t.entryTime.split(":").map(Number);
  const [xh, xm] = t.exitTime.split(":").map(Number);
  let start = eh * 60 + em, end = xh * 60 + xm;
  if (end < start) end += 24 * 60;
  return Math.max(end - start, 0);
}

function calcSession(entryTime) {
  const h = Number(entryTime.split(":")[0]);
  if (h >= 0 && h < 7) return "Asian";
  if (h >= 7 && h < 12) return "London";
  if (h >= 12 && h < 16) return "London/NY Overlap";
  if (h >= 16 && h < 21) return "New York";
  return "After Hours";
}

function calcPnL(t, settings) {
  const entry = Number(t.entryPrice) || 0;
  const totalSize = Number(t.size) || 0;
  const lev = Number(t.leverage) || 1;
  const feePct = settings.feePercent ?? 0.05;

  let gross = 0;
  let totalFees = 0;
  let totalExitedSize = 0;

  const partials = t.partials || [];
  const processedPartials = [];
  
  partials.forEach((p) => {
    const pSize = Number(p.size) || 0;
    const pPrice = Number(p.price) || 0;
    if (pSize > 0 && pPrice > 0) {
      processedPartials.push({ size: pSize, price: pPrice });
      totalExitedSize += pSize;
    }
  });

  // Calculate gross PnL and fees for partial exits
  processedPartials.forEach((p) => {
    const rawMove = t.direction === "Long" ? p.price - entry : entry - p.price;
    gross += rawMove * p.size;
    const entryNotional = entry * p.size;
    const exitNotional = p.price * p.size;
    totalFees += (entryNotional + exitNotional) * (feePct / 100);
  });

  // Remaining position closes at the main exitPrice
  const remainingSize = Math.max(0, totalSize - totalExitedSize);
  if (remainingSize > 0) {
    const exit = Number(t.exitPrice) || 0;
    const rawMove = t.direction === "Long" ? exit - entry : entry - exit;
    gross += rawMove * remainingSize;
    
    const entryNotional = entry * remainingSize;
    const exitNotional = exit * remainingSize;
    totalFees += (entryNotional + exitNotional) * (feePct / 100);
  }

  const net = gross - totalFees;
  const notional = entry * totalSize;
  const margin = lev > 0 ? notional / lev : notional;
  const pnlPercent = margin ? (net / margin) * 100 : 0;

  return { gross, fees: totalFees, net, pnlPercent };
}

function enrich(trades, settings) {
  return trades
    .map((t) => {
      const { net, pnlPercent, gross, fees } = calcPnL(t, settings);
      return {
        ...t,
        durationMin: calcDurationMin(t),
        session: calcSession(t.entryTime),
        pnl: net,
        pnlPercent,
        gross,
        fees,
        isWin: net > 0,
        weekday: WEEKDAYS[new Date(t.date + "T00:00:00").getDay()],
        entryHour: Number(t.entryTime.split(":")[0]),
      };
    })
    .sort((a, b) => (a.date + a.entryTime).localeCompare(b.date + b.entryTime));
}

function groupSum(list, keyFn) {
  const map = {};
  for (const t of list) {
    const k = keyFn(t);
    if (!map[k]) map[k] = { key: k, net: 0, count: 0, wins: 0 };
    map[k].net += t.pnl;
    map[k].count += 1;
    if (t.isWin) map[k].wins += 1;
  }
  return Object.values(map).map((v) => ({ ...v, winRate: v.count ? (v.wins / v.count) * 100 : 0 }));
}

function computeStats(rawTrades, settings) {
  const trades = enrich(rawTrades, settings);
  const total = trades.length;
  const wins = trades.filter((t) => t.isWin);
  const losses = trades.filter((t) => !t.isWin);
  const netProfit = trades.reduce((s, t) => s + t.pnl, 0);
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = losses.reduce((s, t) => s + t.pnl, 0);
  const winRate = total ? (wins.length / total) * 100 : 0;
  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(grossLoss) / losses.length : 0;
  const largestWin = wins.length ? Math.max(...wins.map((t) => t.pnl)) : 0;
  const largestLoss = losses.length ? Math.min(...losses.map((t) => t.pnl)) : 0;
  const profitFactor = grossLoss !== 0 ? grossProfit / Math.abs(grossLoss) : grossProfit > 0 ? Infinity : 0;
  const expectancy = (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss;
  const avgDuration = total ? trades.reduce((s, t) => s + t.durationMin, 0) / total : 0;
  const avgPositionSize = total ? trades.reduce((s, t) => s + (Number(t.size) || 0), 0) / total : 0;

  // equity curve + drawdown
  let equity = settings.startingBalance || 0;
  let peak = equity;
  let maxDD = 0;
  const curve = [{ label: "Start", equity, date: "start" }];
  trades.forEach((t, i) => {
    equity += t.pnl;
    peak = Math.max(peak, equity);
    maxDD = Math.max(maxDD, peak - equity);
    curve.push({ label: `#${i + 1}`, equity: Math.round(equity), date: t.date });
  });
  const recoveryFactor = maxDD > 0 ? netProfit / maxDD : netProfit > 0 ? Infinity : 0;

  // streaks
  let curStreak = 0, curType = null, maxWinStreak = 0, maxLossStreak = 0, runW = 0, runL = 0;
  trades.forEach((t) => {
    if (t.isWin) { runW += 1; runL = 0; maxWinStreak = Math.max(maxWinStreak, runW); }
    else { runL += 1; runW = 0; maxLossStreak = Math.max(maxLossStreak, runL); }
  });
  for (let i = trades.length - 1; i >= 0; i--) {
    const isWin = trades[i].isWin;
    if (curType === null) { curType = isWin; curStreak = 1; }
    else if (curType === isWin) { curStreak += 1; }
    else break;
  }

  const byAsset = groupSum(trades, assetName).sort((a, b) => b.net - a.net);
  const byStrategy = groupSum(trades, strategyName).sort((a, b) => b.net - a.net);
  const byWeekday = groupSum(trades, (t) => t.weekday).sort((a, b) => WEEKDAYS.indexOf(a.key) - WEEKDAYS.indexOf(b.key));
  const byHour = groupSum(trades, (t) => t.entryHour);
  const byTimeframe = groupSum(trades, (t) => t.timeframe).sort((a, b) => b.net - a.net);
  const bySession = groupSum(trades, (t) => t.session).sort((a, b) => b.net - a.net);

  const longTrades = trades.filter((t) => t.direction === "Long");
  const shortTrades = trades.filter((t) => t.direction === "Short");
  const longWinRate = longTrades.length ? (longTrades.filter((t) => t.isWin).length / longTrades.length) * 100 : 0;
  const shortWinRate = shortTrades.length ? (shortTrades.filter((t) => t.isWin).length / shortTrades.length) * 100 : 0;

  const mostTraded = [...byAsset].sort((a, b) => b.count - a.count)[0];
  const bestAsset = byAsset[0];
  const worstAsset = byAsset[byAsset.length - 1];
  const bestStrategy = byStrategy[0];
  const worstStrategy = byStrategy[byStrategy.length - 1];
  const bestDay = [...byWeekday].sort((a, b) => b.net - a.net)[0];
  const worstDay = [...byWeekday].sort((a, b) => a.net - b.net)[0];

  const dailyMap = groupSum(trades, (t) => t.date).sort((a, b) => a.key.localeCompare(b.key));
  const monthlyMap = groupSum(trades, (t) => t.date.slice(0, 7)).sort((a, b) => a.key.localeCompare(b.key));

  // scores (0-100, heuristic)
  const disciplineScore = total ? Math.max(0, 100 - trades.filter((t) => t.mistakes.length > 0 && !t.mistakes.includes("No Mistake")).length / total * 100) : 0;
  const riskScore = Math.max(0, 100 - Math.min(100, (avgLoss && avgWin) ? Math.max(0, (avgLoss / (avgWin || 1) - 1) * 60) : 0));
  const performanceScore = Math.max(0, Math.min(100, winRate * 0.5 + Math.min(profitFactor, 3) * 16.6));

  return {
    trades, total, wins, losses, netProfit, grossProfit, grossLoss, winRate, avgWin, avgLoss,
    largestWin, largestLoss, profitFactor, expectancy, avgDuration, avgPositionSize, curve, maxDD,
    recoveryFactor, curStreak, curType, maxWinStreak, maxLossStreak, byAsset, byStrategy, byWeekday,
    byHour, byTimeframe, bySession, longWinRate, shortWinRate, mostTraded, bestAsset, worstAsset,
    bestStrategy, worstStrategy, bestDay, worstDay, dailyMap, monthlyMap, disciplineScore, riskScore,
    performanceScore, currentEquity: equity,
  };
}

function generateInsights(s) {
  const out = [];
  if (s.total < 3) return out;
  if (s.bySession.length) {
    const best = [...s.bySession].sort((a, b) => b.net - a.net)[0];
    if (best.net > 0) out.push({ icon: Zap, text: `You perform best during the ${best.key} session, netting $${best.net.toFixed(0)} across ${best.count} trades.` });
  }
  if (s.longWinRate && s.shortWinRate) {
    if (Math.abs(s.longWinRate - s.shortWinRate) > 8) {
      const better = s.longWinRate > s.shortWinRate ? "Long" : "Short";
      out.push({ icon: TrendingUp, text: `Your ${better} trades outperform the other side — ${better === "Long" ? s.longWinRate.toFixed(0) : s.shortWinRate.toFixed(0)}% win rate.` });
    }
  }
  if (s.bestAsset && s.bestAsset.count >= 3) {
    out.push({ icon: Target, text: `${s.bestAsset.key} is your strongest asset — ${s.bestAsset.winRate.toFixed(0)}% win rate, $${s.bestAsset.net.toFixed(0)} net.` });
  }
  if (s.bestStrategy) {
    out.push({ icon: Award, text: `${s.bestStrategy.key} is your most profitable strategy, contributing $${s.bestStrategy.net.toFixed(0)} in net P&L.` });
  }
  if (s.worstDay && s.worstDay.net < 0) {
    out.push({ icon: ShieldAlert, text: `Most losses cluster on ${s.worstDay.key}s — consider trading lighter size that day.` });
  }
  if (s.avgLoss > s.avgWin && s.avgWin > 0) {
    out.push({ icon: TrendingDown, text: `Your average losing trade ($${s.avgLoss.toFixed(0)}) is larger than your average win ($${s.avgWin.toFixed(0)}) — tighten stop-loss discipline.` });
  }
  if (s.byTimeframe.length) {
    const best = [...s.byTimeframe].sort((a, b) => b.winRate - a.winRate)[0];
    if (best.count >= 3) out.push({ icon: Sparkles, text: `You trade significantly better on the ${best.key} timeframe — ${best.winRate.toFixed(0)}% win rate.` });
  }
  return out.slice(0, 6);
}

/* ============================== SMALL UI ============================== */
const Card = ({ children, style, className = "" }) => {
  const C = React.useContext(ColorContext);
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: C.surface, border: `1px solid ${C.border}`, ...style }}
    >
      {children}
    </div>
  );
};

const fmt$ = (n) => (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtPct = (n) => `${n >= 0 ? "" : ""}${n.toFixed(1)}%`;

function KpiCard({ label, value, sub, icon: Icon, tone }) {
  const C = React.useContext(ColorContext);
  const color = tone === "up" ? C.green : tone === "down" ? C.red : C.amber;
  return (
    <Card style={{ padding: "18px 20px" }}>
      <div className="flex items-center justify-between mb-3">
        <span style={{ color: C.textFaint, fontFamily: FONT.body, fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</span>
        <Icon size={15} style={{ color }} />
      </div>
      <div style={{ fontFamily: FONT.mono, fontSize: 22, fontWeight: 600, color: C.text }}>{value}</div>
      {sub && <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.textDim, marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

function SectionTitle({ children, icon: Icon }) {
  const C = React.useContext(ColorContext);
  return (
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon size={16} style={{ color: C.amber }} />}
      <h3 style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: 0.2 }}>{children}</h3>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  const C = React.useContext(ColorContext);
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: C.surface2, border: `1px solid ${C.borderLite}`, borderRadius: 10, padding: "8px 12px" }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.textDim, marginBottom: 2 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontFamily: FONT.mono, fontSize: 13, color: p.color || C.text, fontWeight: 600 }}>
          {typeof p.value === "number" ? fmt$(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

/* ============================== APP ============================== */
export default function TradingJournal() {
  const [page, setPage] = useState("dashboard");
  const [trades, setTrades] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState(() => emptyDraft(DEFAULT_SETTINGS));
  const [timeFilter, setTimeFilter] = useState("All Time");
  const [toast, setToast] = useState(null);
  const [lastDeleted, setLastDeleted] = useState(null);
  const fileAnchor = useRef(null);

  const [firebaseConfigured, setFirebaseConfigured] = useState(isFirebaseConfigured);
  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("journal_theme") || "dark");

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("journal_theme", next);
  };

  const C = theme === "light" ? C_LIGHT : C_DARK;

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  // Hook into auth state changed
  useEffect(() => {
    if (!firebaseConfigured) {
      setAuthLoaded(true);
      setDbLoaded(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoaded(true);
      if (!currentUser) {
        setDbLoaded(true);
      }
    });

    return () => unsubscribe();
  }, [firebaseConfigured]);

  // Sync with Firestore when authenticated user is present
  useEffect(() => {
    if (!user) {
      setTrades([]);
      setSettings(DEFAULT_SETTINGS);
      return;
    }

    setDbLoaded(false);

    // Migration helper to sync old window.storage data to Firebase Firestore
    const migrateLocalData = async (uid) => {
      try {
        const localTradesVal = await window.storage?.get("trades").catch(() => null);
        const localSettingsVal = await window.storage?.get("settings").catch(() => null);
        
        if (localTradesVal || localSettingsVal) {
          const batch = writeBatch(db);
          let migratedAny = false;

          if (localTradesVal) {
            const localTrades = JSON.parse(localTradesVal.value);
            if (Array.isArray(localTrades) && localTrades.length > 0) {
              localTrades.forEach((t) => {
                const { id, ...data } = t;
                const docId = id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
                batch.set(doc(db, "users", uid, "trades", docId), data);
              });
              migratedAny = true;
            }
          }

          if (localSettingsVal) {
            const localSettings = JSON.parse(localSettingsVal.value);
            if (localSettings) {
              batch.set(doc(db, "users", uid, "settings", "default"), localSettings);
              migratedAny = true;
            }
          }

          if (migratedAny) {
            await batch.commit();
            await window.storage?.remove("trades").catch(() => null);
            await window.storage?.remove("settings").catch(() => null);
            showToast("Migrated local journal data to Firebase!");
          }
        }
      } catch (e) {
        console.error("Migration failed:", e);
      }
    };

    migrateLocalData(user.uid);

    // 1. Listen to trades subcollection
    const tradesQuery = query(collection(db, "users", user.uid, "trades"));
    const unsubTrades = onSnapshot(tradesQuery, (snapshot) => {
      const fetchedTrades = [];
      snapshot.forEach((doc) => {
        fetchedTrades.push({ id: doc.id, ...doc.data() });
      });
      setTrades(fetchedTrades);
    }, (err) => {
      console.error("Trades snapshot error:", err);
    });

    // 2. Listen to settings document
    const settingsDoc = doc(db, "users", user.uid, "settings", "default");
    const unsubSettings = onSnapshot(settingsDoc, (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data());
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
      setDbLoaded(true);
    }, (err) => {
      console.error("Settings snapshot error:", err);
      setDbLoaded(true);
    });

    return () => {
      unsubTrades();
      unsubSettings();
    };
  }, [user]);

  // Combined loaded state
  useEffect(() => {
    if (authLoaded && dbLoaded) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [authLoaded, dbLoaded]);

  const persistSettings = async (next) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid, "settings", "default"), next);
    } catch (e) {
      console.error("Error saving settings:", e);
      showToast("Error saving settings");
    }
  };

  const saveTrade = async () => {
    if (!draft.entryPrice || !draft.exitPrice || !draft.size) {
      showToast("Entry price, exit price and size are required");
      return;
    }
    if (!user) return;
    const record = { ...draft, feePercent: settings.feePercent };
    try {
      if (record.id) {
        const { id, ...data } = record;
        await setDoc(doc(db, "users", user.uid, "trades", id), data);
        showToast("Trade updated");
      } else {
        const newId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const { id, ...data } = record;
        await setDoc(doc(db, "users", user.uid, "trades", newId), data);
        showToast("Trade saved");
      }
      setDraft(emptyDraft(settings));
    } catch (e) {
      console.error("Error saving trade:", e);
      showToast("Error saving trade");
    }
  };

  const deleteTrade = async (id) => {
    if (!user) return;
    const targetTrade = trades.find((t) => t.id === id);
    try {
      await deleteDoc(doc(db, "users", user.uid, "trades", id));
      showToast("Trade deleted");
      setLastDeleted({ trade: targetTrade, all: trades });
    } catch (e) {
      console.error("Error deleting trade:", e);
      showToast("Error deleting trade");
    }
  };

  const undoDelete = async () => {
    if (lastDeleted && user) {
      try {
        const { id, ...data } = lastDeleted.trade;
        await setDoc(doc(db, "users", user.uid, "trades", id), data);
        setLastDeleted(null);
        showToast("Delete undone");
      } catch (e) {
        console.error("Error undoing delete:", e);
        showToast("Error undoing delete");
      }
    }
  };

  const duplicateLast = () => {
    if (!trades.length) { showToast("No previous trade to duplicate"); return; }
    const last = trades[trades.length - 1];
    setDraft({ ...last, id: null, date: new Date().toISOString().slice(0, 10) });
    showToast("Duplicated previous trade");
  };

  const editTrade = (t) => { setDraft(t); setPage("entry"); };

  const filteredByTime = useMemo(() => {
    if (timeFilter === "All Time") return trades;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const start = (d) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - d).toISOString().slice(0, 10);
    return trades.filter((t) => {
      if (timeFilter === "Today") return t.date === today;
      if (timeFilter === "Last 7 Days") return t.date >= start(7);
      if (timeFilter === "Last 30 Days") return t.date >= start(30);
      if (timeFilter === "This Month") return t.date.slice(0, 7) === today.slice(0, 7);
      if (timeFilter === "YTD") return t.date.slice(0, 4) === today.slice(0, 4);
      return true;
    });
  }, [trades, timeFilter]);

  const stats = useMemo(() => computeStats(filteredByTime, settings), [filteredByTime, settings]);
  const insights = useMemo(() => generateInsights(stats), [stats]);

  const exportCSV = () => {
    const header = ["Date","Entry","Exit","Asset","Direction","Strategy","Timeframe","Entry Price","Exit Price","Size","Leverage","Net PnL","PnL %","Rating","Mistakes","Notes"];
    const rows = trades.map((t) => {
      const { net, pnlPercent } = calcPnL(t, settings);
      return [t.date, t.entryTime, t.exitTime, assetName(t), t.direction, strategyName(t), t.timeframe, t.entryPrice, t.exitPrice, t.size, t.leverage, net.toFixed(2), pnlPercent.toFixed(2), t.rating, (t.mistakes || []).join("|"), (t.notes || "").replace(/,/g, ";")].join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = fileAnchor.current;
    a.href = url; a.download = "trading-journal.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (!firebaseConfigured) {
    return <FirebaseConfigModal onConfigured={() => setFirebaseConfigured(true)} />;
  }

  if (!authLoaded) {
    return (
      <div style={{ background: C.bg, minHeight: 500 }} className="flex items-center justify-center w-screen h-screen">
        <div style={{ color: C.amber, fontFamily: FONT.mono, fontSize: 13 }}>Initializing Auth…</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (!dbLoaded) {
    return (
      <div style={{ background: C.bg, minHeight: 500 }} className="flex items-center justify-center w-screen h-screen">
        <div style={{ color: C.amber, fontFamily: FONT.mono, fontSize: 13 }}>Loading Journal Data…</div>
      </div>
    );
  }

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "entry", label: "New Trade", icon: PlusCircle },
    { id: "history", label: "History", icon: HistoryIcon },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <ColorContext.Provider value={C}>
    <div style={{ background: C.bg, fontFamily: FONT.body, color: C.text }} className="w-screen h-screen overflow-hidden flex flex-col md:flex-row">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${C.borderLite}; border-radius: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        input, select, textarea { outline: none; }
        input::placeholder, textarea::placeholder { color: ${C.textFaint}; }
      `}</style>
      <a ref={fileAnchor} style={{ display: "none" }} />

      {/* Mobile Top Header */}
      <div 
        className="flex md:hidden items-center justify-between p-4 border-b flex-shrink-0" 
        style={{ background: C.surface, borderColor: C.border }}
      >
        <div className="flex items-center gap-2">
          <div style={{ width: 24, height: 24, borderRadius: 6, background: C.amberDim, border: `1px solid ${C.amberBorder}` }} className="flex items-center justify-center">
            <Activity size={13} style={{ color: C.amber }} />
          </div>
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14 }}>Ledger</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme} 
            className="p-1.5 rounded-lg flex items-center justify-center" 
            style={{ color: C.textDim, background: "transparent", border: "none", cursor: "pointer" }}
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="p-1.5 rounded-lg flex items-center justify-center" 
            style={{ color: C.textDim, background: "transparent", border: `1px solid ${C.border}`, cursor: "pointer" }}
          >
            <Menu size={16} />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div 
        style={{ 
          width: 208, 
          borderRight: `1px solid ${C.border}`, 
          background: C.surface,
          zIndex: 50,
        }} 
        className={`flex-shrink-0 flex flex-col p-4 h-full overflow-y-auto transition-transform duration-300
          fixed md:static inset-y-0 left-0 
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="flex items-center justify-between mb-8 px-1">
          <div className="flex items-center gap-2">
            <div style={{ width: 28, height: 28, borderRadius: 8, background: C.amberDim, border: `1px solid ${C.amberBorder}` }} className="flex items-center justify-center">
              <Activity size={15} style={{ color: C.amber }} />
            </div>
            <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15 }}>Ledger</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={toggleTheme} 
              className="p-1 rounded-lg flex items-center justify-center" 
              style={{ color: C.textDim, background: "transparent", border: "none", cursor: "pointer" }}
            >
              {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="md:hidden p-1 flex items-center justify-center" 
              style={{ color: C.textDim, background: "transparent", border: "none", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {nav.map((n) => {
            const active = page === n.id;
            return (
              <button
                key={n.id}
                onClick={() => { setPage(n.id); setSidebarOpen(false); }}
                  className="flex items-center gap-2.5 rounded-lg transition-colors"
                  style={{
                    padding: "9px 12px",
                    background: active ? C.amberDim : "transparent",
                    color: active ? C.amber : C.textDim,
                    border: active ? `1px solid ${C.amberBorder}` : "1px solid transparent",
                    fontFamily: FONT.body, fontSize: 13.5, fontWeight: 500, cursor: "pointer", textAlign: "left",
                  }}
                >
                  <n.icon size={15} />
                  {n.label}
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.textFaint, padding: "4px 12px" }}>EQUITY</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 18, fontWeight: 700, color: stats.currentEquity >= settings.startingBalance ? C.green : C.red, padding: "0 12px" }}>
              {fmt$(stats.currentEquity)}
            </div>
            <button onClick={exportCSV} className="flex items-center gap-2 mt-4 w-full rounded-lg" style={{ padding: "8px 12px", background: "transparent", border: `1px solid ${C.border}`, color: C.textDim, fontSize: 12.5, cursor: "pointer" }}>
              <Download size={13} /> Export CSV
            </button>

            {/* User Profile Info */}
            <div className="mt-4 pt-4 flex flex-col gap-2" style={{ borderTop: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2 px-1">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="profile" style={{ width: 24, height: 24, borderRadius: "50%", border: `1px solid ${C.amberBorder}` }} />
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.surface2, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }} className="flex justify-center items-center">
                    <span style={{ fontSize: 10, fontWeight: "bold", color: C.textDim }}>{user.isAnonymous ? "G" : (user.email ? user.email[0].toUpperCase() : "U")}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.isAnonymous ? "Guest User" : "Yogesh"}
                  </div>
                  <div style={{ fontSize: 10, color: C.textFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.isAnonymous ? "Temporary session" : user.email}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => signOut(auth)} 
                className="flex items-center gap-2 w-full rounded-lg text-left" 
                style={{ padding: "6px 12px", background: "transparent", border: "none", color: C.red, fontSize: 12, cursor: "pointer" }}
              >
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* MAIN */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto" style={{ padding: "24px 28px" }}>
          {page === "dashboard" && (
            <DashboardPage stats={stats} insights={insights} timeFilter={timeFilter} setTimeFilter={setTimeFilter} settings={settings} />
          )}
          {page === "entry" && (
            <EntryPage draft={draft} setDraft={setDraft} onSave={saveTrade} onDuplicate={duplicateLast} onReset={() => setDraft(emptyDraft(settings))} settings={settings} />
          )}
          {page === "history" && (
            <HistoryPage trades={trades} settings={settings} onEdit={editTrade} onDelete={deleteTrade} lastDeleted={lastDeleted} onUndo={undoDelete} />
          )}
          {page === "settings" && <SettingsPage settings={settings} onSave={persistSettings} />}
        </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 20, right: 20, background: C.surface2, border: `1px solid ${C.amberBorder}`, color: C.text, padding: "10px 16px", borderRadius: 10, fontFamily: FONT.body, fontSize: 13, zIndex: 50 }}>
          {toast}
        </div>
      )}
    </div>
    </ColorContext.Provider>
  );
}

/* ============================== DASHBOARD ============================== */
const TIME_FILTERS = ["Today","Last 7 Days","Last 30 Days","This Month","YTD","All Time"];

function DashboardPage({ stats, insights, timeFilter, setTimeFilter, settings }) {
  const C = React.useContext(ColorContext);
  if (stats.total === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center" style={{ minHeight: 480 }}>
        <BarChart3 size={32} style={{ color: C.textFaint }} />
        <div style={{ fontFamily: FONT.display, fontSize: 18, color: C.text, marginTop: 16 }}>No trades yet</div>
        <div style={{ fontFamily: FONT.body, fontSize: 13, color: C.textDim, marginTop: 4 }}>Log your first trade to see performance analytics here.</div>
      </div>
    );
  }

  const pieData = [
    { name: "Wins", value: stats.wins.length, color: C.green },
    { name: "Losses", value: stats.losses.length, color: C.red },
  ];
  const dirData = [
    { name: "Long", winRate: stats.longWinRate },
    { name: "Short", winRate: stats.shortWinRate },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 700 }}>Analytics</h2>
          <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.textDim, marginTop: 2 }}>Performance across {stats.total} trades</p>
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          {TIME_FILTERS.map((f) => (
            <button key={f} onClick={() => setTimeFilter(f)}
              style={{
                padding: "6px 11px", borderRadius: 8, fontSize: 12, fontFamily: FONT.body, cursor: "pointer",
                background: timeFilter === f ? C.amberDim : "transparent",
                color: timeFilter === f ? C.amber : C.textDim,
                border: `1px solid ${timeFilter === f ? C.amberBorder : C.border}`,
              }}>{f}</button>
          ))}
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Net Profit" value={fmt$(stats.netProfit)} icon={Wallet} tone={stats.netProfit >= 0 ? "up" : "down"} sub={`${stats.total} trades`} />
        <KpiCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} icon={Target} sub={`${stats.wins.length}W / ${stats.losses.length}L`} />
        <KpiCard label="Profit Factor" value={isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞"} icon={Gauge} />
        <KpiCard label="Max Drawdown" value={fmt$(-stats.maxDD)} icon={TrendingDown} tone="down" />
        <KpiCard label="Avg Win" value={fmt$(stats.avgWin)} icon={ArrowUpRight} tone="up" />
        <KpiCard label="Avg Loss" value={fmt$(-stats.avgLoss)} icon={ArrowDownRight} tone="down" />
        <KpiCard label="Largest Win" value={fmt$(stats.largestWin)} icon={Trophy} tone="up" />
        <KpiCard label="Largest Loss" value={fmt$(stats.largestLoss)} icon={ShieldAlert} tone="down" />
        <KpiCard label="Win Streak" value={stats.curType ? stats.curStreak : 0} icon={Flame} tone="up" />
        <KpiCard label="Loss Streak" value={!stats.curType ? stats.curStreak : 0} icon={Snowflake} tone="down" />
        <KpiCard label="Avg Duration" value={`${Math.round(stats.avgDuration)}m`} icon={Clock} />
        <KpiCard label="Best Asset" value={stats.bestAsset ? stats.bestAsset.key : "—"} icon={Award} sub={stats.bestAsset ? fmt$(stats.bestAsset.net) : ""} />
      </div>

      {/* CHARTS ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        <Card className="col-span-1 lg:col-span-2" style={{ padding: 18 }}>
          <SectionTitle icon={TrendingUp}>Equity Curve</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.curve}>
              <defs>
                <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.amber} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.amber} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.border} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: C.textFaint, fontSize: 10, fontFamily: FONT.mono }} axisLine={{ stroke: C.border }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: C.textFaint, fontSize: 10, fontFamily: FONT.mono }} axisLine={false} tickLine={false} width={55} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="equity" stroke={C.amber} strokeWidth={2} fill="url(#eq)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="col-span-1" style={{ padding: 18 }}>
          <SectionTitle icon={Target}>Win / Loss</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 -mt-2">
            <span style={{ fontSize: 12, color: C.green, fontFamily: FONT.mono }}>● Wins {stats.wins.length}</span>
            <span style={{ fontSize: 12, color: C.red, fontFamily: FONT.mono }}>● Losses {stats.losses.length}</span>
          </div>
        </Card>
      </div>

      {/* CHARTS ROW 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        <Card style={{ padding: 18 }}>
          <SectionTitle icon={BarChart3}>Profit by Asset</SectionTitle>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={stats.byAsset.slice(0, 6)}>
              <CartesianGrid stroke={C.border} vertical={false} />
              <XAxis dataKey="key" tick={{ fill: C.textFaint, fontSize: 10, fontFamily: FONT.mono }} axisLine={{ stroke: C.border }} tickLine={false} />
              <YAxis tick={{ fill: C.textFaint, fontSize: 10, fontFamily: FONT.mono }} axisLine={false} tickLine={false} width={45} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                {stats.byAsset.slice(0, 6).map((d, i) => <Cell key={i} fill={d.net >= 0 ? C.green : C.red} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{ padding: 18 }}>
          <SectionTitle icon={Sparkles}>Profit by Strategy</SectionTitle>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={stats.byStrategy.slice(0, 6)}>
              <CartesianGrid stroke={C.border} vertical={false} />
              <XAxis dataKey="key" tick={{ fill: C.textFaint, fontSize: 10, fontFamily: FONT.mono }} axisLine={{ stroke: C.border }} tickLine={false} />
              <YAxis tick={{ fill: C.textFaint, fontSize: 10, fontFamily: FONT.mono }} axisLine={false} tickLine={false} width={45} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                {stats.byStrategy.slice(0, 6).map((d, i) => <Cell key={i} fill={d.net >= 0 ? C.green : C.red} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{ padding: 18 }}>
          <SectionTitle icon={Clock}>Profit by Weekday</SectionTitle>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={stats.byWeekday}>
              <CartesianGrid stroke={C.border} vertical={false} />
              <XAxis dataKey="key" tick={{ fill: C.textFaint, fontSize: 10, fontFamily: FONT.mono }} axisLine={{ stroke: C.border }} tickLine={false} />
              <YAxis tick={{ fill: C.textFaint, fontSize: 10, fontFamily: FONT.mono }} axisLine={false} tickLine={false} width={45} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                {stats.byWeekday.map((d, i) => <Cell key={i} fill={d.net >= 0 ? C.green : C.red} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* SCORES + LONG/SHORT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        <Card style={{ padding: 18 }}>
          <SectionTitle icon={Gauge}>Long vs Short Win Rate</SectionTitle>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={dirData} layout="vertical">
              <CartesianGrid stroke={C.border} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: C.textFaint, fontSize: 10, fontFamily: FONT.mono }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: C.textDim, fontSize: 12, fontFamily: FONT.body }} axisLine={false} tickLine={false} width={50} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="winRate" radius={[0, 4, 4, 0]} fill={C.amber} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{ padding: 18 }}>
          <SectionTitle icon={Trophy}>Performance Score</SectionTitle>
          <ScoreBar label="Performance" value={stats.performanceScore} />
          <ScoreBar label="Discipline" value={stats.disciplineScore} />
          <ScoreBar label="Risk Management" value={stats.riskScore} />
        </Card>
        <Card style={{ padding: 18 }}>
          <SectionTitle icon={Wallet}>Snapshot</SectionTitle>
          <div className="flex flex-col gap-2.5">
            <Row label="Expectancy / trade" value={fmt$(stats.expectancy)} />
            <Row label="Recovery Factor" value={isFinite(stats.recoveryFactor) ? stats.recoveryFactor.toFixed(2) : "∞"} />
            <Row label="Avg Position Size" value={stats.avgPositionSize.toFixed(2)} />
            <Row label="Monthly Goal" value={`${fmt$(settings.monthlyGoal)}`} />
          </div>
        </Card>
      </div>

      {/* INSIGHTS */}
      {insights.length > 0 && (
        <Card style={{ padding: 18 }}>
          <SectionTitle icon={Sparkles}>Insights</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((ins, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl" style={{ padding: 14, background: C.surface2, border: `1px solid ${C.border}` }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: C.amberDim, flexShrink: 0 }} className="flex items-center justify-center">
                  <ins.icon size={14} style={{ color: C.amber }} />
                </div>
                <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5 }}>{ins.text}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ScoreBar({ label, value }) {
  const C = React.useContext(ColorContext);
  const color = value >= 66 ? C.green : value >= 40 ? C.amber : C.red;
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span style={{ fontSize: 12, color: C.textDim }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: FONT.mono, color }}>{value.toFixed(0)}</span>
      </div>
      <div style={{ height: 6, background: C.surface2, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, value))}%`, background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}
function Row({ label, value }) {
  const C = React.useContext(ColorContext);
  return (
    <div className="flex justify-between items-center">
      <span style={{ fontSize: 12.5, color: C.textDim }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: FONT.mono, color: C.text }}>{value}</span>
    </div>
  );
}

/* ============================== ENTRY FORM ============================== */
function Field({ label, children, span }) {
  const C = React.useContext(ColorContext);
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <label style={{ display: "block", fontSize: 11.5, color: C.textFaint, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</label>
      {children}
    </div>
  );
}

function EntryPage({ draft, setDraft, onSave, onDuplicate, onReset, settings }) {
  const C = React.useContext(ColorContext);
  const inputStyle = getInputStyle(C);
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });
  const { net, pnlPercent } = calcPnL(draft, settings);
  const duration = draft.entryTime && draft.exitTime ? calcDurationMin(draft) : 0;
  const session = draft.entryTime ? calcSession(draft.entryTime) : "";
  const toggleMistake = (m) => {
    if (m === "No Mistake") { setDraft({ ...draft, mistakes: draft.mistakes.includes("No Mistake") ? [] : ["No Mistake"] }); return; }
    const cur = draft.mistakes.filter((x) => x !== "No Mistake");
    setDraft({ ...draft, mistakes: cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m] });
  };

  return (
    <div className="w-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 700 }}>{draft.id ? "Edit Trade" : "New Trade"}</h2>
          <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.textDim, marginTop: 2 }}>Log the trade — everything else is calculated automatically.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onDuplicate} className="flex items-center gap-1.5 rounded-lg" style={{ padding: "8px 12px", border: `1px solid ${C.border}`, color: C.textDim, fontSize: 12.5, background: "transparent", cursor: "pointer" }}><Copy size={13} />Duplicate Last</button>
          <button onClick={onReset} className="flex items-center gap-1.5 rounded-lg" style={{ padding: "8px 12px", border: `1px solid ${C.border}`, color: C.textDim, fontSize: 12.5, background: "transparent", cursor: "pointer" }}><RotateCcw size={13} />Reset</button>
        </div>
      </div>

      <Card style={{ padding: 22 }}>
        <SectionTitle>Basic Information</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          <Field label="Date"><input type="date" style={inputStyle} value={draft.date} onChange={set("date")} /></Field>
          <Field label="Entry Time"><input type="time" style={inputStyle} value={draft.entryTime} onChange={set("entryTime")} /></Field>
          <Field label="Exit Time"><input type="time" style={inputStyle} value={draft.exitTime} onChange={set("exitTime")} /></Field>
          <Field label="Direction">
            <div className="flex gap-2">
              {["Long", "Short"].map((d) => (
                <button key={d} onClick={() => setDraft({ ...draft, direction: d })} style={{
                  flex: 1, padding: "9px 0", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: draft.direction === d ? (d === "Long" ? C.greenDim : C.redDim) : C.surface2,
                  color: draft.direction === d ? (d === "Long" ? C.green : C.red) : C.textDim,
                  border: `1px solid ${draft.direction === d ? (d === "Long" ? C.greenBorder : C.redBorder) : C.border}`,
                }}>{d}</button>
              ))}
            </div>
          </Field>
          <Field label="Asset">
            <select style={inputStyle} value={draft.asset} onChange={set("asset")}>
              {ASSETS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          {draft.asset === "Custom" && (
            <Field label="Custom Asset Name"><input style={inputStyle} placeholder="e.g. DOGEUSDT" value={draft.customAsset} onChange={set("customAsset")} /></Field>
          )}
          <Field label="Timeframe">
            <select style={inputStyle} value={draft.timeframe} onChange={set("timeframe")}>
              {TIMEFRAMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Strategy">
            <select style={inputStyle} value={draft.strategy} onChange={set("strategy")}>
              {STRATEGIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          {draft.strategy === "Custom" && (
            <Field label="Custom Strategy Name"><input style={inputStyle} placeholder="e.g. Order Block" value={draft.customStrategy} onChange={set("customStrategy")} /></Field>
          )}
        </div>

        <SectionTitle>Trade Details</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Field label="Entry Price"><input type="number" step="any" style={inputStyle} value={draft.entryPrice} onChange={set("entryPrice")} placeholder="0.00" /></Field>
          <Field label="Exit Price"><input type="number" step="any" style={inputStyle} value={draft.exitPrice} onChange={set("exitPrice")} placeholder="0.00" /></Field>
          <Field label="Position Size">
            <input 
              type="number" 
              step="any" 
              style={inputStyle} 
              value={draft.size} 
              onChange={(e) => {
                const newSize = e.target.value;
                const total = Number(newSize) || 0;
                const updatedPartials = (draft.partials || []).map((p) => {
                  const pct = p.percent || (draft.size > 0 && p.size > 0 ? ((Number(p.size) / Number(draft.size)) * 100).toFixed(1) : "");
                  if (pct !== "") {
                    const sz = total > 0 ? ((Number(pct) / 100) * total).toFixed(4) : "";
                    return { ...p, size: sz, percent: pct };
                  }
                  return p;
                });
                setDraft({ ...draft, size: newSize, partials: updatedPartials });
              }} 
              placeholder="0.00" 
            />
          </Field>
          <Field label="Leverage (optional)"><input type="number" step="any" style={inputStyle} value={draft.leverage} onChange={set("leverage")} placeholder="1" /></Field>
        </div>

        <SectionTitle>Partial Exits (Optional)</SectionTitle>
        <div className="mb-6">
          <p style={{ fontSize: 12.5, color: C.textDim, marginBottom: 12 }}>
            Record partial profit-taking (scaling out) at different price points. 
            Remaining position size (if any) is assumed to be closed at the main Exit Price.
          </p>
          
          <div className="flex flex-col gap-2 mb-3">
            {(draft.partials || []).map((p, idx) => {
              const currentPercent = p.percent || (Number(draft.size) > 0 && Number(p.size) > 0 ? ((Number(p.size) / Number(draft.size)) * 100).toFixed(1) : "");
              return (
                <div key={idx} className="flex gap-2 items-end">
                  <div style={{ flex: 1.5 }}>
                    <label style={{ fontSize: 10.5, color: C.textFaint, display: "block", marginBottom: 3 }}>Exit Size</label>
                    <input 
                      type="number" 
                      step="any" 
                      placeholder="Size" 
                      style={inputStyle} 
                      value={p.size} 
                      onChange={(e) => {
                        const sz = e.target.value;
                        const total = Number(draft.size) || 0;
                        const pct = total > 0 && sz !== "" ? ((Number(sz) / total) * 100).toFixed(1) : "";
                        const updated = [...draft.partials];
                        updated[idx] = { ...updated[idx], size: sz, percent: pct };
                        setDraft({ ...draft, partials: updated });
                      }} 
                    />
                  </div>
                  <div style={{ width: 85 }}>
                    <label style={{ fontSize: 10.5, color: C.textFaint, display: "block", marginBottom: 3 }}>Exit %</label>
                    <input 
                      type="number" 
                      step="any" 
                      placeholder="%" 
                      style={inputStyle} 
                      value={currentPercent} 
                      onChange={(e) => {
                        const pct = e.target.value;
                        const total = Number(draft.size) || 0;
                        const sz = total > 0 && pct !== "" ? ((Number(pct) / 100) * total).toFixed(4) : "";
                        const updated = [...draft.partials];
                        updated[idx] = { ...updated[idx], percent: pct, size: sz };
                        setDraft({ ...draft, partials: updated });
                      }} 
                    />
                  </div>
                  <div style={{ flex: 1.5 }}>
                    <label style={{ fontSize: 10.5, color: C.textFaint, display: "block", marginBottom: 3 }}>Exit Price</label>
                    <input 
                      type="number" 
                      step="any" 
                      placeholder="Price" 
                      style={inputStyle} 
                      value={p.price} 
                      onChange={(e) => {
                        const updated = [...draft.partials];
                        updated[idx] = { ...updated[idx], price: e.target.value };
                        setDraft({ ...draft, partials: updated });
                      }} 
                    />
                  </div>
                  <button 
                    onClick={() => {
                      const updated = (draft.partials || []).filter((_, i) => i !== idx);
                      setDraft({ ...draft, partials: updated });
                    }}
                    className="p-2.5 rounded-lg flex items-center justify-center"
                    style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.red, cursor: "pointer" }}
                    title="Remove Partial Exit"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
          
          <div className="flex gap-3 items-center flex-wrap">
            <button 
              onClick={() => {
                const currentPartials = draft.partials || [];
                setDraft({ ...draft, partials: [...currentPartials, { size: "", price: "", percent: "" }] });
              }}
              className="flex items-center gap-1.5 rounded-lg font-medium"
              style={{ padding: "8px 14px", border: `1px solid ${C.border}`, color: C.textDim, fontSize: 12.5, background: C.surface2, cursor: "pointer" }}
            >
              + Add Partial Exit
            </button>
            
            {Number(draft.size) > 0 && (() => {
              const totalExited = (draft.partials || []).reduce((acc, p) => acc + (Number(p.size) || 0), 0);
              const remaining = Math.max(0, Number(draft.size) - totalExited);
              return (
                <span style={{ fontSize: 12, color: C.textFaint, fontFamily: FONT.mono }}>
                  Remaining size closed at Exit Price: {remaining.toFixed(4)} / {Number(draft.size)}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Auto calc panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 rounded-xl" style={{ padding: 14, background: C.surface2, border: `1px solid ${C.border}` }}>
          <AutoStat label="Net P&L" value={fmt$(net)} color={net >= 0 ? C.green : C.red} />
          <AutoStat label="ROI %" value={fmtPct(pnlPercent)} color={pnlPercent >= 0 ? C.green : C.red} />
          <AutoStat label="Duration" value={`${duration}m`} color={C.text} />
          <AutoStat label="Session" value={session} color={C.text} />
        </div>

        <SectionTitle>Review</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Field label="Trade Rating">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setDraft({ ...draft, rating: n })} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2 }}>
                  <Star size={20} fill={n <= draft.rating ? C.amber : "none"} color={n <= draft.rating ? C.amber : C.textFaint} />
                </button>
              ))}
            </div>
          </Field>
          <Field label="Screenshot Link (optional)"><input style={inputStyle} placeholder="https://..." value={draft.screenshotUrl} onChange={set("screenshotUrl")} /></Field>
        </div>
        <Field label="Mistakes">
          <div className="flex flex-wrap gap-2 mb-6">
            {MISTAKE_OPTIONS.map((m) => {
              const active = draft.mistakes.includes(m);
              return (
                <button key={m} onClick={() => toggleMistake(m)} style={{
                  padding: "6px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                  background: active ? C.amberDim : "transparent", color: active ? C.amber : C.textDim,
                  border: `1px solid ${active ? C.amberBorder : C.border}`,
                }}>{m}</button>
              );
            })}
          </div>
        </Field>
        <Field label="Notes">
          <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={draft.notes} onChange={set("notes")} placeholder="What went well, what didn't, lessons learned..." />
        </Field>

        <div className="flex gap-3 mt-6">
          <button onClick={onSave} className="flex items-center gap-2 rounded-lg" style={{ padding: "10px 20px", background: C.amber, color: "#1A1400", fontWeight: 700, fontSize: 13.5, border: "none", cursor: "pointer" }}>
            <Save size={15} /> {draft.id ? "Update Trade" : "Save Trade"}
          </button>
        </div>
      </Card>
    </div>
  );
}
function AutoStat({ label, value, color }) {
  const C = React.useContext(ColorContext);
  return (
    <div>
      <div style={{ fontSize: 10.5, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: FONT.mono, fontSize: 16, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

/* ============================== HISTORY ============================== */
function HistoryPage({ trades, settings, onEdit, onDelete, lastDeleted, onUndo }) {
  const C = React.useContext(ColorContext);
  const inputStyle = getInputStyle(C);
  const [search, setSearch] = useState("");
  const [assetFilter, setAssetFilter] = useState("All");
  const [dirFilter, setDirFilter] = useState("All");

  const enriched = useMemo(() => enrich(trades, settings), [trades, settings]);
  const filtered = enriched.filter((t) => {
    if (assetFilter !== "All" && assetName(t) !== assetFilter) return false;
    if (dirFilter !== "All" && t.direction !== dirFilter) return false;
    if (search && !(assetName(t).toLowerCase().includes(search.toLowerCase()) || (t.notes || "").toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  }).sort((a, b) => (b.date + b.entryTime).localeCompare(a.date + a.entryTime));

  const assetOptions = ["All", ...Array.from(new Set(enriched.map(assetName)))];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 700 }}>Trade History</h2>
          <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.textDim, marginTop: 2 }}>{filtered.length} of {trades.length} trades</p>
        </div>
        {lastDeleted && (
          <button onClick={onUndo} className="flex items-center gap-1.5 rounded-lg" style={{ padding: "7px 12px", border: `1px solid ${C.amberBorder}`, color: C.amber, fontSize: 12.5, background: C.amberDim, cursor: "pointer" }}>
            <RotateCcw size={13} /> Undo Delete
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg" style={{ padding: "0 10px", background: C.surface2, border: `1px solid ${C.border}` }}>
          <Search size={14} style={{ color: C.textFaint }} />
          <input placeholder="Search asset or notes..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ background: "transparent", border: "none", padding: "8px 4px", color: C.text, fontSize: 13, width: 200 }} />
        </div>
        <select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)} style={{ ...inputStyle, width: 140 }}>
          {assetOptions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={dirFilter} onChange={(e) => setDirFilter(e.target.value)} style={{ ...inputStyle, width: 120 }}>
          {["All", "Long", "Short"].map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Date", "Asset", "Dir", "Strategy", "TF", "Net P&L", "Rating", "Notes", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 14px", fontSize: 12.5, fontFamily: FONT.mono, color: C.textDim }}>{t.date}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>{assetName(t)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: t.direction === "Long" ? C.greenDim : C.redDim, color: t.direction === "Long" ? C.green : C.red }}>{t.direction}</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12.5, color: C.textDim }}>{strategyName(t)}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12.5, color: C.textDim, fontFamily: FONT.mono }}>{t.timeframe}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontFamily: FONT.mono, fontWeight: 700, color: t.pnl >= 0 ? C.green : C.red }}>
                    {fmt$(t.pnl)}
                    {t.partials && t.partials.length > 0 && (
                      <span style={{ fontSize: 9, marginLeft: 6, padding: "1px 4px", borderRadius: 4, background: C.surface2, border: `1px solid ${C.border}`, color: C.textDim, fontWeight: 600 }}>Scaled</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div className="flex">{[1,2,3,4,5].map((n) => <Star key={n} size={11} fill={n <= t.rating ? C.amber : "none"} color={n <= t.rating ? C.amber : C.textFaint} />)}</div>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: C.textFaint, maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.notes}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div className="flex gap-2">
                      <button onClick={() => onEdit(t)} style={{ background: "transparent", border: "none", color: C.textDim, cursor: "pointer" }}><SettingsIcon size={14} /></button>
                      <button onClick={() => onDelete(t.id)} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer" }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: "center", color: C.textFaint, fontSize: 13 }}>No trades match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ============================== SETTINGS ============================== */
function SettingsPage({ settings, onSave }) {
  const C = React.useContext(ColorContext);
  const inputStyle = getInputStyle(C);
  const [local, setLocal] = useState(settings);
  const set = (k) => (e) => setLocal({ ...local, [k]: e.target.value });
  const save = () => onSave({
    ...local,
    defaultLeverage: Number(local.defaultLeverage) || 1,
    feePercent: Number(local.feePercent) || 0,
    startingBalance: Number(local.startingBalance) || 0,
    monthlyGoal: Number(local.monthlyGoal) || 0,
    dailyMaxLoss: Number(local.dailyMaxLoss) || 0,
    riskPercent: Number(local.riskPercent) || 0,
  });

  return (
    <div style={{ maxWidth: 620 }}>
      <h2 style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Settings</h2>
      <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.textDim, marginBottom: 20 }}>Defaults used to auto-populate trade entry and calculations.</p>
      <Card style={{ padding: 22 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Default Exchange"><input style={inputStyle} value={local.defaultExchange} onChange={set("defaultExchange")} /></Field>
          <Field label="Default Market"><input style={inputStyle} value={local.defaultMarket} onChange={set("defaultMarket")} /></Field>
          <Field label="Default Leverage"><input type="number" style={inputStyle} value={local.defaultLeverage} onChange={set("defaultLeverage")} /></Field>
          <Field label="Account Currency"><input style={inputStyle} value={local.accountCurrency} onChange={set("accountCurrency")} /></Field>
          <Field label="Default Fee %"><input type="number" step="0.01" style={inputStyle} value={local.feePercent} onChange={set("feePercent")} /></Field>
          <Field label="Starting Account Balance"><input type="number" style={inputStyle} value={local.startingBalance} onChange={set("startingBalance")} /></Field>
          <Field label="Monthly Profit Goal"><input type="number" style={inputStyle} value={local.monthlyGoal} onChange={set("monthlyGoal")} /></Field>
          <Field label="Daily Max Loss"><input type="number" style={inputStyle} value={local.dailyMaxLoss} onChange={set("dailyMaxLoss")} /></Field>
          <Field label="Preferred Risk %"><input type="number" step="0.1" style={inputStyle} value={local.riskPercent} onChange={set("riskPercent")} /></Field>
        </div>
        <button onClick={save} className="flex items-center gap-2 rounded-lg mt-6" style={{ padding: "10px 20px", background: C.amber, color: "#1A1400", fontWeight: 700, fontSize: 13.5, border: "none", cursor: "pointer" }}>
          <Save size={15} /> Save Settings
        </button>
      </Card>
    </div>
  );
}