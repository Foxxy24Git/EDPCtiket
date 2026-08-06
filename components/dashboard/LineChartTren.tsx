"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { DailyTrend } from "@/lib/dashboardQueries";

interface Props {
  data: DailyTrend[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function LineChartTren({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Belum ada data
      </div>
    );
  }

  // Only label every 5th day to avoid crowding
  const formattedData = data.map((d, i) => ({
    ...d,
    label: i % 5 === 0 || i === data.length - 1 ? formatDate(d.date) : "",
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={formattedData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00569E" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#00569E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          labelFormatter={(label) => label ? `${label}` : ""}
          formatter={(value: ValueType | undefined) => [`${value ?? 0} tiket`, "Jumlah"]}
          contentStyle={{
            borderRadius: "10px",
            border: "1px solid #e5e7eb",
            fontSize: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#00569E"
          strokeWidth={2.5}
          fill="url(#trendGradient)"
          dot={false}
          activeDot={{ r: 5, fill: "#00569E", stroke: "#fff", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
