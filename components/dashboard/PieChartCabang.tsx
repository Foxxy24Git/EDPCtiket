"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type PieLabelRenderProps,
} from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import type { BranchStat } from "@/lib/dashboardQueries";

const COLORS = [
  "#00569E", "#0D9BD2", "#FFB800", "#10B981", "#8B5CF6",
  "#F43F5E", "#F97316", "#06B6D4",
];

interface Props {
  data: BranchStat[];
}

const renderCustomLabel = (props: PieLabelRenderProps) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (!cx || !cy || midAngle === undefined || !innerRadius || !outerRadius || !percent) return null;
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const ri = typeof innerRadius === 'number' ? innerRadius : 0;
  const ro = typeof outerRadius === 'number' ? outerRadius : 0;
  const radius = ri + (ro - ri) * 0.5;
  const x = (typeof cx === 'number' ? cx : 0) + radius * Math.cos(-midAngle * RADIAN);
  const y = (typeof cy === 'number' ? cy : 0) + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function PieChartCabang({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Belum ada data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="cabang"
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={52}
          labelLine={false}
          label={renderCustomLabel}
          strokeWidth={2}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: ValueType | undefined, name: NameType | undefined) => [
            `${value ?? 0} tiket`,
            (name as string) ?? "",
          ]}
          contentStyle={{
            borderRadius: "10px",
            border: "1px solid #e5e7eb",
            fontSize: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value: string) =>
            value.length > 18 ? value.slice(0, 16) + "…" : value
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
