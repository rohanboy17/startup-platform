"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { month: "Jan", revenue: 400 },
  { month: "Feb", revenue: 800 },
  { month: "Mar", revenue: 1200 },
  { month: "Apr", revenue: 1600 },
];

export default function RevenueChart() {
  return (
    <div className="h-80 rounded-2xl bg-muted p-6">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            strokeWidth={3}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
