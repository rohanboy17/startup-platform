"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type RevenuePoint = {
  month: string;
  revenue: number;
  payout: number;
};

export default function RevenueChart({ data }: { data: RevenuePoint[] }) {
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
            name="Revenue"
          />
          <Line
            type="monotone"
            dataKey="payout"
            stroke="#f59e0b"
            strokeWidth={3}
            name="Payout"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
