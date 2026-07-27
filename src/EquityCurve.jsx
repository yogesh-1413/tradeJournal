import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";
import { ColorContext, FONT, Card, SectionTitle, ChartTooltip } from "./App";

export default function EquityCurve({ stats }) {
  const C = React.useContext(ColorContext);
  return (
    <Card className="col-span-1 md:col-span-2" style={{ padding: 18 }}>
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
  );
}
