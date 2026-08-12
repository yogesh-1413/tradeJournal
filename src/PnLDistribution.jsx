import React from "react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine } from "recharts";
import { BarChart3 } from "lucide-react";
import { ColorContext, FONT, Card, SectionTitle } from "./App";

export default function PnLDistribution({ trades }) {
  const C = React.useContext(ColorContext);

  const scatterData = React.useMemo(() => {
    if (!trades || trades.length === 0) return [];
    
    // Sort trades chronologically
    const sortedTrades = [...trades].sort((a, b) => (a.date + a.entryTime).localeCompare(b.date + b.entryTime));
    
    return sortedTrades.map((t, idx) => ({
      x: idx + 1,
      y: Number(t.pnl) || 0,
      asset: t.asset,
      date: t.date,
      pnl: t.pnl,
      isWin: t.isWin,
      isBreakeven: t.isBreakeven
    }));
  }, [trades]);

  const CustomChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      let outcomeColor = d.isBreakeven ? "#64748B" : (d.isWin ? "#1D4ED8" : "#F5455C");
      let outcomeLabel = d.isBreakeven ? "Breakeven" : (d.isWin ? "Win" : "Loss");

      return (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "8px 12px", borderRadius: 8, fontSize: 11, fontFamily: FONT.body }}>
          <div style={{ fontWeight: 600, color: C.text, marginBottom: 2 }}>Trade #{d.x} ({d.date})</div>
          <div style={{ color: C.textDim }}>Asset: {d.asset}</div>
          <div style={{ color: outcomeColor, fontWeight: 600, marginTop: 4 }}>
            {outcomeLabel}: ${d.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      );
    }
    return null;
  };

  const fmtYAxis = (v) => {
    const abs = Math.abs(v);
    let sign = v < 0 ? "-" : "";
    if (abs >= 1000) {
      return `${sign}$${(abs / 1000).toFixed(1).replace(/\.0$/, "")}k`;
    }
    return `${sign}$${Math.round(abs)}`;
  };

  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle icon={BarChart3}>P&L Distribution (by Trade #)</SectionTitle>
      <ResponsiveContainer width="100%" height={190}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
          <CartesianGrid stroke={C.borderLite} strokeDasharray="3 3" vertical={false} />
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Trade #" 
            tick={{ fill: C.text, fontSize: 9, fontFamily: FONT.mono }} 
            axisLine={{ stroke: C.borderLite }} 
            tickLine={false} 
            tickFormatter={(v) => `#${v}`}
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="PnL" 
            tick={{ fill: C.text, fontSize: 9, fontFamily: FONT.mono }} 
            axisLine={false} 
            tickLine={false} 
            width={45} 
            tickFormatter={fmtYAxis}
          />
          <Tooltip 
            cursor={{ strokeDasharray: "3 3" }} 
            content={<CustomChartTooltip />}
          />
          <ReferenceLine y={0} stroke={C.borderLite} strokeWidth={1} strokeDasharray="5 5" />
          <Scatter name="Trades" data={scatterData}>
            {scatterData.map((entry, index) => {
              const dotColor = entry.isBreakeven ? "#64748B" : (entry.isWin ? "#1D4ED8" : "#F5455C");
              return <Cell key={`cell-${index}`} fill={dotColor} />;
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </Card>
  );
}
