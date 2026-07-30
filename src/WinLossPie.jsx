import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Label } from "recharts";
import { Target } from "lucide-react";
import { ColorContext, FONT, Card, SectionTitle, ChartTooltip } from "./App";

export default function WinLossPie({ stats }) {
  const C = React.useContext(ColorContext);
  const pieData = [
    { name: "Wins", value: stats.wins.length, color: "#1D4ED8" },
    { name: "Losses", value: stats.losses.length, color: "#F5455C" },
    { name: "Breakeven", value: stats.breakevens.length, color: "#b8c2cf" },
  ];

  const total = stats.total || 0;
  const winPct = total ? Math.round((stats.wins.length / total) * 100) : 0;
  const lossPct = total ? Math.round((stats.losses.length / total) * 100) : 0;
  const bePct = total ? Math.round((stats.breakevens.length / total) * 100) : 0;

  return (
    <Card style={{ padding: 18 }} className="flex flex-col h-full justify-between">
      <div>
        <SectionTitle icon={Target}>Win / Loss / BE</SectionTitle>
        <ResponsiveContainer width="100%" height={165}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
              {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
              <Label 
                value={total} 
                position="center" 
                dy={-8}
                fill={C.text} 
                style={{ fontSize: "15px", fontWeight:800, fontFamily: FONT.mono }} 
              />
              <Label 
                value="Total Trades" 
                position="center" 
                dy={12}
                fill={C.textDim} 
                style={{ fontSize: "9px", fontWeight: 500, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.3px" }} 
              />
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-2 -mt-2 flex-wrap">
        <span 
          style={{ 
            fontSize: 10.5, 
            color: "#235aef", 
            fontFamily: FONT.mono,
            fontWeight: 600,
            background: "rgba(29, 78, 216, 0.12)",
            border: "1px solid rgba(29, 78, 216, 0.25)",
            padding: "3px 8px",
            borderRadius: 6
          }}
        >
          W: {stats.wins.length} ({winPct}%)
        </span>
        <span 
          style={{ 
            fontSize: 10.5, 
            color: "#ff344f", 
            fontFamily: FONT.mono,
            fontWeight: 600,
            background: "rgba(242, 114, 131, 0.12)",
            border: "1px solid rgba(245, 69, 92, 0.25)",
            padding: "3px 8px",
            borderRadius: 6
          }}
        >
          L: {stats.losses.length} ({lossPct}%)
        </span>
        <span 
          style={{ 
            fontSize: 10.5, 
            color: "#c6c9cd", 
            fontFamily: FONT.mono,
            fontWeight: 600,
            background: "rgba(49, 51, 52, 0.12)",
            border: "1px solid rgba(216, 217, 218, 0.25)",
            padding: "3px 8px",
            borderRadius: 6
          }}
        >
          BE: {stats.breakevens.length} ({bePct}%)
        </span>
      </div>
    </Card>
  );
}
