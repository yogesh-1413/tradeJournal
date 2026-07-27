import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";
import { ColorContext, FONT, Card, SectionTitle } from "./App";

export default function AccountGrowth({ trades, settings }) {
  const C = React.useContext(ColorContext);

  const data = React.useMemo(() => {
    const startingBalance = Number(settings.startingBalance) || 1000;
    let currentEquity = startingBalance;
    const curve = [{ label: "Start", growth: 0, equity: startingBalance }];

    const sortedTrades = [...trades].sort((a, b) => a.date.localeCompare(b.date));

    sortedTrades.forEach((t, idx) => {
      currentEquity += Number(t.pnl) || 0;
      const growth = startingBalance > 0 ? ((currentEquity - startingBalance) / startingBalance) * 100 : 0;
      curve.push({
        label: `Trade ${idx + 1}`,
        growth: Number(growth.toFixed(2)),
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
          <div style={{ color: d.growth >= 0 ? C.green : C.red, fontWeight: 500 }}>
            Growth: {d.growth >= 0 ? "+" : ""}{d.growth.toFixed(2)}%
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle icon={TrendingUp}>Account Growth (%)</SectionTitle>
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
          <defs>
            <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.amber} stopOpacity={0.35} />
              <stop offset="100%" stopColor={C.amber} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={C.border} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: C.textFaint, fontSize: 9, fontFamily: FONT.mono }} axisLine={{ stroke: C.border }} tickLine={false} />
          <YAxis tick={{ fill: C.textFaint, fontSize: 10, fontFamily: FONT.mono }} axisLine={false} tickLine={false} width={45} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<CustomChartTooltip />} />
          <Area type="monotone" dataKey="growth" stroke={C.amber} strokeWidth={2} fill="url(#growthGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
{/* Hello */}