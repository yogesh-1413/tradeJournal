import React from "react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { Clock } from "lucide-react";
import { ColorContext, FONT, Card, SectionTitle } from "./App";

export default function HoldingTimeVsPnL({ trades }) {
  const C = React.useContext(ColorContext);

  const scatterData = React.useMemo(() => {
    return trades.map((t, idx) => {
      const minutes = Number(t.durationMin) || 0;
      return {
        x: minutes,
        y: Number(t.pnl.toFixed(2)),
        asset: t.asset,
        pnl: t.pnl,
        date: t.date,
        id: idx + 1
      };
    });
  }, [trades]);

  const CustomChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      const formatDuration = (v) => {
        if (v < 60) return `${v}m`;
        const hrs = Math.floor(v / 60);
        const mins = v % 60;
        return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
      };

      return (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "8px 12px", borderRadius: 8, fontSize: 11, fontFamily: FONT.body }}>
          <div style={{ fontWeight: 600, color: C.text, marginBottom: 2 }}>Trade #{data.id} ({data.date})</div>
          <div style={{ color: C.textDim }}>Asset: {data.asset}</div>
          <div style={{ color: C.textDim, marginBottom: 2 }}>Duration: {formatDuration(data.x)}</div>
          <div style={{ color: data.pnl >= 0 ? C.green : C.red, fontWeight: 500 }}>PnL: ${data.pnl.toFixed(2)}</div>
        </div>
      );
    }
    return null;
  };

  const formatXAxis = (v) => {
    if (v < 60) return `${v}m`;
    return `${Math.round(v / 60)}h`;
  };

  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle icon={Clock}>Holding Time vs P&L</SectionTitle>
      <ResponsiveContainer width="100%" height={190}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
          <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Duration" 
            tick={{ fill: C.textFaint, fontSize: 9, fontFamily: FONT.mono }} 
            axisLine={{ stroke: C.border }} 
            tickLine={false} 
            tickFormatter={formatXAxis}
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
