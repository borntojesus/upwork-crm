"use client";

import { BarChart } from "@/components/charts/bar-chart";
import type { KeywordDensity } from "@/lib/fixtures";

interface Props {
  data: KeywordDensity[];
  height?: number;
}

export function KeywordDensityBar({ data, height = 260 }: Props) {
  const chartData = data.map((d) => ({
    keyword: d.keyword,
    weighted: Math.round(d.weighted * 100) / 100,
  }));
  return (
    <BarChart
      data={chartData}
      xKey="keyword"
      yKey="weighted"
      label="Weighted score"
      color="var(--color-chart-1)"
      height={height}
    />
  );
}
