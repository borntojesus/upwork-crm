"use client";

import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface BarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  label?: string;
  color?: string;
  height?: number;
}

export function BarChart({
  data,
  xKey,
  yKey,
  label,
  color = "var(--color-chart-1)",
  height = 300,
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart
        data={data}
        margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border)"
          opacity={0.6}
        />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: "var(--color-popover)",
            color: "var(--color-popover-foreground)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
        />
        <Bar dataKey={yKey} name={label ?? yKey} radius={[4, 4, 0, 0]}>
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={color} />
          ))}
        </Bar>
      </ReBarChart>
    </ResponsiveContainer>
  );
}
