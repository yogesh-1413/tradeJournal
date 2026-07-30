import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Activity } from "lucide-react";
import { ColorContext, FONT, Card, SectionTitle } from "./App";

export default function DrawdownCurve({ trades, settings }) {
  const C = React.useContext(ColorContext);

  const data = React.useMemo(() => {
    const startingBalance = Number(settings.startingBalance) || 1000;
    let currentEquity = startingBalance;
    let peak = startingBalance;
    const curve = [{ label: "Start", drawdown: 0, equity: startingBalance }];

    const sortedTrades = [...trades].sort((a, b) => a.date.localeCompare(b.date));

    sortedTrades.forEach((t, idx) => {
      currentEquity += Number(t.pnl) || 0;
      if (currentEquity > peak) {
        peak = currentEquity;
      }
      const dd = peak > 0 ? ((currentEquity - peak) / peak) * 100 : 0;
      curve.push({
        label: `Tr-${idx + 1}`,
        drawdown: Number(dd.toFixed(2)),
        equity: currentEquity,
      });
    });

    return curve;
  }, [trades, settings]);

  const CustomChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "8px 12px", borderRadius: 8, fontSize: 11, fontFamily: FONT.body }}>
          <div style={{ fontWeight: 600, color: C.text, marginBottom: 2 }}>{d.label}</div>
          <div style={{ color: C.textDim }}>Equity: ${d.equity.toLocaleString()}</div>
          <div style={{ color: C.red, fontWeight: 500 }}>Drawdown: {d.drawdown.toFixed(2)}%</div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle icon={Activity}>Account Drawdown (%)</SectionTitle>
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
          <defs>
            <linearGradient id="dd" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.red} stopOpacity={0.35} />
              <stop offset="100%" stopColor={C.red} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={C.borderLite} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: C.text, fontSize: 9, fontFamily: FONT.mono }} axisLine={{ stroke: C.borderLite }} tickLine={false} />
          <YAxis tick={{ fill: C.text, fontSize: 10, fontFamily: FONT.mono }} axisLine={false} tickLine={false} width={45} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<CustomChartTooltip />} />
          <Area type="monotone" dataKey="drawdown" stroke={C.red} strokeWidth={2} fill="url(#dd)" />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-[9px] text-gray-500">Tr = Trade</p>
    </Card>
  );
}
