import React from "react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { TrendingUp } from "lucide-react";
import { ColorContext, FONT, Card, SectionTitle } from "./App";

export default function RiskRewardScatter({ trades, type = "risk" }) {
  const C = React.useContext(ColorContext);

  const scatterData = trades.map((t, idx) => {
    const entry = Number(t.entryPrice) || 0;
    const size = Number(t.size) || 0;
    const lev = Number(t.leverage) || 1;
    
    // x value: total position size in USD vs committed margin risked in USD
    const xVal = type === "size" 
      ? entry * size 
      : (lev > 0 ? (entry * size) / lev : (entry * size));

    return {
      x: Number(xVal.toFixed(2)),
      y: Number(t.pnl.toFixed(2)),
      asset: t.asset,
      pnl: t.pnl,
      value: xVal,
      date: t.date,
      id: idx + 1
    };
  });

  const CustomChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "8px 12px", borderRadius: 8, fontSize: 11, fontFamily: FONT.body }}>
          <div style={{ fontWeight: 600, color: C.text, marginBottom: 2 }}>Trade #{data.id} ({data.date})</div>
          <div style={{ color: C.textDim }}>Asset: {data.asset}</div>
          <div style={{ color: C.textDim, marginBottom: 2 }}>
            {type === "size" ? "Position Size" : "Capital Risked"}: ${data.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div style={{ color: data.pnl >= 0 ? C.green : C.red, fontWeight: 500 }}>PnL: ${data.pnl.toFixed(2)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle icon={TrendingUp}>
        {type === "size" ? "Size vs Net PnL" : "Risk vs Reward (Margin)"}
      </SectionTitle>
      <ResponsiveContainer width="100%" height={190}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
          <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
          <XAxis 
            type="number" 
            dataKey="x" 
            name={type === "size" ? "Size" : "Risk"} 
            tick={{ fill: C.textFaint, fontSize: 9, fontFamily: FONT.mono }} 
            axisLine={{ stroke: C.border }} 
            tickLine={false} 
            tickFormatter={(v) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="PnL" 
            tick={{ fill: C.textFaint, fontSize: 9, fontFamily: FONT.mono }} 
            axisLine={false} 
            tickLine={false} 
            width={40} 
          />
          <Tooltip 
            cursor={{ strokeDasharray: "3 3" }} 
            content={<CustomChartTooltip />}
          />
          <Scatter name="Trades" data={scatterData}>
            {scatterData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.y >= 0 ? C.green : C.red} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </Card>
  );
}
