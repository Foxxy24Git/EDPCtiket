"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { BrandStat } from "@/lib/dashboardQueries";

const COLORS = [
  "#00569E", // Blue
  "#D97706", // Amber / EDC
  "#059669", // Emerald
  "#0284C7", // Sky Blue
  "#7C3AED", // Purple
  "#EC4899", // Pink
  "#8B5CF6", // Violet
  "#64748B", // Slate
];

interface Props {
  data: BrandStat[];
}

export function BarChartMerek({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Belum ada data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }} barSize={36}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="merek"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(value: ValueType | undefined) => [`${value ?? 0} tiket`, "Jumlah"]}
          contentStyle={{
            borderRadius: "10px",
            border: "1px solid #e5e7eb",
            fontSize: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          }}
          cursor={{ fill: "#f0f7ff" }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((_, index) => (
            <Cell key={`bar-cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
