"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, CheckCircle2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  Th,
  Td,
} from "@/components/ui/Table";
import { fmtDateTime } from "@/lib/format";
import type { TicketListItem, TicketDetail } from "@/lib/ticketQueries";

interface Props {
  initialTickets: TicketListItem[];
  role: string;
}

export function SupervisiClient({ initialTickets }: Props) {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketListItem[]>(initialTickets);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState<string | null>(null);

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
      const res = await fetch(`/api/tickets/${selectedTicket.id}/approve-workstation`, {
        method: "POST",
      });
      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // ignore JSON parse error
      }

      if (!res.ok) {
        setApproveError(data.error ?? `Gagal menyetujui tiket (${res.status}).`);
        return;
      }
      // Simpan nomor tiket untuk pop-up sukses
      const noTiket = selectedTicket.noTiket;
      setShowSuccessModal(noTiket);
      
      // Hapus tiket dari list lokal
      setTickets((prev) => prev.filter((t) => t.id !== selectedTicket.id));
      
      // Tutup modal detail
      setSelectedTicket(null);
      setSelectedTicketId(null);
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : "Terjadi kesalahan koneksi.");
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Table view */}
      <Card padding="none" className="overflow-hidden">
        {tickets.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
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
                  <TableRow
                    key={t.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => fetchDetail(t.id)}
                  >
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

      {/* Modal Detail Pekerjaan */}
      <Modal
        open={Boolean(selectedTicketId)}
        onClose={() => {
          setSelectedTicketId(null);
          setSelectedTicket(null);
          setApproveError("");
        }}
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
              {/* Data Utama */}
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

              {/* Rincian Kerusakan & Kontak */}
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
                    <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">
                      {selectedTicket.activities[0]?.teks || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Log/Aktivitas & Kronologi Penanganan */}
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
                        <p className="text-gray-800 mt-1 bg-white p-2 rounded-lg border border-gray-100 whitespace-pre-wrap text-xs shadow-2xs">
                          {a.teks}
                        </p>
                      </li>
                    ))}
                    {selectedTicket.activities.length === 0 && (
                      <p className="text-xs text-gray-400 ml-2 py-2 text-center">Tidak ada log aktivitas.</p>
                    )}
                  </ol>
                </div>
              </div>

              {approveError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {approveError}
                </p>
              )}

              {/* Action Buttons — Sticky at bottom */}
              <div className="sticky bottom-0 bg-white pt-3 pb-1 border-t border-gray-100 flex flex-wrap justify-end gap-2 z-10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/daily-monitoring/${selectedTicket.id}`)}
                >
                  <FileText className="w-4 h-4 mr-1 text-primary" /> Lihat Detail & Kronologi
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedTicketId(null);
                    setSelectedTicket(null);
                    setApproveError("");
                  }}
                  disabled={approving}
                >
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

      {/* Pop-up Modal Notifikasi Sukses */}
      <Modal
        open={Boolean(showSuccessModal)}
        onClose={() => setShowSuccessModal(null)}
        title=""
        size="sm"
      >
        <div className="flex flex-col items-center justify-center text-center p-4">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-4 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Approval Berhasil!</h3>
          <p className="text-sm text-gray-500 mb-4">
            Tiket workstation nomor <span className="font-bold font-mono text-green-700">{showSuccessModal}</span> telah disetujui dan ditandai selesai.
          </p>
          <Button onClick={() => setShowSuccessModal(null)} className="w-full">
            Tutup
          </Button>
        </div>
      </Modal>
    </div>
  );
}
