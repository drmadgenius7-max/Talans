"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Pie, PieChart, Legend } from "recharts";
import { toDecimalString } from "@/lib/money";

const PIE_COLORS = ["#186555", "#dc8c17", "#2b9a80", "#f0c052", "#4bb599", "#eba82a", "#7ad0b6", "#f5d98d"];

function monthLabel(key: string) {
  const [, month] = key.split("-");
  const names = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  return names[Number(month) - 1] ?? key;
}

export function MonthlyTrendChart({ data, currency }: { data: { month: string; amount: number }[]; currency: string }) {
  const chartData = data.map((d) => ({ name: monthLabel(d.month), value: Number(toDecimalString(d.amount, currency)) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis fontSize={12} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13, direction: "rtl" }}
          formatter={(value: number) => [`${value.toLocaleString()} ${currency}`, "المصروف"]}
        />
        <Bar dataKey="value" fill="#186555" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryPieChart({ data, currency }: { data: { label: string; amount: number }[]; currency: string }) {
  const chartData = data.map((d) => ({ name: d.label, value: Number(toDecimalString(d.amount, currency)) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13, direction: "rtl" }}
          formatter={(value: number) => [`${value.toLocaleString()} ${currency}`, ""]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
