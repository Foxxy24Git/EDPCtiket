"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Download, FileSpreadsheet, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import type { ServerLog } from "./TambahLogModal";

interface LogServerRekapCardProps {
  logs: ServerLog[];
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
}

function formatDateTime(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LogServerRekapCard({
  logs,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: LogServerRekapCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter logs yang valid / approved & pending (bukan pre-registered tanpa checkin)
  const validLogs = useMemo(() => {
    return logs.filter((l) => l.statusApproval !== "pre_registered");
  }, [logs]);

  const totalPages = Math.ceil(validLogs.length / pageSize) || 1;

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return validLogs.slice(start, start + pageSize);
  }, [validLogs, currentPage]);

  async function handleDownloadExcel() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/rekap/log-server?dari=${startDate}&sampai=${endDate}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Gagal mengunduh file rekap.");
        return;
      }
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `REKAP_LOG_SERVER_${startDate}_sd_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      alert("Terjadi kesalahan saat mengunduh laporan.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card padding="none" className="bg-white border border-gray-200 shadow-md rounded-2xl overflow-hidden flex flex-col h-full">
      {/* Card Header & Filter */}
      <div className="p-4 sm:p-5 border-b border-gray-200 bg-gray-50/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary-50 rounded-xl text-primary border border-primary-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Rekapan Log Server</h3>
              <p className="text-[11px] text-gray-500">Format Laporan Excel (.xlsx) &amp; Live Preview</p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleDownloadExcel}
            loading={downloading}
            className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Download Excel (.xlsx)
          </Button>
        </div>

        {/* Form Rentang Waktu */}
        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl p-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
          <span className="text-[10px] font-bold uppercase text-gray-400">Rentang Waktu:</span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                onStartDateChange(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-transparent border-0 p-0 font-semibold text-gray-700 outline-none cursor-pointer w-full"
            />
            <span className="text-gray-300">—</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                onEndDateChange(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-transparent border-0 p-0 font-semibold text-gray-700 outline-none cursor-pointer w-full"
            />
          </div>
        </div>
      </div>

      {/* Tabel Preview (Header Kotak Tegas - rounded-none) */}
      <div className="flex-1 overflow-x-auto min-h-[300px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white text-[11px] uppercase tracking-wider font-semibold border-b border-slate-700">
              <th className="px-3 py-2.5 text-center w-10 border-r border-slate-700 rounded-none">No</th>
              <th className="px-3 py-2.5 border-r border-slate-700 rounded-none">Nama Tamu</th>
              <th className="px-3 py-2.5 border-r border-slate-700 rounded-none">Instansi</th>
              <th className="px-3 py-2.5 border-r border-slate-700 rounded-none">Waktu Masuk</th>
              <th className="px-3 py-2.5 text-center rounded-none">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400 text-xs italic">
                  Tidak ada data rekapan pada rentang waktu ini.
                </td>
              </tr>
            ) : (
              paginatedLogs.map((item, idx) => {
                const rowNo = (currentPage - 1) * pageSize + idx + 1;
                return (
                  <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-3 py-2.5 text-center font-mono text-gray-500 border-r border-gray-200">
                      {rowNo}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-gray-900 border-r border-gray-200 truncate max-w-[120px]">
                      {item.namaOrang}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 border-r border-gray-200 truncate max-w-[110px]">
                      {item.instansi || "-"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 border-r border-gray-200 whitespace-nowrap text-[11px]">
                      {formatDateTime(item.waktuAkses)}
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.statusApproval === "approved"
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}>
                        {item.statusApproval === "approved" ? "Approved" : "Pending"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer: Laman 1, Laman 2, dst. */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
        <span className="text-[11px] font-medium text-gray-500">
          Total: <strong className="text-gray-900">{validLogs.length}</strong> data | Halaman <strong className="text-gray-900">{currentPage}</strong> dari {totalPages}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Laman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }).map((_, i) => {
            const pageNum = i + 1;
            const isCurrent = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                  isCurrent
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
              >
                Laman {pageNum}
              </button>
            );
          })}

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Laman Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
