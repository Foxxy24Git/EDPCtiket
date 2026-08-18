"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Download, FileSpreadsheet, FileText, Printer, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Props {
  today: string; // YYYY-MM-DD
}

interface TicketOption {
  id: string;
  noTiket: string;
  wsCabang: string;
  wsMerekKomputer: string;
  wsSnKomputer: string;
  wsTanggalMasuk?: string;
  wsPicTerima?: string;
  ownerNama?: string;
}

interface DeviceItem {
  id: string;
  namaPerangkat: string;
  sn: string;
  merekKomputer?: string;
}

async function downloadFile(
  url: string,
  fallbackName: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.error ?? `Gagal mengunduh (${res.status}).` };
  }
  const cd = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^"]+)"?/.exec(cd);
  const name = match?.[1] ?? fallbackName;

  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objUrl);
  return { ok: true };
}

function formatIndonesianDate(dateStr: string) {
  if (!dateStr) return { hari: "Selasa", tglFull: "22 April 2025", hariTglFull: "Selasa Tanggal 22 April 2025" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { hari: "Selasa", tglFull: "22 April 2025", hariTglFull: "Selasa Tanggal 22 April 2025" };
  
  const hariList = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const bulanList = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const hari = hariList[d.getDay()];
  const tgl = d.getDate();
  const bulan = bulanList[d.getMonth()];
  const tahun = d.getFullYear();
  return {
    hari,
    tglFull: `${tgl} ${bulan} ${tahun}`,
    hariTglFull: `${hari} Tanggal ${tgl} ${bulan} ${tahun}`
  };
}

export function resolveNamaPerangkat(wsMerekKomputer?: string | null): string {
  if (!wsMerekKomputer || !wsMerekKomputer.trim()) {
    return "Perangkat IT";
  }

  const raw = wsMerekKomputer.trim();
  const match = raw.match(/^\[(.*?)\]\s*(.*)$/);

  if (match) {
    const inside = match[1].trim();
    const brand = match[2].trim();

    if (brand) {
      return `${inside} (${brand})`;
    }
    return inside;
  }

  return raw;
}

export function RekapLaporanClient({ today }: Props) {
  return (
    <Suspense fallback={<div className="py-8 text-center text-sm text-gray-500">Memuat halaman...</div>}>
      <RekapLaporanContent today={today} />
    </Suspense>
  );
}

function RekapLaporanContent({ today }: Props) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const ticketIdParam = searchParams.get("ticketId");

  const [activeTab, setActiveTab] = useState<"workstation" | "berita-acara">(
    tabParam === "berita-acara" ? "berita-acara" : "workstation"
  );

  // --- Sub-Judul 1: Workstation ---
  const sevenDaysAgo = (() => {
    const d = new Date(`${today}T00:00:00+07:00`);
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  })();

  const [tglDariWs, setTglDariWs] = useState(sevenDaysAgo);
  const [tglSampaiWs, setTglSampaiWs] = useState(today);
  const [loadingWs, setLoadingWs] = useState(false);
  const [errWs, setErrWs] = useState("");

  // --- Sub-Judul 2: Berita Acara ---
  const [tickets, setTickets] = useState<TicketOption[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [, setLoadingTickets] = useState(false);
  const [downloadingBa, setDownloadingBa] = useState(false);
  const [addDeviceId, setAddDeviceId] = useState("");

  // List Perangkat dalam dokumen Berita Acara
  const [deviceList, setDeviceList] = useState<DeviceItem[]>([
    { id: "default-1", namaPerangkat: "Lenovo V50a All in One", sn: "MP1VZ0PX" }
  ]);

  // Form Berita Acara
  const [baForm, setBaForm] = useState({
    cabang: "Payakumbuh",
    tgl: today,
    diserahkanOleh: "DIMAS TEGUH PRIBADI",
    jabatanDiserahkan: "Staff Bagian Infrastruktur Divisi T&D",
    diterimaOleh: "Cabang Payakumbuh",
    diterimaPic: "",
  });

  useEffect(() => {
    if (tabParam === "berita-acara") {
      setActiveTab("berita-acara");
    }
  }, [tabParam]);

  useEffect(() => {
    async function loadTickets() {
      setLoadingTickets(true);
      try {
        const res = await fetch("/api/tickets");
        if (res.ok) {
          const data = await res.json();
          const items: TicketOption[] = data.items || [];
          setTickets(items);

          let target: TicketOption | undefined;
          if (ticketIdParam) {
            target = items.find((t) => t.id === ticketIdParam);
          }
          if (!target && items.length > 0) {
            target = items[0];
          }

          if (target) {
            setSelectedTicketId(target.id);
            setFormAndDeviceFromTicket(target, true);
          }
        }
      } catch (e) {
        console.error("Gagal memuat tiket:", e);
      } finally {
        setLoadingTickets(false);
      }
    }
    loadTickets();
  }, [ticketIdParam]);

  function setFormAndDeviceFromTicket(t: TicketOption, resetList = false) {
    const namaPerangkat = resolveNamaPerangkat(t.wsMerekKomputer);
    const sn = t.wsSnKomputer || "-";

    if (resetList) {
      setDeviceList([{ id: t.id, namaPerangkat, sn, merekKomputer: t.wsMerekKomputer }]);
    } else {
      setDeviceList((prev) => {
        if (prev.some((d) => d.id === t.id)) return prev;
        return [...prev, { id: t.id, namaPerangkat, sn, merekKomputer: t.wsMerekKomputer }];
      });
    }

    setBaForm({
      cabang: t.wsCabang || "Payakumbuh",
      tgl: today,
      diserahkanOleh: t.ownerNama?.toUpperCase() || "DIMAS TEGUH PRIBADI",
      jabatanDiserahkan: "Staff Bagian Infrastruktur Divisi T&D",
      diterimaOleh: `Cabang ${t.wsCabang || 'Payakumbuh'}`,
      diterimaPic: t.wsPicTerima || "",
    });
  }

  function handleSelectMainTicket(id: string) {
    setSelectedTicketId(id);
    const found = tickets.find((t) => t.id === id);
    if (found) {
      setFormAndDeviceFromTicket(found, true);
    }
  }

  // Filter tiket berdasarkan Cabang yang dipilih pada Berita Acara
  const availableTicketsForBranch = tickets.filter(
    (t) => (t.wsCabang || "").toUpperCase() === (baForm.cabang || "").toUpperCase()
  );

  // Sembunyikan perangkat yang sudah ada di list (Deduplikasi)
  const unaddedTicketsForBranch = availableTicketsForBranch.filter(
    (t) => !deviceList.some((d) => d.id === t.id)
  );

  function handleAddExtraDevice() {
    if (!addDeviceId) return;
    const found = tickets.find((t) => t.id === addDeviceId);
    if (found) {
      const namaPerangkat = resolveNamaPerangkat(found.wsMerekKomputer);
      const sn = found.wsSnKomputer || "-";
      setDeviceList((prev) => [...prev, { id: found.id, namaPerangkat, sn, merekKomputer: found.wsMerekKomputer }]);
      setAddDeviceId("");
    }
  }

  function buildSummaryText(): string {
    if (!deviceList || deviceList.length === 0) return "0 unit perangkat";

    const counts: Record<string, number> = {};

    for (const d of deviceList) {
      const foundTicket = tickets.find((t) => t.id === d.id);
      const raw = d.merekKomputer || foundTicket?.wsMerekKomputer || d.namaPerangkat || "";
      const cat = resolveNamaPerangkat(raw);

      counts[cat] = (counts[cat] || 0) + 1;
    }

    const parts = Object.entries(counts).map(([cat, count]) => `${count} unit perangkat ${cat}`);

    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} dan ${parts[1]}`;
    return `${parts.slice(0, -1).join(", ")}, dan ${parts[parts.length - 1]}`;
  }

  const summaryDevicesText = buildSummaryText();

  function handleRemoveDevice(index: number) {
    setDeviceList((prev) => prev.filter((_, i) => i !== index));
  }

  async function unduhWorkstation() {
    setErrWs("");
    if (!tglDariWs || !tglSampaiWs) {
      setErrWs("Pilih rentang tanggal terlebih dahulu.");
      return;
    }
    if (tglDariWs > tglSampaiWs) {
      setErrWs("Tanggal 'dari' tidak boleh setelah tanggal 'sampai'.");
      return;
    }
    setLoadingWs(true);
    const res = await downloadFile(
      `/api/rekap/workstation?dari=${tglDariWs}&sampai=${tglSampaiWs}`,
      `REKAP_WORKSTATION_${tglDariWs}_sd_${tglSampaiWs}.xlsx`
    );
    if (!res.ok) setErrWs(res.error);
    setLoadingWs(false);
  }

  async function handleDownloadBeritaAcaraWord() {
    setDownloadingBa(true);
    try {
      const response = await fetch("/api/reports/berita-acara", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...baForm,
          deviceList,
          format: "word",
        }),
      });

      if (!response.ok) throw new Error("Gagal mengunduh dokumen");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BERITA_ACARA_${baForm.cabang.replace(/\s+/g, "_")}.doc`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Gagal mengunduh dokumen Berita Acara.");
    } finally {
      setDownloadingBa(false);
    }
  }

  async function handlePrintBeritaAcara() {
    try {
      const response = await fetch("/api/reports/berita-acara", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...baForm,
          deviceList,
          format: "print",
        }),
      });

      if (!response.ok) throw new Error("Gagal memuat cetakan");

      const htmlText = await response.text();
      const printWin = window.open("", "_blank");
      if (printWin) {
        printWin.document.write(htmlText);
        printWin.document.close();
      }
    } catch (e) {
      console.error(e);
      alert("Gagal mencetak Berita Acara.");
    }
  }

  const dateFormatted = formatIndonesianDate(baForm.tgl);
  const tipeHeaderLabel = deviceList.some(d => d.namaPerangkat.toLowerCase().includes("edc"))
    ? "Mesin EDC"
    : "Komputer All in One";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* TAB NAVIGATION / SUB-JUDUL */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-hidden shadow-sm">
        <button
          onClick={() => setActiveTab("workstation")}
          className={`flex-1 py-4 px-6 text-center font-bold text-sm transition-all flex items-center justify-center gap-2 border-b-2 ${
            activeTab === "workstation"
              ? "border-primary text-primary bg-primary-50/30"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" /> 1. Rekap Laporan Workstation
        </button>
        <button
          onClick={() => setActiveTab("berita-acara")}
          className={`flex-1 py-4 px-6 text-center font-bold text-sm transition-all flex items-center justify-center gap-2 border-b-2 ${
            activeTab === "berita-acara"
              ? "border-primary text-primary bg-primary-50/30"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <FileText className="w-4 h-4" /> 2. Berita Acara
        </button>
      </div>

      {/* SUB-JUDUL 1: REKAP LAPORAN WORKSTATION */}
      {activeTab === "workstation" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <FileSpreadsheet className="w-5 h-5 text-primary" /> Rekap Laporan Workstation (Format Excel .xlsx)
              </CardTitle>
            </CardHeader>
            <p className="text-sm text-gray-500 mb-6">
              Pilih rentang tanggal kerusakan perangkat untuk mengunduh rekap laporan dalam format Excel. 
              Laporan ini berisi informasi lengkap termasuk merek, kelengkapan, nomor seri, kerusakan, status penanganan vendor, status approval, dan keterangan lainnya.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Dari Tanggal"
                type="date"
                value={tglDariWs}
                max={tglSampaiWs}
                onChange={(e) => setTglDariWs(e.target.value)}
              />
              <Input
                label="Sampai Tanggal"
                type="date"
                value={tglSampaiWs}
                min={tglDariWs}
                onChange={(e) => setTglSampaiWs(e.target.value)}
              />
            </div>
            {errWs && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {errWs}
              </p>
            )}
            <div className="flex justify-end mt-6">
              <Button onClick={unduhWorkstation} loading={loadingWs} className="w-full sm:w-auto">
                {!loadingWs && <Download className="w-4 h-4" />} Download Rekap Laporan Workstation (.xlsx)
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* SUB-JUDUL 2: LAPORAN BERITA ACARA SERAH TERIMA PERANGKAT */}
      {activeTab === "berita-acara" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* FORM INPUT DOKUMEN */}
            <div className="lg:col-span-5 space-y-4">
              <Card padding="md">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" /> Data Berita Acara
                  </CardTitle>
                </CardHeader>

                {tickets.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Pilih dari Tiket Perangkat Utama (Otomatis Isi)
                    </label>
                    <select
                      value={selectedTicketId}
                      onChange={(e) => handleSelectMainTicket(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-md p-2 bg-white min-w-0 truncate focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {tickets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.noTiket} — [{t.wsCabang}] {t.wsMerekKomputer}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Cabang</label>
                    <Input
                      value={baForm.cabang}
                      onChange={(e) => {
                        const newCabang = e.target.value;
                        setBaForm({ ...baForm, cabang: newCabang, diterimaOleh: `Cabang ${newCabang}` });
                      }}
                      placeholder="Payakumbuh"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Tanggal Penyerahan</label>
                    <Input
                      type="date"
                      value={baForm.tgl}
                      onChange={(e) => setBaForm({ ...baForm, tgl: e.target.value })}
                    />
                  </div>

                  {/* TAMBAH PERANGKAT MULTI-DEVICE KHUSUS CABANG TERPILIH */}
                  <div className="pt-2 border-t border-gray-200">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Opsi Penambahan Perangkat (Cabang: {baForm.cabang})
                    </label>

                    {unaddedTicketsForBranch.length > 0 ? (
                      <div className="flex items-center gap-2 mb-2 w-full">
                        <select
                          value={addDeviceId}
                          onChange={(e) => setAddDeviceId(e.target.value)}
                          className="flex-1 min-w-0 text-xs border border-gray-300 rounded-md p-2 bg-white truncate focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">-- Pilih Perangkat Lain --</option>
                          {unaddedTicketsForBranch.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.wsMerekKomputer} (SN: {t.wsSnKomputer})
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!addDeviceId}
                          onClick={handleAddExtraDevice}
                          className="shrink-0 text-xs px-3 py-1.5 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1 inline" /> Tambah
                        </Button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic mb-2">
                        {availableTicketsForBranch.length === 0
                          ? `Tidak ada perangkat lain dari cabang ${baForm.cabang}.`
                          : `Semua perangkat cabang ${baForm.cabang} sudah dimasukkan ke list.`}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Diserahkan Oleh (Petugas IT)</label>
                    <Input
                      value={baForm.diserahkanOleh}
                      onChange={(e) => setBaForm({ ...baForm, diserahkanOleh: e.target.value })}
                      placeholder="DIMAS TEGUH PRIBADI"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Diterima Oleh (Instansi)</label>
                    <Input
                      value={baForm.diterimaOleh}
                      onChange={(e) => setBaForm({ ...baForm, diterimaOleh: e.target.value })}
                      placeholder="Cabang Payakumbuh"
                    />
                  </div>

                  {/* FIELD PIC PENERIMA CABANG */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-0.5">
                      PIC Penerima Cabang (Nama di Ttd)
                    </label>
                    <Input
                      value={baForm.diterimaPic}
                      onChange={(e) => setBaForm({ ...baForm, diterimaPic: e.target.value })}
                      placeholder="Nama PIC Penerima Cabang..."
                    />
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <Button
                    onClick={handleDownloadBeritaAcaraWord}
                    loading={downloadingBa}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {!downloadingBa && <FileText className="w-4 h-4 mr-1.5" />} Download Berita Acara (.doc)
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handlePrintBeritaAcara}
                    className="w-full border-blue-600 text-blue-700 hover:bg-blue-50"
                  >
                    <Printer className="w-4 h-4 mr-1.5 text-blue-600" /> Cetak / Export PDF
                  </Button>
                </div>
              </Card>
            </div>

            {/* LIVE DOCUMENT PREVIEW */}
            <div className="lg:col-span-7">
              <Card padding="md" className="bg-gray-100/70 border border-gray-300">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-600" /> Preview Dokumen Berita Acara (A4)
                  </span>
                  <span className="text-[11px] text-gray-400">Otomatis Update</span>
                </div>

                {/* TEMPLAT DOKUMEN BERITA ACARA */}
                <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-300 text-gray-900 text-xs sm:text-sm font-sans leading-relaxed">
                  {/* LOGO BANK NAGARI */}
                  <div className="flex items-center justify-start mb-6">
                    <img src="/logo-bank-nagari.png" alt="Logo Bank Nagari" className="h-10 object-contain" />
                  </div>

                  {/* JUDUL */}
                  <div className="text-center my-6 space-y-0.5">
                    <h1 className="font-bold text-sm sm:text-base uppercase tracking-wide">BERITA ACARA</h1>
                    <h2 className="font-bold text-xs sm:text-sm uppercase tracking-wide">SERAH TERIMA PERANGKAT</h2>
                  </div>

                  {/* PARAGRAF PENYERAHAN */}
                  <p className="mb-4 text-justify leading-relaxed">
                    Pada hari ini <strong>{dateFormatted.hari}</strong> Tanggal <strong>{dateFormatted.tglFull}</strong> telah di lakukan penyerahan <strong>{summaryDevicesText}</strong> milik <strong>{baForm.cabang.startsWith('Cabang') ? baForm.cabang : `Cabang ${baForm.cabang}`}</strong> dengan detail sebagai berikut:
                  </p>

                  {/* TABEL RINCIAN MULTI-DEVICE */}
                  <table className="w-full border-collapse border border-black my-4 text-xs">
                    <thead>
                      <tr className="bg-[#99CCFF] border-b border-black">
                        <th className="border border-black p-2 text-center w-[12%] font-bold">No</th>
                        <th className="border border-black p-2 text-center w-[58%] font-bold">Nama Perangkat</th>
                        <th className="border border-black p-2 text-center w-[30%] font-bold">S/N</th>
                        {deviceList.length > 1 && <th className="border border-black p-1 text-center w-8 print:hidden">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {deviceList.map((item, idx) => (
                        <tr key={item.id + idx}>
                          <td className="border border-black p-2 text-center">{idx + 1}</td>
                          <td className="border border-black p-2">{item.namaPerangkat}</td>
                          <td className="border border-black p-2 text-center font-mono">{item.sn}</td>
                          {deviceList.length > 1 && (
                            <td className="border border-black p-1 text-center print:hidden">
                              <button
                                type="button"
                                onClick={() => handleRemoveDevice(idx)}
                                className="text-red-500 hover:text-red-700"
                                title="Hapus perangkat dari list"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* PARAGRAF PENUTUP */}
                  <p className="mt-6 mb-5 text-justify">
                    Demikianlah tanda terima ini dibuat rangkap 2 (dua) untuk dapat digunakan sebagaimana mestinya.
                  </p>

                  {/* TANGGAL */}
                  <div className="text-center my-4 font-medium">
                    Padang, {dateFormatted.tglFull}
                  </div>

                  {/* BOX TANDA TANGAN 2 KOLOM */}
                  <div className="grid grid-cols-2 border border-black h-[160px] text-xs">
                    <div className="border-r border-black p-3 flex flex-col justify-between">
                      <div>
                        <div>Diserahkan oleh:</div>
                        <div className="text-[11px] text-gray-700">{baForm.jabatanDiserahkan}</div>
                      </div>
                      <div>
                        <div className="font-bold underline uppercase">{baForm.diserahkanOleh}</div>
                        <div className="text-[11px] text-gray-600">Staff</div>
                      </div>
                    </div>
                    <div className="p-3 flex flex-col justify-between">
                      <div>
                        <div>Diterima oleh:</div>
                        <div className="text-[11px] text-gray-700">{baForm.diterimaOleh}</div>
                      </div>
                      <div>
                        <div className="font-bold underline uppercase">{baForm.diterimaPic || "........................"}</div>
                        <div className="text-[11px] text-gray-600">Penerima Cabang</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
