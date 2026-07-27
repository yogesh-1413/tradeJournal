import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Target } from "lucide-react";
import { ColorContext, FONT, Card, SectionTitle, ChartTooltip } from "./App";

export default function WinLossPie({ stats }) {
  const C = React.useContext(ColorContext);
  const pieData = [
    { name: "Wins", value: stats.wins.length, color: C.green },
    { name: "Losses", value: stats.losses.length, color: C.red },
  ];

  return (
    <Card style={{ padding: 18 }} className="flex flex-col h-full justify-between">
      <div>
        <SectionTitle icon={Target}>Win / Loss</SectionTitle>
        <ResponsiveContainer width="100%" height={165}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
              {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-4 -mt-2">
        <span style={{ fontSize: 12, color: C.green, fontFamily: FONT.mono }}>● Wins {stats.wins.length}</span>
        <span style={{ fontSize: 12, color: C.red, fontFamily: FONT.mono }}>● Losses {stats.losses.length}</span>
      </div>
    </Card>
  );
}
