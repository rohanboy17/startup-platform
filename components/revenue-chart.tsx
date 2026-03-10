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
    <div className="h-[220px] overflow-hidden rounded-2xl bg-muted p-3 sm:h-80 sm:p-6">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
            minTickGap={24}
            tickMargin={8}
          />
          <YAxis tick={{ fontSize: 10 }} width={32} tickMargin={6} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
            name="Revenue"
          />
          <Line
            type="monotone"
            dataKey="payout"
            stroke="#f59e0b"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
            name="Payout"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
