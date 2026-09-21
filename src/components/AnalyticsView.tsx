import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getAnalytics } from "../lib/api";

const COLORS = ["#1F6F54", "#B23A48", "#14213D", "#5B8A78", "#9C6B4F", "#6B5B95"];

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function AnalyticsView({ accountId }: { accountId: string }) {
  const [data, setData] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAnalytics(accountId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [accountId]);

  if (loading) {
    return (
      <div className="bg-white border border-ink/8 rounded-xl p-10 text-center">
        <p className="text-ink/35 text-sm">Loading analytics...</p>
      </div>
    );
  }

  const entries = data ? Object.entries(data) : [];

  if (entries.length === 0) {
    return (
      <div className="bg-white border border-ink/8 rounded-xl p-10 text-center">
        <p className="text-ink font-medium mb-1">No spending data yet</p>
        <p className="text-ink/45 text-sm">Debit transactions will show up here by category.</p>
      </div>
    );
  }

  const chartData = entries
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const total = chartData.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border border-ink/8 rounded-xl p-7">
        <p className="text-ink/45 text-xs font-medium uppercase tracking-wider mb-2">
          Total spending
        </p>
        <p className="font-mono text-3xl text-ink tracking-tight">{formatAmount(total)}</p>
      </div>

      <div className="bg-white border border-ink/8 rounded-xl p-7">
        <p className="text-sm font-medium text-ink mb-5">Spending by category</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="category"
              tick={{ fontSize: 11, fill: "#14213D99" }}
              axisLine={{ stroke: "#14213D14" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#14213D99" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${v}`}
            />
            <Tooltip
              formatter={(value: unknown) => formatAmount(Number(value || 0))}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #14213D14",
                fontSize: 12,
                fontFamily: "IBM Plex Mono, monospace",
              }}
            />
            <Bar dataKey="amount" fill="#1F6F54" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white border border-ink/8 rounded-xl p-7">
        <p className="text-sm font-medium text-ink mb-5">Category breakdown</p>
        <div className="flex items-center gap-8">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="amount"
                nameKey="category"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: unknown) => formatAmount(Number(value || 0))} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2.5 flex-1">
            {chartData.map((d, i) => (
              <div key={d.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-ink/70 font-medium">{d.category}</span>
                </div>
                <span className="font-mono text-ink/50">
                  {((d.amount / total) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}