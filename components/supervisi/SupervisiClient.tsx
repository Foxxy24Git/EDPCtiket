"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, ShieldCheck, CheckCircle2, FileText, Activity, Search,
  Trash2, Clock, Edit3, Truck, ArrowRight, Building,
  Filter, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  Table, TableHead, TableBody, TableRow, Th, Td,
} from "@/components/ui/Table";
import { fmtDateTime } from "@/lib/format";
import type { TicketListItem, TicketDetail } from "@/lib/ticketQueries";

interface Props {
  initialTickets: TicketListItem[];
  role: string;
}

// ── Helpers untuk klasifikasi aksi dari teks aktivitas ──
type AksiType = "buat" | "approve" | "hapus" | "vendor" | "selesai" | "update" | "cabang" | "lainnya";

function classifyAksi(teks: string): AksiType {
  const t = teks.toLowerCase();
  if (t.startsWith("tiket dihapus")) return "hapus";
  if (t.includes("disetujui (approved)") || t.includes("approve")) return "approve";
  if (t.includes("penyerahan ke cabang")) return "cabang";
  if (t.includes("penyerahan ke vendor") || t.includes("pengembalian dari vendor")) return "vendor";
  if (t.includes("tiket ditutup") || t.includes("close") || t.includes("selesai")) return "selesai";
  if (t.includes("memperbarui rincian")) return "update";
  return "lainnya";
}

