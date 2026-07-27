import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";
import { ColorContext, FONT, Card, SectionTitle } from "./App";

export default function EquityCurveByTrade({ trades, settings }) {
  const C = React.useContext(ColorContext);

  const data = React.useMemo(() => {
    const startingBalance = Number(settings.startingBalance) || 1000;
    let currentEquity = startingBalance;
    const curve = [{ tradeIndex: 0, label: "Start", equity: startingBalance }];

    const sortedTrades = [...trades].sort((a, b) => a.date.localeCompare(b.date));

    sortedTrades.forEach((t, idx) => {
      currentEquity += Number(t.pnl) || 0;
      curve.push({
        tradeIndex: idx + 1,
        label: `Trade #${idx + 1}`,
        equity: currentEquity,
        date: t.date,
        asset: t.asset
      });
    });

    return curve;
  }, [trades, settings]);

  const CustomChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "8px 12px", borderRadius: 8, fontSize: 11, fontFamily: FONT.body }}>
          <div style={{ fontWeight: 600, color: C.text, marginBottom: 2 }}>{d.label} {d.date ? `(${d.date})` : ""}</div>
          {d.asset && <div style={{ color: C.textDim, marginBottom: 2 }}>Asset: {d.asset}</div>}
          <div style={{ color: C.amber, fontWeight: 500 }}>Equity: ${d.equity.toLocaleString()}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle icon={TrendingUp}>Equity Curve (by Trade #)</SectionTitle>
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
          <defs>
            <linearGradient id="eqTrade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.amber} stopOpacity={0.35} />
              <stop offset="100%" stopColor={C.amber} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={C.border} vertical={false} />
          <XAxis dataKey="tradeIndex" tick={{ fill: C.textFaint, fontSize: 9, fontFamily: FONT.mono }} axisLine={{ stroke: C.border }} tickLine={false} />
          <YAxis tick={{ fill: C.textFaint, fontSize: 10, fontFamily: FONT.mono }} axisLine={false} tickLine={false} width={45} tickFormatter={(v) => `$${v}`} />
          <Tooltip content={<CustomChartTooltip />} />
          <Area type="monotone" dataKey="equity" stroke={C.amber} strokeWidth={2} fill="url(#eqTrade)" />
        </AreaChart>
      </ResponsiveContainer>
      
    </Card>
  );
}
