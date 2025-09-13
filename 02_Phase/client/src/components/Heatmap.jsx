// Heatmap.jsx
import React, { useMemo, useState } from "react";

/**
 * days: [{date:'YYYY-MM-DD', count: N}, ...] ordered ascending
 * Renders columns = weeks (like GitHub), rows = weekdays (0-6)
 */

function colorForCount(cnt) {
  if (cnt === 0) return "#ebedf0";
  if (cnt < 2) return "#c6e48b";
  if (cnt < 5) return "#7bc96f";
  if (cnt < 10) return "#239a3b";
  return "#196127";
}

export default function Heatmap({ days = [], cellSize = 12, gap = 3 }) {
  const [tip, setTip] = useState(null);

  // Build weeks array: GitHub returns weeks already but our earlier flatten gave days ascending.
  // We'll convert days to map by date, then build columns: start from earliest date and group into weeks.
  const { weeks, maxCount } = useMemo(() => {
    if (!days || days.length === 0) return { weeks: [], maxCount: 0 };
    const map = new Map(days.map(d => [d.date, d.count]));
    const firstDate = new Date(days[0].date);
    const lastDate = new Date(days[days.length - 1].date);

    // back up to Sunday (start of week) for first column
    const start = new Date(firstDate);
    const dayOfWeek = start.getUTCDay(); // 0 = Sunday
    start.setUTCDate(start.getUTCDate() - dayOfWeek);

    // build week columns until lastDate
    const weeks = [];
    let cur = new Date(start);
    let max = 0;
    while (cur <= lastDate) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(cur);
        const iso = d.toISOString().slice(0, 10);
        const count = map.has(iso) ? map.get(iso) : 0;
        week.push({ date: iso, count });
        if (count > max) max = count;
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      weeks.push(week);
    }
    return { weeks, maxCount: max };
  }, [days]);

  if (!weeks.length) return <div className="text-sm text-gray-500">No contribution data</div>;

  const width = weeks.length * (cellSize + gap);
  const height = 7 * (cellSize + gap);

  return (
    <div className="relative">
      <svg width={width} height={height} style={{ display: "block" }}>
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            const x = wi * (cellSize + gap);
            const y = di * (cellSize + gap);
            const fill = colorForCount(day.count);
            return (
              <rect
                key={`${wi}-${di}`}
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                rx={2}
                fill={fill}
                stroke="#ffffff"
                onMouseEnter={e => setTip({ x: e.clientX, y: e.clientY, date: day.date, count: day.count })}
                onMouseLeave={() => setTip(null)}
              />
            );
          })
        )}
      </svg>

      {tip && (
        <div
          className="px-2 py-1 rounded text-sm bg-black text-white z-50 fixed pointer-events-none"
          style={{ left: tip.x + 12, top: tip.y - 12 }}
        >
          <div>{tip.date}</div>
          <div className="text-xs">{tip.count} contribution{tip.count !== 1 ? "s" : ""}</div>
        </div>
      )}
    </div>
  );
}
