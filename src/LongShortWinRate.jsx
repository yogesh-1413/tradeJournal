import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Gauge } from "lucide-react";
import { ColorContext, FONT, Card, SectionTitle, ChartTooltip } from "./App";

export default function LongShortWinRate({ stats }) {
  const C = React.useContext(ColorContext);
  const dirData = [
    { name: "Long", winRate: stats.longWinRate },
    { name: "Short", winRate: stats.shortWinRate },
  ];

  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle icon={Gauge}>Long vs Short Win Rate</SectionTitle>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={dirData} layout="vertical">
          <CartesianGrid stroke={C.border} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: C.textFaint, fontSize: 10, fontFamily: FONT.mono }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fill: C.textDim, fontSize: 12, fontFamily: FONT.body }} axisLine={false} tickLine={false} width={50} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="winRate" radius={[0, 4, 4, 0]} fill={C.amber} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
