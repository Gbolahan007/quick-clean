// app/admin/_components/Charts.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Pure SVG charts — no external dependencies.
// BarChart: vertical bars with labels and value tooltips.
// ─────────────────────────────────────────────────────────────────────────────

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
  unit?: string;
}

export function BarChart({
  data,
  height = 200,
  color = "#7c9885",
  formatValue = (v) => String(v),
}: BarChartProps) {
  if (!data.length) return null;

  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.floor(560 / data.length) - 6;
  const chartWidth = data.length * (barWidth + 6);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${height + 40}`}
        width="100%"
        style={{ minWidth: Math.min(chartWidth, 300) }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((pct) => {
          const y = Math.round(height - pct * height);
          return (
            <line
              key={pct}
              x1={0}
              y1={y}
              x2={chartWidth}
              y2={y}
              stroke="#f0f0f0"
              strokeWidth={1}
            />
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = Math.round((d.value / max) * height);
          const x = i * (barWidth + 6);
          const y = height - barH;

          return (
            <g key={i}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                fill={color}
                rx={3}
                opacity={0.85}
              />
              {/* Value above bar (only if bar is tall enough) */}
              {barH > 20 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#666"
                >
                  {formatValue(d.value)}
                </text>
              )}
              {/* X-axis label */}
              <text
                x={x + barWidth / 2}
                y={height + 16}
                textAnchor="middle"
                fontSize={9}
                fill="#9ca3af"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Mini sparkline ─────────────────────────────────────────────────────────────

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function Sparkline({
  data,
  color = "#7c9885",
  width = 80,
  height = 24,
}: SparklineProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(" ");

  return (
    <svg width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Stat card with optional sparkline ─────────────────────────────────────────

interface ReportStatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: number[]; // sparkline data
  color?: string;
  trendColor?: string;
}

export function ReportStatCard({
  label,
  value,
  subtitle,
  trend,
  color = "text-[#0a1628]",
  trendColor = "#7c9885",
}: ReportStatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[22px] font-extrabold tracking-tight ${color}`}>
            {value}
          </p>
          <p className="text-[12px] text-gray-400 mt-0.5">{label}</p>
          {subtitle && (
            <p className="text-[11px] text-gray-300 mt-0.5">{subtitle}</p>
          )}
        </div>
        {trend && trend.length > 1 && (
          <div className="shrink-0 mt-1">
            <Sparkline data={trend} color={trendColor} />
          </div>
        )}
      </div>
    </div>
  );
}
