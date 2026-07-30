import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Target } from "lucide-react";
import { ColorContext, FONT, Card, SectionTitle, ChartTooltip } from "./App";

export default function WinLossPie({ stats }) {
  const C = React.useContext(ColorContext);
  const pieData = [
    { name: "Wins", value: stats.wins.length, color: C.green },
    { name: "Losses", value: stats.losses.length, color: C.red },
    { name: "Breakeven", value: stats.breakevens.length, color: C.textFaint },
  ];

  return (
    <Card style={{ padding: 18 }} className="flex flex-col h-full justify-between">
      <div>
        <SectionTitle icon={Target}>Win / Loss / BE</SectionTitle>
        <ResponsiveContainer width="100%" height={165}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
              {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-3.5 -mt-2 flex-wrap">
        <span style={{ fontSize: 11.5, color: C.green, fontFamily: FONT.mono }}>● Wins {stats.wins.length}</span>
        <span style={{ fontSize: 11.5, color: C.red, fontFamily: FONT.mono }}>● Losses {stats.losses.length}</span>
        <span style={{ fontSize: 11.5, color: C.textFaint, fontFamily: FONT.mono }}>● BE {stats.breakevens.length}</span>
      </div>
    </Card>
  );
}
