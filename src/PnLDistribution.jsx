import React from "react";
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { BarChart3 } from "lucide-react";
import { ColorContext, FONT, Card, SectionTitle, ChartTooltip } from "./App";

export default function PnLDistribution({ trades }) {
  const C = React.useContext(ColorContext);

  const getBuckets = () => {
    if (!trades || trades.length === 0) return [];
    
    // Standard buckets based on the typical $50 risk profile:
    const buckets = [
      { label: "<-$100", min: -Infinity, max: -100.01, count: 0, isWin: false },
      { label: "-$100 to -$50", min: -100, max: -50.01, count: 0, isWin: false },
      { label: "-$50 to $0", min: -50, max: -0.01, count: 0, isWin: false },
      { label: "$0 to $50", min: 0, max: 50, count: 0, isWin: true },
      { label: "$50 to $100", min: 50.01, max: 100, count: 0, isWin: true },
      { label: "$100 to $200", min: 100.01, max: 200, count: 0, isWin: true },
      { label: ">$200", min: 200.01, max: Infinity, count: 0, isWin: true },
    ];
    
    trades.forEach((t) => {
      const pnl = Number(t.pnl) || 0;
      for (let b of buckets) {
        if (pnl >= b.min && pnl <= b.max) {
          b.count += 1;
          break;
        }
      }
    });

    return buckets;
  };

  const data = getBuckets();

  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle icon={BarChart3}>P&L Distribution</SectionTitle>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data}>
          <CartesianGrid stroke={C.border} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: C.textFaint, fontSize: 9, fontFamily: FONT.mono }} axisLine={{ stroke: C.border }} tickLine={false} />
          <YAxis tick={{ fill: C.textFaint, fontSize: 10, fontFamily: FONT.mono }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.isWin ? C.green : C.red} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
