"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, CalendarRange, Database, Users, Download, ChevronLeft, ChevronRight, X, BarChart2, ShieldAlert, Activity, Search, Filter, Clock, UserCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { LogServerTable } from "./LogServerTable";
import { LogServerStatistik } from "./LogServerStatistik";
import { DataPengunjungCrudModal } from "./DataPengunjungCrudModal";
import type { ServerLog } from "./TambahLogModal";

type FilterType = "semua" | "custom" | "statistik" | "audit";

function getLocalDateString(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

interface LogServerClientProps {
  currentUserNama: string;
  currentUserRole: string;
  currentUserId: string;
}

const ITEMS_PER_PAGE = 10;

export function LogServerClient({
  currentUserRole,
}: LogServerClientProps) {
  const [filter, setFilter] = useState<FilterType>("semua");
  const [showDateRange, setShowDateRange] = useState(false);
  const [logs, setLogs] = useState<ServerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataPengunjungModalOpen, setDataPengunjungModalOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [exporting, setExporting] = useState(false);

  // ── Audit state ────────────────────────────────────────────────────────────
  interface AuditLog {
    id: string;
    namaOrang: string;
    instansi: string;
    namaPic: string;
    statusApproval: string;
    createdAt: string;
    waktuAkses: string;
    pencatat: { id: string; nama: string; username: string; role: string } | null;
    approver: { id: string; nama: string; username: string; role: string } | null;
  }
  interface DeletedServerAudit {
    id: string;
    waktu: string;
    namaOrang: string;
    instansi: string;
    teks: string;
    deletedBy: string;
    deletedByUsername: string;
    deletedByRole: string;
  }

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditDeleted, setAuditDeleted] = useState<DeletedServerAudit[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Notification Toast state (Auto dismiss after 2s)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // State filter rentang waktu custom
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getLocalDateString(d);
  });
  const [endDate, setEndDate] = useState(() => getLocalDateString(new Date()));

  // Fetch log dengan JEDA TEPAT 0.5 DETIK (500ms) untuk efek refresh yang cepat & mulus
  const fetchLogs = useCallback(async (f: FilterType, start?: string, end?: string) => {
    setLoading(true);
    const startTime = Date.now();
    try {
      const targetFilter = f === "statistik" ? "semua" : f;
      let url = `/api/server-log?filter=${targetFilter}`;
      if (targetFilter === "custom" && start && end) {
        url += `&startDate=${start}&endDate=${end}`;
      }
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogs(data.logs ?? []);
      setLastRefresh(new Date());
      setCurrentPage(1);
    } catch {
      // tetap gunakan data lama jika error
    } finally {
      // Jeda 0.5 detik (500ms)
      const elapsed = Date.now() - startTime;
      if (elapsed < 500) {
        await new Promise((resolve) => setTimeout(resolve, 500 - elapsed));
      }
      setLoading(false);
    }
  }, []);

  const fetchAudit = useCallback(async (search = "", from = "", to = "") => {
    setAuditLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      const res = await fetch(`/api/server-audit?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAuditLogs(data.logs ?? []);
      setAuditDeleted(data.deletedServerAudit ?? []);
    } catch {
      // tetap gunakan data lama jika error
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (filter !== "audit") {
      fetchLogs(filter, startDate, endDate);
    }
  }, [filter, startDate, endDate, fetchLogs]);

  // Click outside to close date picker container
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        if (filter !== "custom") {
          setShowDateRange(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filter]);

  function handleFilterChange(f: FilterType) {
    if (f === filter && f !== "custom") return;
    setFilter(f);
    if (f === "custom") {
      setShowDateRange(true);
    } else {
      setShowDateRange(false);
    }
    if (f === "audit") {
      fetchAudit(auditSearch, auditFrom, auditTo);
    }
  }

  function toggleDateRange() {
    if (showDateRange) {
      setShowDateRange(false);
      setFilter("semua");
    } else {
      setShowDateRange(true);
      setFilter("custom");
    }
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2000); // Auto dismiss 2s
  }

  function handleLogAdded(log: ServerLog) {
    setLogs((prev) => [log, ...prev]);
    setLastRefresh(new Date());
    showToast("Data pengunjung berhasil disimpan ke peranti!");
  }

  // Aksi Keluar (Exit)
  async function handleExit(id: string) {
    try {
      const res = await fetch("/api/server-log", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "exit" }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Gagal merekam waktu keluar.");
        return;
      }
      showToast("Waktu keluar berhasil direkam!");
      await fetchLogs(filter, startDate, endDate);
    } catch {
      alert("Terjadi kesalahan koneksi.");
    }
  }

  // Aksi Approval
  async function handleApprove(id: string) {
    try {
      const res = await fetch("/api/server-log", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "approve" }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Gagal menyetujui log.");
        return;
      }
      showToast("Log akses berhasil disetujui!");
      await fetchLogs(filter, startDate, endDate);
    } catch {
      alert("Terjadi kesalahan koneksi.");
    }
  }

  // Export Data Log Server (Warna Utama Primary + Micro Animation)
  async function handleExportExcel() {
    setExporting(true);
    try {
      let exportUrl = "/api/rekap/log-server";
      if (filter === "custom" && startDate && endDate) {
        exportUrl += `?dari=${startDate}&sampai=${endDate}`;
      }
      const res = await fetch(exportUrl);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Gagal mengekspor laporan.");
        return;
      }
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filter === "custom" ? `REKAP_LOG_SERVER_${startDate}_sd_${endDate}.xlsx` : `REKAP_LOG_SERVER_SEMUA.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
      showToast("Data log server berhasil diunduh!");
    } catch {
      alert("Terjadi kesalahan saat mengunduh berkas.");
    } finally {
      setExporting(false);
    }
  }

  const formatRefreshTime = (d: Date) => {
    if (!mounted) return "--:--:--";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  };

  // Log pre-registered (antrean device) HANYA tampil di device kiosk & tab Antrean Device, tidak langsung masuk ke tabel utama sebelum foto & ttd lengkap
  const completedLogs = useMemo(() => {
    return logs.filter((l) => l.statusApproval !== "pre_registered");
  }, [logs]);

  // Data Pagination Math
  const totalItems = completedLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const paginatedLogs = completedLogs.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      
      {/* ── BARIS TOOLBAR UTAMA (Standalone Filter Buttons & Motion Animations) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-transparent py-1">
        
        {/* KIRI BAGAN: Standalone Filter Buttons (Rentang Waktu | Semua Data | Statistik) */}
        <div className="flex items-center gap-2 flex-wrap" ref={datePickerRef}>
          
          {/* Tombol Standalone Filter Waktu */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={toggleDateRange}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer border",
              showDateRange || filter === "custom"
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Filter Waktu</span>
          </motion.button>

          {/* Animasi Popup Date Picker (Keluar Dari Samping Filter) */}
          <AnimatePresence>
            {showDateRange && (
              <motion.div
                initial={{ opacity: 0, x: -12, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -12, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-3 py-1.5 shadow-sm text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Mulai</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setFilter("custom");
                    }}
                    className="text-xs bg-transparent border-0 p-0 text-gray-800 font-semibold outline-none cursor-pointer"
                  />
                </div>
                <span className="text-gray-300 font-bold">—</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Akhir</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setFilter("custom");
                    }}
                    className="text-xs bg-transparent border-0 p-0 text-gray-800 font-semibold outline-none cursor-pointer"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDateRange(false);
                    setFilter("semua");
                  }}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer ml-1"
                  title="Tutup Filter Tanggal"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tombol Standalone Semua Data */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => handleFilterChange("semua")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer border",
              filter === "semua" && !showDateRange
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Semua Data</span>
          </motion.button>

          {/* Tombol Standalone Statistik dengan Ikon BarChart2 */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => handleFilterChange("statistik")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer border",
              filter === "statistik"
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Statistik</span>
          </motion.button>

          {/* Tombol Standalone Log Audit Akses */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => handleFilterChange("audit")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer border",
              filter === "audit"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Log Audit</span>
          </motion.button>

          {/* Tombol Refresh dengan Animasi Menunggu Jeda 0.5s (500ms) */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => fetchLogs(filter, startDate, endDate)}
            disabled={loading}
            title={`Refresh data. Diperbarui: ${formatRefreshTime(lastRefresh)}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-primary transition-transform", loading && "animate-spin")} />
            <span className="hidden sm:inline">{loading ? "Menunggu..." : "Refresh"}</span>
          </motion.button>
        </div>

        {/* KANAN BAGAN: Action Buttons (Data Pengunjung & Export Data Primary) */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Tombol "Data Pengunjung" (Dapat diakses oleh seluruh pengguna) */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
            <Button
              size="sm"
              onClick={() => setDataPengunjungModalOpen(true)}
              className="text-xs font-bold bg-primary hover:bg-primary-dark"
            >
              <Users className="w-3.5 h-3.5 mr-1" />
              Data Pengunjung
            </Button>
          </motion.div>

          {/* Tombol Export Data */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="sm"
              onClick={handleExportExcel}
              loading={exporting}
              className="text-xs font-bold bg-primary hover:bg-primary-dark text-white border-0 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Export Data
            </Button>
          </motion.div>
        </div>
      </div>

      {/* ── CONTENT AREA: TABEL / STATISTIK / AUDIT ── */}
      {filter === "audit" ? (
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-indigo-900 mb-0.5">Audit Trail Log Server</p>
              <p className="text-xs text-indigo-700">
                Rekam jejak lengkap: siapa yang mencatat tamu, siapa yang menyetujui, dan histori penghapusan entri log server.
                Entri bertanda <span className="font-bold text-red-700 bg-red-100 px-1 rounded">HAPUS</span> tetap tersimpan permanen meskipun data sudah dihapus.
              </p>
            </div>
          </div>

          {/* Filter Audit */}
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap gap-3 items-end shadow-xs">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                <Filter className="w-3 h-3" /> Dari Tanggal
              </label>
              <input
                type="date"
                value={auditFrom}
                onChange={(e) => setAuditFrom(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-400 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Sampai Tanggal</label>
              <input
                type="date"
                value={auditTo}
                onChange={(e) => setAuditTo(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-400 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                <Search className="w-3 h-3" /> Cari
              </label>
              <input
                type="text"
                placeholder="Nama tamu, instansi, pencatat..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchAudit(auditSearch, auditFrom, auditTo)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-400 transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchAudit(auditSearch, auditFrom, auditTo)}
              disabled={auditLoading}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {auditLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Cari
            </button>
          </div>

          {/* Audit Timeline */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-md">
            {auditLoading ? (
              <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <p className="text-sm">Memuat log audit akses...</p>
              </div>
            ) : auditLogs.length === 0 && auditDeleted.length === 0 ? (
              <div className="py-14 text-center">
                <Activity className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Belum ada data audit dalam kriteria ini.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* Entri aktif */}
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          log.statusApproval === "approved"
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : log.statusApproval === "pending"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}>
                          {log.statusApproval === "approved" ? "APPROVED" : log.statusApproval === "pending" ? "PENDING" : log.statusApproval.toUpperCase()}
                        </span>
                        <span className="font-semibold text-sm text-gray-900">{log.namaOrang}</span>
                        {log.instansi && <span className="text-xs text-gray-500">· {log.instansi}</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-gray-500">Pencatat:</span>
                          {log.pencatat ? (
                            <span className="font-bold text-indigo-700">{log.pencatat.nama}</span>
                          ) : <span className="text-gray-400">—</span>}
                          {log.pencatat && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-1 ${
                              log.pencatat.role === "superadmin" ? "bg-gray-800 text-white" :
                              log.pencatat.role === "supervisi" ? "bg-blue-100 text-blue-800" :
                              "bg-green-100 text-green-800"
                            }`}>{log.pencatat.role.toUpperCase()}</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-gray-500">Approver:</span>
                          {log.approver ? (
                            <span className="font-bold text-emerald-700">{log.approver.nama}</span>
                          ) : <span className="italic text-gray-400">Belum disetujui</span>}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
                {/* Entri yang dihapus */}
                {auditDeleted.map((d) => (
                  <div key={d.id} className="flex items-start gap-4 px-5 py-4 bg-red-50/40 hover:bg-red-50/70 transition-colors">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                          HAPUS
                        </span>
                        <span className="font-semibold text-sm text-gray-900">{d.namaOrang}</span>
                        {d.instansi && <span className="text-xs text-gray-500">· {d.instansi}</span>}
                      </div>
                      <p className="text-xs bg-red-50 text-red-800 border border-red-200 font-semibold rounded-lg px-3 py-2 mt-1">
                        {d.teks}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Dihapus oleh: <span className="font-bold text-red-700">{d.deletedBy}</span>
                        <span className="font-mono ml-1 text-gray-400">@{d.deletedByUsername}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-1 ${
                          d.deletedByRole === "superadmin" ? "bg-gray-800 text-white" :
                          d.deletedByRole === "supervisi" ? "bg-blue-100 text-blue-800" :
                          "bg-green-100 text-green-800"
                        }`}>{d.deletedByRole.toUpperCase()}</span>
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {new Date(d.waktu).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : filter === "statistik" ? (
        <LogServerStatistik logs={logs} loading={loading} />
      ) : (
        /* BAGAN TABEL RIWAYAT AKSES UTAMA (Ukuran Konsisten & Tetap h-[540px]) */
        <Card padding="none" className="border border-gray-200 shadow-md rounded-2xl overflow-hidden w-full bg-white flex flex-col justify-between h-[540px]">
          <LogServerTable
            logs={paginatedLogs}
            loading={loading}
            currentUserRole={currentUserRole}
            onExit={handleExit}
            onApprove={handleApprove}
          />

          {/* FOOTER PAGINATION: Info Baris & Tombol Previous/Next */}
          {!loading && totalItems > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              {/* Info Kiri */}
              <div className="text-gray-500 font-medium">
                Menampilkan baris <span className="font-bold text-gray-900">{totalItems === 0 ? 0 : startIndex + 1}</span> - <span className="font-bold text-gray-900">{endIndex}</span> dari <span className="font-bold text-gray-900">{totalItems}</span> data
              </div>

              {/* Tombol Kanan: Previous & Next */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>

                <span className="px-2 text-gray-500 font-semibold">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Modal Data Pengunjung (Supervisi) */}
      <DataPengunjungCrudModal
        open={dataPengunjungModalOpen}
        onClose={() => setDataPengunjungModalOpen(false)}
        logs={logs}
        onRefresh={async () => {
          await fetchLogs(filter, startDate, endDate);
        }}
        onLogAdded={handleLogAdded}
        onToast={showToast}
      />

      {/* Toast Notification Pop Up Animation (Warna Utama Biru Primary, Auto Turun Setelah 2 Detik) */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 bg-primary text-white px-6 py-3.5 rounded-2xl shadow-2xl font-bold text-xs border border-primary-dark tracking-wide"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