function AksiBadge({ teks }: { teks: string }) {
  const aksi = classifyAksi(teks);
  const map: Record<AksiType, { label: string; className: string }> = {
    buat:    { label: "BUAT",    className: "bg-blue-100 text-blue-800 border border-blue-200" },
    update:  { label: "UPDATE",  className: "bg-amber-100 text-amber-800 border border-amber-200" },
    vendor:  { label: "VENDOR",  className: "bg-purple-100 text-purple-800 border border-purple-200" },
    selesai: { label: "SELESAI", className: "bg-green-100 text-green-800 border border-green-200" },
    approve: { label: "APPROVE", className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
    hapus:   { label: "HAPUS",   className: "bg-red-100 text-red-700 border border-red-200 font-extrabold" },
    cabang:  { label: "CABANG",  className: "bg-teal-100 text-teal-800 border border-teal-200" },
    lainnya: { label: "LOG",     className: "bg-gray-100 text-gray-600 border border-gray-200" },
  };
  const { label, className } = map[aksi];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${className}`}>
      {label}
    </span>
  );
}

function AksiIcon({ teks }: { teks: string }) {
  const aksi = classifyAksi(teks);
  const cls = "w-4 h-4 shrink-0";
  switch (aksi) {
    case "buat":    return <FileText className={`${cls} text-blue-600`} />;
    case "update":  return <Edit3 className={`${cls} text-amber-500`} />;
    case "vendor":  return <Truck className={`${cls} text-purple-600`} />;
    case "selesai": return <CheckCircle2 className={`${cls} text-green-600`} />;
    case "approve": return <ShieldCheck className={`${cls} text-emerald-600`} />;
    case "hapus":   return <Trash2 className={`${cls} text-red-600`} />;
    case "cabang":  return <Building className={`${cls} text-teal-600`} />;
    default:        return <Activity className={`${cls} text-gray-500`} />;
  }
}

export function SupervisiClient({ initialTickets }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"approve" | "log">("approve");

  // ── Tab 1: Approve state ─────────────────────────────────────────────────
  const [tickets, setTickets] = useState<TicketListItem[]>(initialTickets);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState<string | null>(null);

  // ── Tab 2: Log Aktivitas state ────────────────────────────────────────────
  interface ActivityEntry {
    id: string;
    waktu: string;
    teks: string;
    user: { id: string; nama: string; username: string; role: string };
    ticket: { id: string; noTiket: string; wsCabang: string; wsMerekKomputer: string | null; status: string; statusSupervisi: string } | null;
  }
  interface DeletedAuditEntry {
    id: string;
    waktu: string;
    noTiket: string;
    wsCabang: string;
    teks: string;
    deletedBy: string;
    deletedByUsername: string;
    deletedByRole: string;
  }

  const [logActivities, setLogActivities] = useState<ActivityEntry[]>([]);
  const [logDeleted, setLogDeleted] = useState<DeletedAuditEntry[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logLoading, setLogLoading] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [logFrom, setLogFrom] = useState("");
  const [logTo, setLogTo] = useState("");

  const fetchLog = useCallback(async (page = 1, search = "", from = "", to = "") => {
    setLogLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page) });
      if (search) q.set("search", search);
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      const res = await fetch(`/api/ticket-audit?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogActivities(data.activities ?? []);
        setLogDeleted(data.deletedAudit ?? []);
        setLogTotal(data.total ?? 0);
        setLogPage(page);
      }
    } catch (e) {
      console.error("Gagal memuat log aktivitas:", e);
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "log") {
      fetchLog(1);
    }
  }, [activeTab, fetchLog]);

  // ── Tab 1 handlers ────────────────────────────────────────────────────────
  const fetchDetail = async (id: string) => {
    setSelectedTicketId(id);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/tickets/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.item);
      }
    } catch (err) {
      console.error("Gagal memuat detail tiket:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedTicket) return;
    setApproving(true);
    setApproveError("");
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/approve-workstation`, { method: "POST" });
      let data: { error?: string } = {};
      try { data = await res.json(); } catch { /* ignore */ }
      if (!res.ok) {
        setApproveError(data.error ?? `Gagal menyetujui tiket (${res.status}).`);
        return;
      }
      const noTiket = selectedTicket.noTiket;
      setShowSuccessModal(noTiket);
      setTickets((prev) => prev.filter((t) => t.id !== selectedTicket.id));
      setSelectedTicket(null);
      setSelectedTicketId(null);
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : "Terjadi kesalahan koneksi.");
    } finally {
      setApproving(false);
    }
  };

  const perPage = 50;
  const totalPages = Math.max(1, Math.ceil(logTotal / perPage));

  // Gabung aktivitas + audit hapus, urutkan terbaru
  const allLogEntries = [
    ...logActivities.map((a) => ({
      key: a.id,
      waktu: a.waktu,
      teks: a.teks,
      userName: a.user.nama,
      userUsername: a.user.username,
      userRole: a.user.role,
      noTiket: a.ticket?.noTiket ?? "—",
      wsCabang: a.ticket?.wsCabang ?? "—",
      isDeleted: false,
    })),
    ...logDeleted.map((d) => ({
      key: d.id,
      waktu: d.waktu,
      teks: d.teks,
      userName: d.deletedBy,
      userUsername: d.deletedByUsername,
      userRole: d.deletedByRole,
      noTiket: d.noTiket,
      wsCabang: d.wsCabang,
      isDeleted: true,
    })),
  ].sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime());

  return (
    <div className="space-y-4">
      {/* Tab Bar */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab("approve")}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === "approve"
              ? "border-primary text-primary bg-primary-50/20"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Antrian Approval
          {tickets.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-extrabold text-white bg-red-500 rounded-full min-w-[18px] h-4">
              {tickets.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("log")}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === "log"
              ? "border-primary text-primary bg-primary-50/20"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Activity className="w-4 h-4" />
          Log Aktivitas Tiket
        </button>
      </div>

      {/* ── TAB 1: ANTRIAN APPROVAL ── */}
      {activeTab === "approve" && (
        <>
          <Card padding="none" className="overflow-hidden">
            {tickets.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">
                <CheckCircle2 className="w-10 h-10 text-green-300 mx-auto mb-2" />
                Tidak ada tiket workstation yang menunggu approval.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <Th>No Tiket</Th>
                      <Th>Cabang</Th>
                      <Th>Tanggal Masuk</Th>
                      <Th>Merek Perangkat</Th>
                      <Th>Status</Th>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tickets.map((t) => (
                      <TableRow key={t.id} className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => fetchDetail(t.id)}>
                        <Td className="font-mono font-semibold text-primary">{t.noTiket}</Td>
                        <Td className="font-medium text-gray-900">{t.wsCabang}</Td>
                        <Td className="text-xs">{t.wsTanggalMasuk ? fmtDateTime(t.wsTanggalMasuk) : "—"}</Td>
                        <Td>{t.wsMerekKomputer || "—"}</Td>
                        <Td>
                          {t.status === "selesai" ? (
                            <Badge variant="info">Selesai — Menunggu Approval</Badge>
                          ) : (
                            <Badge variant="warning">Dalam Proses</Badge>
                          )}
                        </Td>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          {/* Modal Detail */}
          <Modal
            open={Boolean(selectedTicketId)}
            onClose={() => { setSelectedTicketId(null); setSelectedTicket(null); setApproveError(""); }}
            title="Detail Pekerjaan Workstation"
            size="lg"
          >
            {loadingDetail ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm">Memuat detail pekerjaan...</p>
              </div>
            ) : (
              selectedTicket && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-b border-gray-100 pb-4">
                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase">Nomor Tiket</span>
                      <span className="font-mono text-base font-bold text-primary">{selectedTicket.noTiket}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase">Cabang / Capem</span>
                      <span className="font-semibold text-gray-800">{selectedTicket.wsCabang} {selectedTicket.wsCapem ? `(Capem ${selectedTicket.wsCapem})` : ""}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase">Merek / Tipe Komputer</span>
                      <span className="font-semibold text-gray-800">{selectedTicket.wsMerekKomputer || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-gray-400 uppercase">Serial Number (SN)</span>
                      <span className="font-mono font-semibold text-gray-800">{selectedTicket.wsSnKomputer || "—"}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                    <div className="space-y-3">
                      <div>
                        <span className="block text-xs font-semibold text-gray-400 uppercase">Kelengkapan Perangkat</span>
                        <p className="text-gray-700 mt-0.5">{selectedTicket.wsKelengkapan || "—"}</p>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-gray-400 uppercase">Deskripsi Kerusakan</span>
                        <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">{selectedTicket.wsKerusakan}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="block text-xs font-semibold text-gray-400 uppercase">Contact Person Pelapor</span>
                        <p className="text-gray-700 mt-0.5">
                          {selectedTicket.cpTipe === "wag"
                            ? `WAG: ${selectedTicket.cpNama}`
                            : `${selectedTicket.cpNama} (${selectedTicket.cpTelp || "—"})`}
                        </p>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-gray-400 uppercase">Penanganan Pertama IT Support</span>
                        <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">{selectedTicket.activities[0]?.teks || "—"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <span className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                      Riwayat Kronologi & Log Aktivitas ({selectedTicket.activities.length})
                    </span>
                    <div className="max-h-[220px] overflow-y-auto pr-2 border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                      <ol className="relative border-l border-indigo-200 ml-2 space-y-3">
                        {selectedTicket.activities.map((a) => (
                          <li key={a.id} className="ml-4 relative text-sm">
                            <span className="absolute -left-[17px] mt-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white" />
                            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                              <span className="font-semibold text-gray-800">{a.userNama}</span>
                              <span>{fmtDateTime(a.waktu)}</span>
                            </div>
                            <p className="text-gray-800 mt-1 bg-white p-2 rounded-lg border border-gray-100 whitespace-pre-wrap text-xs shadow-2xs">{a.teks}</p>
                          </li>
                        ))}
                        {selectedTicket.activities.length === 0 && (
                          <p className="text-xs text-gray-400 ml-2 py-2 text-center">Tidak ada log aktivitas.</p>
                        )}
                      </ol>
                    </div>
                  </div>
                  {approveError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{approveError}</p>
                  )}
                  <div className="sticky bottom-0 bg-white pt-3 pb-1 border-t border-gray-100 flex flex-wrap justify-end gap-2 z-10">
                    <Button type="button" variant="outline" onClick={() => router.push(`/daily-monitoring/${selectedTicket.id}`)}>
                      <FileText className="w-4 h-4 mr-1 text-primary" /> Lihat Detail & Kronologi
                    </Button>
                    <Button variant="secondary" onClick={() => { setSelectedTicketId(null); setSelectedTicket(null); setApproveError(""); }} disabled={approving}>
                      Tutup
                    </Button>
                    <Button onClick={handleApprove} loading={approving} className="bg-green-600 hover:bg-green-700 text-white font-bold">
                      <ShieldCheck className="w-4 h-4 mr-1" /> Approve Pekerjaan
                    </Button>
                  </div>
                </div>
              )
            )}
          </Modal>

          <Modal open={Boolean(showSuccessModal)} onClose={() => setShowSuccessModal(null)} title="" size="sm">
            <div className="flex flex-col items-center justify-center text-center p-4">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-4 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Approval Berhasil!</h3>
              <p className="text-sm text-gray-500 mb-4">
                Tiket workstation nomor <span className="font-bold font-mono text-green-700">{showSuccessModal}</span> telah disetujui dan ditandai selesai.
              </p>
              <Button onClick={() => setShowSuccessModal(null)} className="w-full">Tutup</Button>
            </div>
          </Modal>
        </>
      )}

      {/* ── TAB 2: LOG AKTIVITAS TIKET ── */}
      {activeTab === "log" && (
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
            <Activity className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-indigo-900 mb-0.5">Audit Trail Aktivitas Tiket</p>
              <p className="text-xs text-indigo-700">
                Rekam jejak lengkap seluruh aksi pada tiket: siapa yang membuat, memperbarui, menyelesaikan, mengapprove, maupun menghapus tiket.
                Entri bertanda <span className="font-bold text-red-700 bg-red-100 px-1 rounded">HAPUS</span> tetap tersimpan permanen meskipun tiket sudah dihapus.
              </p>
            </div>
          </div>

          {/* Filter */}
          <Card padding="md" className="space-y-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Dari Tanggal
                </label>
                <input
                  type="date"
                  value={logFrom}
                  onChange={(e) => setLogFrom(e.target.value)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-400 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Sampai Tanggal</label>
                <input
                  type="date"
                  value={logTo}
                  onChange={(e) => setLogTo(e.target.value)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-400 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                  <Search className="w-3 h-3" /> Cari
                </label>
                <input
                  type="text"
                  placeholder="No tiket, nama user, cabang..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchLog(1, logSearch, logFrom, logTo)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-400 transition-colors"
                />
              </div>
              <Button onClick={() => fetchLog(1, logSearch, logFrom, logTo)} disabled={logLoading} className="shrink-0">
                {logLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Cari Log
              </Button>
            </div>
          </Card>

          {/* Log Timeline */}
          <Card padding="none" className="overflow-hidden">
            {logLoading ? (
              <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm">Memuat log aktivitas...</p>
              </div>
            ) : allLogEntries.length === 0 ? (
              <div className="py-14 text-center">
                <Activity className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Belum ada log aktivitas tiket dalam kriteria ini.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {allLogEntries.map((entry) => (
                  <div
                    key={entry.key}
                    className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors ${entry.isDeleted ? "bg-red-50/30" : ""}`}
                  >
                    <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${entry.isDeleted ? "bg-red-100" : "bg-indigo-50"}`}>
                      <AksiIcon teks={entry.teks} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <AksiBadge teks={entry.teks} />
                        <span className="font-semibold text-sm text-gray-900 truncate">{entry.userName}</span>
                        <span className="text-xs text-gray-400 font-mono">@{entry.userUsername}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          entry.userRole === "superadmin" ? "bg-gray-800 text-white" :
                          entry.userRole === "supervisi" ? "bg-blue-100 text-blue-800" :
                          "bg-green-100 text-green-800"
                        }`}>
                          {entry.userRole.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mb-1.5">
                        <span className="font-mono font-bold text-primary">{entry.noTiket}</span>
                        {entry.wsCabang !== "—" && (
                          <>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span>{entry.wsCabang}</span>
                          </>
                        )}
                      </div>
                      <p className={`text-xs whitespace-pre-wrap break-words rounded-lg px-3 py-2 border leading-relaxed ${
                        entry.isDeleted
                          ? "bg-red-50 text-red-800 border-red-200 font-semibold"
                          : "bg-gray-50 text-gray-700 border-gray-100"
                      }`}>
                        {entry.teks}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {fmtDateTime(entry.waktu)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Pagination */}
          {!logLoading && totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-gray-500">
                Halaman {logPage} dari {totalPages} · {logTotal} entri aktivitas
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={logPage <= 1}
                  onClick={() => fetchLog(logPage - 1, logSearch, logFrom, logTo)}>
                  <ChevronLeft className="w-4 h-4" /> Sebelumnya
                </Button>
                <Button variant="outline" size="sm" disabled={logPage >= totalPages}
                  onClick={() => fetchLog(logPage + 1, logSearch, logFrom, logTo)}>
                  Berikutnya <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
