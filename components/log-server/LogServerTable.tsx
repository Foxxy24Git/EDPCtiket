"use client";

import {
  Table,
  TableHead,
  TableBody,
  Th,
  Td,
} from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { ServerOff, LogOut, Loader2, ZoomIn, Image as ImageIcon } from "lucide-react";
import type { ServerLog } from "./TambahLogModal";
import { useState } from "react";

interface LogServerTableProps {
  logs: ServerLog[];
  loading: boolean;
  currentUserRole: string;
  onExit: (id: string) => Promise<void>;
  onApprove: (id: string) => Promise<void>;
}

function formatDateTime(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function FotoThumbnail({
  fotoUrl,
  nama,
  onClick,
}: {
  fotoUrl: string;
  nama: string;
  onClick: (e: React.MouseEvent, url: string) => void;
}) {
  const [imgError, setImgError] = useState(false);

  const displayUrl = fotoUrl.startsWith("/uploads/")
    ? `/api/uploads/${fotoUrl.replace("/uploads/", "")}`
    : fotoUrl;

  if (imgError) {
    return (
      <div
        className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-slate-100 rounded-md border border-slate-200 text-[10px] text-slate-400 font-medium mx-auto"
        title="File foto tidak dapat dimuat"
      >
        <ImageIcon className="w-3 h-3 text-slate-400 shrink-0" />
        <span>Foto</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full">
      <button
        type="button"
        onClick={(e) => onClick(e, displayUrl)}
        className="group relative inline-block rounded-lg overflow-hidden border border-slate-200 shadow-2xs hover:border-primary transition-all cursor-pointer mx-auto bg-slate-50"
        title="Klik untuk memperbesar foto"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displayUrl}
          alt={`Foto ${nama}`}
          onError={() => setImgError(true)}
          className="w-9 h-9 object-cover group-hover:scale-110 transition-transform duration-200"
        />
        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <ZoomIn className="w-3.5 h-3.5 text-white drop-shadow-xs" />
        </div>
      </button>
    </div>
  );
}

export function LogServerTable({
  logs,
  loading,
  currentUserRole,
  onExit,
  onApprove,
}: LogServerTableProps) {
  const [actionId, setActionId] = useState<string | null>(null);
  const [previewFoto, setPreviewFoto] = useState<{ url: string; nama: string } | null>(null);
  const [selectedRowLog, setSelectedRowLog] = useState<ServerLog | null>(null);

  async function handleExitClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setActionId(id);
    try {
      await onExit(id);
    } finally {
      setActionId(null);
    }
  }

  async function handleApproveClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setActionId(id);
    try {
      await onApprove(id);
    } finally {
      setActionId(null);
    }
  }

  return (
    <>
      <Table className="table-fixed w-full">
        <TableHead>
          <tr>
            <Th className="w-[16%]">Nama Orang</Th>
            <Th className="w-[12%]">Instansi</Th>
            <Th className="w-[14%]">Keperluan</Th>
            <Th className="w-[13%] text-center">Waktu Masuk</Th>
            <Th className="w-[13%] text-center">Waktu Keluar</Th>
            <Th className="w-[7%] text-center">Foto</Th>
            <Th className="w-[11%]">Dicatat Oleh</Th>
            <Th className="w-[14%] text-center">Approval</Th>
          </tr>
        </TableHead>
        <TableBody>
          {loading ? (
            /* Skeleton Loading Rows */
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="border-b border-gray-100 animate-pulse bg-gray-50/40">
                <Td><div className="h-4 bg-gray-200/80 rounded-md w-28" /></Td>
                <Td><div className="h-4 bg-gray-200/80 rounded-md w-24" /></Td>
                <Td><div className="h-4 bg-gray-200/60 rounded-md w-36" /></Td>
                <Td className="text-center"><div className="h-4 bg-gray-200/70 rounded-md w-24 mx-auto" /></Td>
                <Td className="text-center"><div className="h-4 bg-gray-200/70 rounded-md w-24 mx-auto" /></Td>
                <Td className="text-center"><div className="w-8 h-8 bg-gray-200/80 rounded-lg mx-auto" /></Td>
                <Td><div className="h-4 bg-gray-200/70 rounded-md w-20" /></Td>
                <Td className="text-center"><div className="h-5 bg-gray-200/80 rounded-full w-24 mx-auto" /></Td>
              </tr>
            ))
          ) : logs.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-12 text-center text-gray-400">
                <div className="flex flex-col items-center justify-center gap-2">
                  <ServerOff className="w-9 h-9 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">Belum ada riwayat akses server pada periode ini.</p>
                </div>
              </td>
            </tr>
          ) : (
            logs.map((log, idx) => (
              <tr
                key={log.id + idx}
                onClick={() => setSelectedRowLog(log)}
                className="border-b border-gray-100 hover:bg-blue-50/50 hover:scale-[1.005] hover:shadow-xs hover:z-10 transition-all duration-200 cursor-pointer"
              >
                {/* Nama Orang */}
                <Td className="font-semibold text-gray-900 whitespace-nowrap !align-middle">{log.namaOrang}</Td>

                {/* Instansi */}
                <Td className="font-medium text-gray-700 whitespace-nowrap !align-middle">{log.instansi || "-"}</Td>

                {/* Keperluan */}
                <Td className="text-gray-500 max-w-[180px] truncate !align-middle" title={log.keperluan ?? "-"}>
                  {log.keperluan ?? <span className="text-gray-300">—</span>}
                </Td>

                {/* Waktu Masuk */}
                <Td className="text-center whitespace-nowrap !align-middle font-medium text-gray-700 text-xs">
                  {formatDateTime(log.waktuAkses)}
                </Td>

                {/* Waktu Keluar */}
                <Td className="text-center whitespace-nowrap !align-middle">
                  {log.waktuKeluar ? (
                    <span className="text-xs text-gray-700 font-medium">{formatDateTime(log.waktuKeluar)}</span>
                  ) : (
                    <button
                      type="button"
                      disabled={actionId !== null}
                      onClick={(e) => handleExitClick(e, log.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold shadow-2xs transition-all duration-150 disabled:opacity-50"
                    >
                      {actionId === log.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <LogOut className="w-3 h-3" />
                      )}
                      Keluar
                    </button>
                  )}
                </Td>

                {/* Foto Thumbnail */}
                <Td className="text-center !align-middle">
                  {log.fotoUrl ? (
                    <FotoThumbnail
                      fotoUrl={log.fotoUrl}
                      nama={log.namaOrang}
                      onClick={(e, url) => {
                        e.stopPropagation();
                        setPreviewFoto({ url, nama: log.namaOrang });
                      }}
                    />
                  ) : (
                    <span className="text-gray-300 text-xs block text-center">—</span>
                  )}
                </Td>

                {/* Dicatat Oleh */}
                <Td className="text-gray-700 !align-middle">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="font-semibold text-gray-900">{log.pencatat?.nama || "-"}</span>
                    {log.pencatat?.username && (
                      <span className="text-[11px] text-gray-400 font-normal">(@{log.pencatat.username})</span>
                    )}
                  </div>
                </Td>

                {/* Kolom Approval: Approved / Pending / Tombol Setujui */}
                <Td className="text-center whitespace-nowrap !align-middle">
                  {log.statusApproval === "approved" ? (
                    <div className="inline-flex items-center justify-center text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full" title={`Disetujui oleh ${log.approver?.nama || "Supervisi"}`}>
                      Approved
                    </div>
                  ) : (currentUserRole === "supervisi" || currentUserRole === "superadmin") ? (
                    <button
                      type="button"
                      disabled={actionId !== null}
                      onClick={(e) => handleApproveClick(e, log.id)}
                      className="inline-flex items-center justify-center px-3 py-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-xs font-bold shadow-2xs transition-all duration-150 disabled:opacity-50 cursor-pointer"
                    >
                      {actionId === log.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Setujui"
                      )}
                    </button>
                  ) : (
                    <div className="inline-flex items-center justify-center text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full font-bold">
                      Pending
                    </div>
                  )}
                </Td>
              </tr>
            ))
          )}
        </TableBody>
      </Table>

      {/* MODAL PREVIEW DETAIL LOG AKSES (Klik Baris Tabel) */}
      <Modal
        open={Boolean(selectedRowLog)}
        onClose={() => setSelectedRowLog(null)}
        size="lg"
      >
        {selectedRowLog && (
          <div className="space-y-3 p-1">
            {/* Grid Rincian Data (Termasuk Nama Supervisi / Approver) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs border-b border-slate-100 pb-3">
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Nama Tamu:</span>
                <span className="font-bold text-slate-900">{selectedRowLog.namaOrang}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Instansi:</span>
                <span className="font-bold text-slate-900">{selectedRowLog.instansi || "-"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">PIC Pendamping:</span>
                <span className="font-semibold text-slate-800">{selectedRowLog.namaPic || "-"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Keperluan Akses:</span>
                <span className="font-medium text-slate-800">{selectedRowLog.keperluan || "-"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Waktu Masuk:</span>
                <span className="font-semibold text-emerald-700">{formatDateTime(selectedRowLog.waktuAkses)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Waktu Keluar:</span>
                <span className="font-semibold text-amber-700">{formatDateTime(selectedRowLog.waktuKeluar)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Dicatat Oleh:</span>
                <span className="font-semibold text-slate-800">{selectedRowLog.pencatat?.nama || "-"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Nama Supervisi (Approver):</span>
                <span className="font-bold text-primary">{selectedRowLog.approver?.nama || "-"}</span>
              </div>
            </div>

            {/* Grid Bukti Foto & Tanda Tangan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Box Foto Pengunjung */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-800 block">Foto Pengunjung</span>
                <div className="h-[180px] w-full rounded-xl overflow-hidden bg-slate-100/60 flex items-center justify-center border border-slate-200 p-1">
                  {selectedRowLog.fotoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={selectedRowLog.fotoUrl.startsWith("/uploads/") ? `/api/uploads/${selectedRowLog.fotoUrl.replace("/uploads/", "")}` : selectedRowLog.fotoUrl}
                      alt={`Foto ${selectedRowLog.namaOrang}`}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                      className="max-h-[170px] max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-slate-400 text-xs font-medium">Foto tidak tersedia</span>
                  )}
                </div>
              </div>

              {/* Box Tanda Tangan Digital */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-800 block">Tanda Tangan Digital</span>
                <div className="h-[180px] w-full rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center border border-slate-200 p-1">
                  {selectedRowLog.ttdUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={selectedRowLog.ttdUrl}
                      alt={`Signature ${selectedRowLog.namaOrang}`}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                      className="max-h-[170px] max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-slate-400 text-xs font-medium">Tanda tangan belum dibubuhkan</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Preview Foto Standalone */}
      <Modal
        open={Boolean(previewFoto)}
        onClose={() => setPreviewFoto(null)}
        title={`Foto Akses: ${previewFoto?.nama ?? ""}`}
        size="md"
      >
        {previewFoto && (
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200 max-h-[70vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewFoto.url}
                alt={previewFoto.nama}
                className="w-full max-h-[70vh] object-contain"
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
