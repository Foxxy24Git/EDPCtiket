"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Trash2,
  Clock,
  Monitor,
  Send,
  AlertTriangle,
  FileText,
  Truck,
  CornerDownLeft,
  Building,
  Info,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { fmtDateTime } from "@/lib/format";
import type { TicketDetail } from "@/lib/ticketQueries";

interface Props {
  initialTicket: TicketDetail;
  role: "superadmin" | "user" | "supervisi";
  currentUserId: string;
  backHref?: string;
  backLabel?: string;
  readOnly?: boolean;
}

export function TicketDetailClient({
  initialTicket,
  role,
  currentUserId,
  backHref = "/daily-monitoring",
  backLabel = "Kembali ke Daily Monitoring",
  readOnly = false,
}: Props) {
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetail>(initialTicket);

  const canMutate =
    !readOnly &&
    role === "user" &&
    (ticket.ownerId === currentUserId || !ticket.ownerId);

  const isSelesai = ticket.status === "selesai";

  // State log kegiatan manual
  const [kegiatan, setKegiatan] = useState("");
  const [savingKegiatan, setSavingKegiatan] = useState(false);
  const [kegiatanErr, setKegiatanErr] = useState("");

  // State Modal Detail (Read-Only)
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // State Penyerahan ke Vendor Modal
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [vendorNameInput, setVendorNameInput] = useState(ticket.wsVendor || "");
  const [vendorPicInput, setVendorPicInput] = useState("");
  const [vendorSaving, setVendorSaving] = useState(false);
  const [vendorErr, setVendorErr] = useState("");
  const [vendorOptions, setVendorOptions] = useState<string[]>(["PT Infomedia", "Vendor Lenovo", "PT Multipolar", "Vendor HP", "PT Visionet"]);

  useEffect(() => {
    fetch("/api/master-options")
      .then((res) => res.json())
      .then((data) => {
        if (data.vendorList && Array.isArray(data.vendorList)) {
          setVendorOptions(data.vendorList);
        }
      })
      .catch((err) => console.error("Gagal memuat vendor options:", err));
  }, []);

  // State Pengembalian dari Vendor Modal
  const [vendorReturnModalOpen, setVendorReturnModalOpen] = useState(false);
  const [vendorReturnSaving, setVendorReturnSaving] = useState(false);
  const [vendorReturnErr, setVendorReturnErr] = useState("");

  // State Penyerahan ke Cabang Modal
  const [cabangModalOpen, setCabangModalOpen] = useState(false);
  const [picTerimaInput, setPicTerimaInput] = useState(ticket.wsPicTerima || "");
  const [keteranganCabangInput, setKeteranganCabangInput] = useState(ticket.keterangan || "");
  const [cabangSaving, setCabangSaving] = useState(false);
  const [cabangErr, setCabangErr] = useState("");

  // State Hapus & Close
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeBusy, setCloseBusy] = useState(false);
  const [actionErr, setActionErr] = useState("");

  // Hitung status vendor saat ini
  const isSentToVendor =
    Boolean(ticket.wsTglKeVendor) &&
    (!ticket.wsTglSelesaiVendor || new Date(ticket.wsTglSelesaiVendor) < new Date(ticket.wsTglKeVendor!));

  async function reload() {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`);
      if (res.ok) {
        const data = await res.json();
        setTicket(data.item);
        if (data.item.wsVendor) setVendorNameInput(data.item.wsVendor);
        if (data.item.wsPicTerima) setPicTerimaInput(data.item.wsPicTerima);
        if (data.item.keterangan) setKeteranganCabangInput(data.item.keterangan);
      }
    } catch (e) {
      console.error("Gagal memuat ulang tiket:", e);
    }
  }

  async function submitKegiatan(e: React.FormEvent) {
    e.preventDefault();
    setKegiatanErr("");
    if (!kegiatan.trim()) return setKegiatanErr("Teks kegiatan wajib diisi.");
    setSavingKegiatan(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teks: kegiatan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setKegiatanErr(data.error ?? "Gagal menyimpan kegiatan.");
        return;
      }
      setKegiatan("");
      await reload();
    } catch {
      setKegiatanErr("Terjadi kesalahan jaringan.");
    } finally {
      setSavingKegiatan(false);
    }
  }

  // --- HANDLER PENYERAHAN KE VENDOR ---
  async function handleSendToVendor(e: React.FormEvent) {
    e.preventDefault();
    setVendorErr("");
    if (!vendorNameInput.trim()) return setVendorErr("Nama Vendor wajib diisi.");
    setVendorSaving(true);
    try {
      const vendorFullText = vendorPicInput.trim()
        ? `${vendorNameInput.trim()} (PIC: ${vendorPicInput.trim()})`
        : vendorNameInput.trim();

      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wsVendor: vendorFullText,
          wsTglKeVendor: new Date().toISOString(),
          activityText: `Penyerahan ke Vendor ${vendorFullText}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVendorErr(data.error ?? "Gagal mencatat penyerahan ke vendor.");
        return;
      }
      setVendorModalOpen(false);
      await reload();
    } catch {
      setVendorErr("Terjadi kesalahan jaringan.");
    } finally {
      setVendorSaving(false);
    }
  }

  // --- HANDLER PENGEMBALIAN DARI VENDOR ---
  async function handleReturnFromVendor() {
    setVendorReturnErr("");
    setVendorReturnSaving(true);
    try {
      const vendorName = ticket.wsVendor || vendorNameInput || "Vendor";
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wsTglSelesaiVendor: new Date().toISOString(),
          activityText: `Pengembalian dari Vendor ${vendorName}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVendorReturnErr(data.error ?? "Gagal mencatat pengembalian dari vendor.");
        return;
      }
      setVendorReturnModalOpen(false);
      await reload();
    } catch {
      setVendorReturnErr("Terjadi kesalahan jaringan.");
    } finally {
      setVendorReturnSaving(false);
    }
  }

  // --- HANDLER PENYERAHAN KE CABANG ---
  async function handleSendToCabang(e: React.FormEvent) {
    e.preventDefault();
    setCabangErr("");
    if (!picTerimaInput.trim()) return setCabangErr("Nama PIC Penerima wajib diisi.");
    setCabangSaving(true);
    try {
      const activityText = `Penyerahan ke Cabang: Diterima oleh ${picTerimaInput.trim()}${
        keteranganCabangInput.trim() ? ` (${keteranganCabangInput.trim()})` : ""
      }`;

      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wsTglKembaliKeCabang: new Date().toISOString(),
          wsPicTerima: picTerimaInput.trim(),
          keterangan: keteranganCabangInput.trim() || undefined,
          activityText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCabangErr(data.error ?? "Gagal mencatat penyerahan ke cabang.");
        return;
      }
      setCabangModalOpen(false);
      await reload();
    } catch {
      setCabangErr("Terjadi kesalahan jaringan.");
    } finally {
      setCabangSaving(false);
    }
  }

  async function confirmClose() {
    setActionErr("");
    setCloseBusy(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/close`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setActionErr(data.error ?? "Gagal menutup tiket.");
        return;
      }
      setCloseOpen(false);
      await reload();
    } catch {
      setActionErr("Terjadi kesalahan jaringan.");
    } finally {
      setCloseBusy(false);
    }
  }

  async function confirmDelete() {
    setActionErr("");
    setDelBusy(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setActionErr(data.error ?? "Gagal menghapus tiket.");
        return;
      }
      setDelOpen(false);
      router.push(backHref);
    } catch {
      setActionErr("Terjadi kesalahan jaringan.");
    } finally {
      setDelBusy(false);
    }
  }

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(backHref);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header back link */}
      <div>
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </button>
      </div>

      {role === "supervisi" && (
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-medium px-4 py-2.5 rounded-lg border border-blue-200 shadow-sm">
          <Info className="w-4 h-4 shrink-0 text-blue-600" />
          <span>
            <strong>Mode Supervisi (Read-Only):</strong> Anda sedang melihat rincian detail dan kronologi penanganan tiket ini. Modifikasi data hanya dapat dilakukan oleh IT Support.
          </span>
        </div>
      )}

      {/* Rincian tiket utama */}
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid place-items-center w-12 h-12 rounded-xl bg-primary-50 text-primary shrink-0 mt-1">
              <Monitor className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <span className="font-mono text-xl font-bold text-gray-900">
                  {ticket.noTiket}
                </span>
                <Badge variant={isSelesai ? "success" : "warning"}>
                  {isSelesai ? "Selesai" : "Dalam Proses"}
                </Badge>
                <Badge variant={ticket.statusSupervisi === "approved" ? "success" : "neutral"}>
                  {ticket.statusSupervisi === "approved" ? "Diapprove Supervisi" : "Belum Diapprove"}
                </Badge>
              </div>
              <h1 className="mt-1 text-base font-semibold text-gray-900 leading-tight">
                {ticket.wsCabang} {ticket.wsCapem ? `(Capem ${ticket.wsCapem})` : ""}
              </h1>
              <p className="mt-0.5 text-sm text-gray-500">
                Merek: {ticket.wsMerekKomputer || "—"} · SN: {ticket.wsSnKomputer || "—"}
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500 sm:text-right space-y-0.5">
            <div>
              Petugas IT: <span className="font-medium text-gray-800">{ticket.ownerNama}</span>
            </div>
            <div className="flex items-center gap-1 sm:justify-end">
              <Clock className="w-3.5 h-3.5" /> Masuk IT: {fmtDateTime(ticket.wsTanggalMasuk)}
            </div>
            {ticket.waktuSelesai && (
              <div className="flex items-center gap-1 sm:justify-end text-green-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Selesai: {fmtDateTime(ticket.waktuSelesai)}
              </div>
            )}
          </div>
        </div>

        {/* BARIS TOMBOL AKSI */}
        {canMutate && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
            {/* Tombol Detail (Read-Only) */}
            <Button variant="outline" size="sm" onClick={() => setDetailModalOpen(true)}>
              <Info className="w-4 h-4 text-gray-600" /> Detail
            </Button>

            {/* Tombol Vendor Dynamically Toggle */}
            {!isSentToVendor ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setVendorErr("");
                  setVendorModalOpen(true);
                }}
                className="border-amber-600 text-amber-700 hover:bg-amber-50"
              >
                <Truck className="w-4 h-4 text-amber-600" /> Penyerahan ke Vendor
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setVendorReturnErr("");
                  setVendorReturnModalOpen(true);
                }}
                className="border-orange-600 text-orange-700 hover:bg-orange-50"
              >
                <CornerDownLeft className="w-4 h-4 text-orange-600" /> Pengembalian dari Vendor
              </Button>
            )}

            {/* Tombol Penyerahan ke Cabang */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCabangErr("");
                setCabangModalOpen(true);
              }}
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            >
              <Building className="w-4 h-4 text-emerald-600" /> Penyerahan ke Cabang
            </Button>

            {/* Tombol Berita Acara (Mengarahkan ke Rekap Berita Acara dengan ticketId terpilih) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/rekap-laporan?tab=berita-acara&ticketId=${ticket.id}`)}
              className="border-blue-600 text-blue-700 hover:bg-blue-50"
            >
              <FileText className="w-4 h-4 text-blue-600" /> Berita Acara
            </Button>

            {!isSelesai && (
              <Button
                size="sm"
                onClick={() => {
                  setActionErr("");
                  setCloseOpen(true);
                }}
              >
                <CheckCircle2 className="w-4 h-4" /> Close Tiket
              </Button>
            )}

            <Button
              variant="danger"
              size="sm"
              className="ml-auto"
              onClick={() => {
                setActionErr("");
                setDelOpen(true);
              }}
            >
              <Trash2 className="w-4 h-4" /> Hapus Tiket
            </Button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Detail gangguan */}
        <div className="space-y-5 lg:col-span-1">
          <Card>
            <CardTitle className="mb-3">Detail Perangkat & Kerusakan</CardTitle>
            <dl className="space-y-2.5 text-sm">
              <Field label="No Surat Cabang" value={ticket.wsNoSurat} />
              <Field label="Kelengkapan" value={ticket.wsKelengkapan} />
              <Field label="Kerusakan" value={ticket.wsKerusakan} />
              <Field
                label="Kontak Pelapor"
                value={
                  ticket.cpTipe === "wag"
                    ? `WAG: ${ticket.cpNama}`
                    : `${ticket.cpNama} (${ticket.cpTelp || "—"})`
                }
              />
              <Field label="Jenis Gangguan" value={ticket.jenisGangguan} />
              <Field label="Sumber Penyebab" value={ticket.sumberPenyebab} />
              <Field label="Metode Penanganan" value={ticket.metodePenanganan} />
            </dl>
          </Card>

          <Card>
            <CardTitle className="mb-3">Penanganan Vendor & Cabang</CardTitle>
            <dl className="space-y-2.5 text-sm">
              <Field label="Vendor" value={ticket.wsVendor} />
              <Field label="Tanggal ke Vendor" value={ticket.wsTglKeVendor ? fmtDateTime(ticket.wsTglKeVendor) : null} />
              <Field label="Selesai Vendor" value={ticket.wsTglSelesaiVendor ? fmtDateTime(ticket.wsTglSelesaiVendor) : null} />
              <Field label="Kembali ke Cabang" value={ticket.wsTglKembaliKeCabang ? fmtDateTime(ticket.wsTglKembaliKeCabang) : null} />
              <Field label="PIC Penerima Cabang" value={ticket.wsPicTerima} />
              <Field label="Keterangan" value={ticket.keterangan} />
            </dl>
          </Card>
        </div>

        {/* Log Kronologi penanganan */}
        <Card className="lg:col-span-2">
          <CardTitle className="mb-1">Log Kronologi Penanganan</CardTitle>
          <p className="text-xs text-gray-500 mb-4">
            Catatan log aktivitas perbaikan. Entri baru ditambahkan secara otomatis pada saat penyerahan vendor/cabang maupun entri manual.
          </p>

          {canMutate && !isSelesai && (
            <form onSubmit={submitKegiatan} className="mb-5">
              <textarea
                rows={2}
                value={kegiatan}
                onChange={(e) => setKegiatan(e.target.value)}
                placeholder="Tulis perkembangan penanganan terbaru…"
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
              {kegiatanErr && <p className="mt-1 text-xs text-red-600">{kegiatanErr}</p>}
              <div className="mt-2 flex justify-end">
                <Button type="submit" size="sm" loading={savingKegiatan}>
                  <Send className="w-4 h-4" /> Simpan Kegiatan
                </Button>
              </div>
            </form>
          )}

          <ol className="relative border-l-2 border-gray-100 ml-2 space-y-4">
            {ticket.activities.map((a) => (
              <li key={a.id} className="ml-4 relative">
                <span className="absolute -left-[23px] mt-1.5 w-3 h-3 rounded-full bg-primary border-2 border-white" />
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{fmtDateTime(a.waktu)}</span>
                  <span>· {a.userNama}</span>
                </div>
                <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{a.teks}</p>
              </li>
            ))}
            {ticket.activities.length === 0 && (
              <li className="ml-4 text-sm text-gray-400">Belum ada kegiatan.</li>
            )}
          </ol>
        </Card>
      </div>

      {/* ---- MODAL DETAIL (READ-ONLY) ---- */}
      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Detail Perangkat & Tiket"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg text-sm border border-gray-200">
            <div>
              <span className="text-xs text-gray-500 font-semibold uppercase block">Nomor Tiket</span>
              <span className="font-bold text-gray-900 font-mono text-base">{ticket.noTiket}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-semibold uppercase block">Cabang</span>
              <span className="font-bold text-gray-900">{ticket.wsCabang} {ticket.wsCapem ? `(Capem ${ticket.wsCapem})` : ""}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-semibold uppercase block">Merek Perangkat</span>
              <span className="font-medium text-gray-800">{ticket.wsMerekKomputer || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-semibold uppercase block">Serial Number (S/N)</span>
              <span className="font-mono font-medium text-gray-800">{ticket.wsSnKomputer || "—"}</span>
            </div>
          </div>

          <Card padding="md" className="border border-gray-200">
            <h4 className="font-bold text-sm text-gray-900 mb-2">Informasi Masuk & Surat</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Field label="Nomor Surat Cabang" value={ticket.wsNoSurat} />
              <Field label="Tanggal Masuk IT" value={fmtDateTime(ticket.wsTanggalMasuk)} />
              <Field label="Kelengkapan" value={ticket.wsKelengkapan} />
              <Field label="Kontak Pelapor" value={`${ticket.cpNama} (${ticket.cpTelp || "—"})`} />
            </div>
          </Card>

          <Card padding="md" className="border border-gray-200">
            <h4 className="font-bold text-sm text-gray-900 mb-2">Kerusakan & Penanganan Vendor/Cabang</h4>
            <div className="space-y-2 text-sm">
              <Field label="Kerusakan" value={ticket.wsKerusakan} />
              <Field label="Vendor" value={ticket.wsVendor} />
              <Field label="Tanggal ke Vendor" value={ticket.wsTglKeVendor ? fmtDateTime(ticket.wsTglKeVendor) : null} />
              <Field label="Selesai Vendor" value={ticket.wsTglSelesaiVendor ? fmtDateTime(ticket.wsTglSelesaiVendor) : null} />
              <Field label="Kembali ke Cabang" value={ticket.wsTglKembaliKeCabang ? fmtDateTime(ticket.wsTglKembaliKeCabang) : null} />
              <Field label="PIC Penerima Cabang" value={ticket.wsPicTerima} />
              <Field label="Keterangan" value={ticket.keterangan} />
            </div>
          </Card>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setDetailModalOpen(false)}>
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      {/* ---- MODAL PENYERAHAN KE VENDOR ---- */}
      <Modal
        open={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
        title="Penyerahan Perangkat ke Vendor"
        size="md"
      >
        <form onSubmit={handleSendToVendor} className="space-y-4">
          <p className="text-sm text-gray-600">
            Masukkan nama vendor perbaikan. Waktu penyerahan akan otomatis tercatat pada log kronologi penanganan.
          </p>
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Pilih dari Master Vendor Terdaftar</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                onChange={(e) => {
                  if (e.target.value) setVendorNameInput(e.target.value);
                }}
                defaultValue=""
              >
                <option value="">-- Pilih Vendor Terdaftar --</option>
                {vendorOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Nama Vendor (Manual / Hasil Pilihan)"
              required
              placeholder="cth: PT Infomedia / Vendor Lenovo"
              value={vendorNameInput}
              onChange={(e) => setVendorNameInput(e.target.value)}
            />

            <Input
              label="Nama PIC Vendor (opsional)"
              placeholder="cth: Budi (Teknisi Infomedia)"
              value={vendorPicInput}
              onChange={(e) => setVendorPicInput(e.target.value)}
            />
          </div>
          {vendorErr && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{vendorErr}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setVendorModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={vendorSaving} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Truck className="w-4 h-4 mr-1" /> Konfirmasi Penyerahan Vendor
            </Button>
          </div>
        </form>
      </Modal>

      {/* ---- MODAL PENGEMBALIAN DARI VENDOR ---- */}
      <Modal
        open={vendorReturnModalOpen}
        onClose={() => setVendorReturnModalOpen(false)}
        title="Pengembalian Perangkat dari Vendor"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Konfirmasi bahwa perangkat telah selesai diperbaiki dan diterima kembali dari vendor{" "}
            <span className="font-bold text-gray-900">{ticket.wsVendor || vendorNameInput}</span>. 
            Waktu pengembalian akan tercatat otomatis.
          </p>
          {vendorReturnErr && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{vendorReturnErr}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setVendorReturnModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleReturnFromVendor} loading={vendorReturnSaving} className="bg-orange-600 hover:bg-orange-700 text-white">
              <CornerDownLeft className="w-4 h-4 mr-1" /> Konfirmasi Pengembalian Vendor
            </Button>
          </div>
        </div>
      </Modal>

      {/* ---- MODAL PENYERAHAN KE CABANG ---- */}
      <Modal
        open={cabangModalOpen}
        onClose={() => setCabangModalOpen(false)}
        title="Penyerahan Perangkat ke Cabang"
        size="md"
      >
        <form onSubmit={handleSendToCabang} className="space-y-4">
          <p className="text-sm text-gray-600">
            Masukkan nama PIC penerima dari cabang. Nama ini akan otomatis terisi pada Berita Acara Serah Terima.
          </p>
          <Input
            label="Nama PIC Penerima Cabang"
            required
            placeholder="cth: Ahmad Fauzi"
            value={picTerimaInput}
            onChange={(e) => setPicTerimaInput(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Keterangan Opsional</label>
            <textarea
              rows={2}
              value={keteranganCabangInput}
              onChange={(e) => setKeteranganCabangInput(e.target.value)}
              placeholder="Keterangan tambahan jika ada..."
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          {cabangErr && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{cabangErr}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCabangModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={cabangSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Building className="w-4 h-4 mr-1" /> Simpan Penyerahan Cabang
            </Button>
          </div>
        </form>
      </Modal>

      {/* ---- Modal close ---- */}
      <Modal open={closeOpen} onClose={() => setCloseOpen(false)} title="Tutup/Selesaikan Tiket?" size="sm">
        <p className="text-sm text-gray-600">
          Tiket akan ditandai <span className="font-semibold">Selesai</span>. Seterusnya tiket tinggal menunggu Approval dari pihak Supervisi.
        </p>
        {actionErr && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{actionErr}</p>}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={() => setCloseOpen(false)}>
            Batal
          </Button>
          <Button loading={closeBusy} onClick={confirmClose}>
            <CheckCircle2 className="w-4 h-4" /> Ya, Selesaikan
          </Button>
        </div>
      </Modal>

      {/* ---- Modal hapus ---- */}
      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Hapus Tiket Workstation?" size="sm">
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p>
            Hapus tiket <span className="font-mono font-semibold text-gray-900">{ticket.noTiket}</span>?
            Tindakan ini permanen dan tidak bisa dibatalkan.
          </p>
        </div>
        {actionErr && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{actionErr}</p>}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={() => setDelOpen(false)}>
            Batal
          </Button>
          <Button variant="danger" loading={delBusy} onClick={confirmDelete}>
            <Trash2 className="w-4 h-4" /> Hapus
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className={cn("text-right text-gray-800 font-medium", !value && "text-gray-400 italic")}>
        {value || "—"}
      </dd>
    </div>
  );
}
