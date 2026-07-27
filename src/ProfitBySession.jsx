import React from "react";
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Clock } from "lucide-react";
import { ColorContext, FONT, Card, SectionTitle, ChartTooltip } from "./App";

export default function ProfitBySession({ stats }) {
  const C = React.useContext(ColorContext);
  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle icon={Clock}>Profit by Session</SectionTitle>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={stats.bySession}>
          <CartesianGrid stroke={C.border} vertical={false} />
          <XAxis dataKey="key" tick={{ fill: C.textFaint, fontSize: 10, fontFamily: FONT.body }} axisLine={{ stroke: C.border }} tickLine={false} />
          <YAxis tick={{ fill: C.textFaint, fontSize: 10, fontFamily: FONT.mono }} axisLine={false} tickLine={false} width={45} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="net" radius={[4, 4, 0, 0]}>
            {stats.bySession.map((d, i) => <Cell key={i} fill={d.net >= 0 ? C.green : C.red} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
