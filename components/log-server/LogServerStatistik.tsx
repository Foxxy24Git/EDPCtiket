"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ServerLog } from "./TambahLogModal";

interface LogServerStatistikProps {
  logs: ServerLog[];
  loading?: boolean;
}

type StatPeriod = "harian" | "mingguan" | "bulanan";

function getLocalDateStr(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function LogServerStatistik({ logs, loading }: LogServerStatistikProps) {
  const [period, setPeriod] = useState<StatPeriod>("harian");
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; label: string; count: number } | null>(null);

  // 1. Data Trend Line Chart (Harian / Mingguan / Bulanan)
  const chartData = useMemo(() => {
    const map = new Map<string, number>();

    logs.forEach((log) => {
      if (!log.waktuAkses) return;
      const d = new Date(log.waktuAkses);
      if (isNaN(d.getTime())) return;

      if (period === "harian") {
        const key = getLocalDateStr(d);
        map.set(key, (map.get(key) || 0) + 1);
      } else if (period === "mingguan") {
        const weekNum = Math.ceil((d.getDate() - d.getDay() + 1) / 7);
        const key = `Minggu ${weekNum} (${d.toLocaleDateString("id-ID", { month: "short" })})`;
        map.set(key, (map.get(key) || 0) + 1);
      } else if (period === "bulanan") {
        const key = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
        map.set(key, (map.get(key) || 0) + 1);
      }
    });

    let items = Array.from(map.entries()).map(([label, count]) => ({ label, count }));

    if (period === "harian") {
      items.sort((a, b) => a.label.localeCompare(b.label));
      items = items.slice(-14).map((item) => {
        const parts = item.label.split("-");
        return { label: `${parts[2]}/${parts[1]}`, count: item.count };
      });
    }

    if (items.length === 0) {
      items = [
        { label: "Hari 1", count: 0 },
        { label: "Hari 2", count: 0 },
        { label: "Hari 3", count: 0 },
      ];
    }

    const maxCount = Math.max(...items.map((i) => i.count), 1);
    return { items, maxCount };
  }, [logs, period]);

  // SVG Line Chart Coordinate Path Generator
  const lineChartPath = useMemo(() => {
    const width = 800;
    const height = 180;
    const padding = 25;
    const { items, maxCount } = chartData;

    if (items.length === 0) return { d: "", fillD: "", points: [], width, height, padding };

    const stepX = (width - padding * 2) / Math.max(items.length - 1, 1);
    const points = items.map((item, idx) => {
      const x = padding + idx * stepX;
      const y = height - padding - (item.count / maxCount) * (height - padding * 2);
      return { x, y, label: item.label, count: item.count };
    });

    const d = points.reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      const prev = points[i - 1];
      const cx1 = prev.x + (pt.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (pt.x - prev.x) / 2;
      const cy2 = pt.y;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
    }, "");

    const fillD = `${d} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return { d, fillD, points, width, height, padding };
  }, [chartData]);

  // 2. Data Top 4 Instansi Dominan
  const topInstansi = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach((log) => {
      const name = log.instansi?.trim() || "Tidak Diketahui";
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [logs]);

  // 3. Data Top 4 PIC Pendamping Terbanyak
  const topPic = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach((log) => {
      const name = log.namaPic?.trim() || "Tanpa PIC";
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [logs]);

  const maxInstansiCount = Math.max(...topInstansi.map((i) => i.count), 1);
  const maxPicCount = Math.max(...topPic.map((i) => i.count), 1);

  // Jika sedang Loading Refresh: Tampilkan Skeleton Shimmer Preview Statistik
  if (loading) {
    return (
      <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm font-sans animate-pulse">
        {/* Skeleton Card Line Chart */}
        <div className="bg-slate-100 rounded-xl p-4 h-64 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="h-6 bg-slate-200 rounded-md w-36" />
            <div className="h-8 bg-slate-200 rounded-md w-48" />
          </div>
          <div className="h-40 bg-slate-200/60 rounded-xl w-full" />
        </div>

        {/* Skeleton Grid 2 Vertical Bar Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-100 rounded-xl p-4 h-56 flex flex-col justify-between">
            <div className="h-5 bg-slate-200 rounded-md w-32" />
            <div className="flex items-end justify-between h-36 gap-2 pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-1 bg-slate-200 rounded-t-lg h-[60%]" />
              ))}
            </div>
          </div>

          <div className="bg-slate-100 rounded-xl p-4 h-56 flex flex-col justify-between">
            <div className="h-5 bg-slate-200 rounded-md w-32" />
            <div className="flex items-end justify-between h-36 gap-2 pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-1 bg-slate-200 rounded-t-lg h-[80%]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm font-sans">
      
      {/* ── BAGAN UTAMA: Total Akses & SVG Line Chart ── */}
      <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 space-y-3">
        
        {/* Header: Total Akses & Filter Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Total Akses:</span>
            <span className="text-xl font-bold text-slate-900">{logs.length} Data</span>
          </div>

          {/* Selector Tabs: Harian | Mingguan | Bulanan */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setPeriod("harian")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                period === "harian" ? "bg-primary text-white shadow-2xs" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Harian
            </button>
            <button
              type="button"
              onClick={() => setPeriod("mingguan")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                period === "mingguan" ? "bg-primary text-white shadow-2xs" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Mingguan
            </button>
            <button
              type="button"
              onClick={() => setPeriod("bulanan")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                period === "bulanan" ? "bg-primary text-white shadow-2xs" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Bulanan
            </button>
          </div>
        </div>

        {/* SVG Line Chart Interactive */}
        <div className="relative pt-1">
          <svg viewBox="0 0 800 200" className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0056b3" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#0056b3" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            <line x1="25" y1="25" x2="775" y2="25" stroke="#e2e8f0" strokeDasharray="3 3" />
            <line x1="25" y1="90" x2="775" y2="90" stroke="#e2e8f0" strokeDasharray="3 3" />
            <line x1="25" y1="155" x2="775" y2="155" stroke="#e2e8f0" />

            {/* Area Fill */}
            {lineChartPath.fillD && (
              <motion.path
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                d={lineChartPath.fillD}
                fill="url(#lineGradient)"
              />
            )}

            {/* Main Smooth Line */}
            {lineChartPath.d && (
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                d={lineChartPath.d}
                fill="none"
                stroke="#0056b3"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}

            {/* Interactive Data Points */}
            {lineChartPath.points.map((pt, idx) => (
              <g key={idx}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4.5"
                  className="fill-primary stroke-white stroke-[2] hover:r-6 transition-all cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                <text x={pt.x} y="175" textAnchor="middle" className="text-[10px] font-medium fill-slate-500">
                  {pt.label}
                </text>
              </g>
            ))}
          </svg>

          {/* Hover Tooltip Overlay */}
          <AnimatePresence>
            {hoveredPoint && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-md border border-slate-800 pointer-events-none z-30 transform -translate-x-1/2"
                style={{
                  left: `${(hoveredPoint.x / lineChartPath.width) * 100}%`,
                  top: `${(hoveredPoint.y / lineChartPath.height) * 100 - 40}%`,
                }}
              >
                {hoveredPoint.label}: <span className="text-blue-300 font-semibold">{hoveredPoint.count} Akses</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── GRID 2 KOLOM: Top 4 Vertical Bar Charts (BAR VERTIKAL BERDIRI) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Box Top 4 Instansi Dominan (Bar Vertikal) */}
        <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 space-y-3">
          <div className="border-b border-slate-200/60 pb-2">
            <h3 className="text-xs font-semibold text-slate-800">Top 4 Instansi / Vendor</h3>
          </div>

          {topInstansi.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">Belum ada data instansi.</p>
          ) : (
            <div className="flex items-end justify-between h-40 gap-3 pt-4 px-2">
              {topInstansi.map((item, idx) => {
                const heightPercent = Math.max(15, Math.round((item.count / maxInstansiCount) * 100));
                return (
                  <div key={item.name} className="flex-1 flex flex-col items-center justify-end h-full group">
                    {/* Angka Jumlah di atas Bar */}
                    <span className="text-[11px] font-bold text-primary mb-1">{item.count} Data</span>
                    
                    {/* Batang Vertikal */}
                    <div className="w-full bg-slate-200/70 rounded-t-xl overflow-hidden h-28 flex items-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.08 }}
                        className="w-full bg-primary rounded-t-xl group-hover:bg-primary-dark transition-colors"
                      />
                    </div>

                    {/* Nama Instansi di bawah Bar */}
                    <span className="text-[10px] font-semibold text-slate-600 truncate max-w-[70px] mt-2 text-center" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Box Top 4 PIC Pendamping Terbanyak (Bar Vertikal) */}
        <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 space-y-3">
          <div className="border-b border-slate-200/60 pb-2">
            <h3 className="text-xs font-semibold text-slate-800">Top 4 PIC Pendamping</h3>
          </div>

          {topPic.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">Belum ada data PIC.</p>
          ) : (
            <div className="flex items-end justify-between h-40 gap-3 pt-4 px-2">
              {topPic.map((item, idx) => {
                const heightPercent = Math.max(15, Math.round((item.count / maxPicCount) * 100));
                return (
                  <div key={item.name} className="flex-1 flex flex-col items-center justify-end h-full group">
                    {/* Angka Jumlah di atas Bar */}
                    <span className="text-[11px] font-bold text-primary mb-1">{item.count} Data</span>
                    
                    {/* Batang Vertikal */}
                    <div className="w-full bg-slate-200/70 rounded-t-xl overflow-hidden h-28 flex items-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.08 }}
                        className="w-full bg-primary rounded-t-xl group-hover:bg-primary-dark transition-colors"
                      />
                    </div>

                    {/* Nama PIC di bawah Bar */}
                    <span className="text-[10px] font-semibold text-slate-600 truncate max-w-[70px] mt-2 text-center" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
