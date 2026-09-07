"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Download, FileSpreadsheet, FileText, Printer, CheckCircle2, Plus, Trash2, Search } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { SearchableSelect, type SearchableOption } from "@/components/ui/SearchableSelect";

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
  status?: string;
  wsTglKembaliKeCabang?: string | null;
  wsVendor?: string | null;
  wsTglKeVendor?: string | null;
  waktuOpen?: string;
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

  const [activeTab, setActiveTab] = useState<"workstation" | "berita-acara" | "berita-acara-vendor">(
    tabParam === "berita-acara-vendor"
      ? "berita-acara-vendor"
      : tabParam === "berita-acara"
      ? "berita-acara"
      : "workstation"
  );

  // --- Sub-Judul 1: Workstation ---
  const sevenDaysAgo = (() => {
    const d = new Date(`${today}T00:00:00+07:00`);
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  })();

  const [tglDariWs, setTglDariWs] = useState(sevenDaysAgo);
  const [tglSampaiWs, setTglSampaiWs] = useState(today);
  const [jenisPerangkatWs, setJenisPerangkatWs] = useState("");
  const [cabangWs, setCabangWs] = useState("");
  const [statusWs, setStatusWs] = useState("");
  const [supervisiWs, setSupervisiWs] = useState("");
  const [searchWs, setSearchWs] = useState("");

  const [deviceOptionsWs, setDeviceOptionsWs] = useState<string[]>(["Komputer", "Mesin EDC"]);
  const [cabangOptionsWs, setCabangOptionsWs] = useState<string[]>([]);

  const [loadingWs, setLoadingWs] = useState(false);
  const [errWs, setErrWs] = useState("");

  // --- Sub-Judul 2: Berita Acara Cabang ---
  const [tickets, setTickets] = useState<TicketOption[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [, setLoadingTickets] = useState(false);
  const [downloadingBa, setDownloadingBa] = useState(false);
  const [addDeviceId, setAddDeviceId] = useState("");

  // List Perangkat dalam dokumen Berita Acara Cabang
  const [deviceList, setDeviceList] = useState<DeviceItem[]>([
    { id: "default-1", namaPerangkat: "Lenovo V50a All in One", sn: "MP1VZ0PX" }
  ]);

  // Form Berita Acara Cabang
  const [baForm, setBaForm] = useState({
    cabang: "Payakumbuh",
    tgl: today,
    diserahkanOleh: "DIMAS TEGUH PRIBADI",
    jabatanDiserahkan: "Staff Bagian Infrastruktur Divisi T&D",
    diterimaOleh: "Cabang Payakumbuh",
    diterimaPic: "",
  });

  // --- Sub-Judul 3: Berita Acara Vendor ---
  const [vendorTickets, setVendorTickets] = useState<TicketOption[]>([]);
  const [selectedVendorTicketId, setSelectedVendorTicketId] = useState("");
  const [downloadingBaVendor, setDownloadingBaVendor] = useState(false);
  const [addVendorDeviceId, setAddVendorDeviceId] = useState("");

  const [vendorDeviceList, setVendorDeviceList] = useState<DeviceItem[]>([
    { id: "default-v1", namaPerangkat: "Lenovo V50a All in One", sn: "MP1VZ0PX" }
  ]);

  const [baVendorForm, setBaVendorForm] = useState({
    vendorName: "PT. LENOVO INDONESIA",
    vendorPic: "",
    cabang: "Payakumbuh",
    tgl: today,
    diserahkanOleh: "DIMAS TEGUH PRIBADI",
    jabatanDiserahkan: "Staff Bagian Infrastruktur Divisi T&D",
  });

  useEffect(() => {
    if (tabParam === "berita-acara-vendor") {
      setActiveTab("berita-acara-vendor");
    } else if (tabParam === "berita-acara") {
      setActiveTab("berita-acara");
    }
  }, [tabParam]);

  useEffect(() => {
    // Fetch device options
    fetch("/api/master-options")
      .then((res) => res.json())
      .then((data) => {
        if (data.deviceTypes && Array.isArray(data.deviceTypes) && data.deviceTypes.length > 0) {
          const names = data.deviceTypes.map((d: { nama: string }) => d.nama);
          setDeviceOptionsWs(names);
        }
      })
      .catch((e) => console.error("Gagal memuat deviceTypes untuk rekap:", e));

    // Fetch cabang options
    fetch("/api/workstation")
      .then((res) => res.json())
      .then((data) => {
        if (data.items && Array.isArray(data.items)) {
          const names = data.items.map((c: { namaCabang: string }) => c.namaCabang);
          setCabangOptionsWs(names);
        }
      })
      .catch((e) => console.error("Gagal memuat cabang untuk rekap:", e));
  }, []);

  useEffect(() => {
    async function loadTickets() {
      setLoadingTickets(true);
      try {
        const res = await fetch("/api/tickets");
        if (res.ok) {
          const data = await res.json();
          const items: TicketOption[] = data.items || [];

          // 1. Tiket berstatus selesai untuk Berita Acara Cabang
          const targetItems = items.filter((t) => t.status === "selesai");
          targetItems.sort((a, b) => {
            const tA = new Date(a.wsTanggalMasuk || a.waktuOpen || 0).getTime();
            const tB = new Date(b.wsTanggalMasuk || b.waktuOpen || 0).getTime();
            return tB - tA;
          });
          setTickets(targetItems);

          // 2. Tiket dikirim ke vendor untuk Berita Acara Vendor
          const vItems = items.filter((t) => Boolean(t.wsTglKeVendor) || Boolean(t.wsVendor));
          vItems.sort((a, b) => {
            const tA = new Date(a.wsTglKeVendor || a.waktuOpen || 0).getTime();
            const tB = new Date(b.wsTglKeVendor || b.waktuOpen || 0).getTime();
            return tB - tA;
          });
          setVendorTickets(vItems);

          let target: TicketOption | undefined;
          let vTarget: TicketOption | undefined;

          if (ticketIdParam) {
            target = targetItems.find((t) => t.id === ticketIdParam);
            vTarget = vItems.find((t) => t.id === ticketIdParam);
          }
          if (!target && targetItems.length > 0) target = targetItems[0];
          if (!vTarget && vItems.length > 0) vTarget = vItems[0];

          if (target) {
            setSelectedTicketId(target.id);
            setFormAndDeviceFromTicket(target, true);
          }
          if (vTarget) {
            setSelectedVendorTicketId(vTarget.id);
            setVendorFormAndDeviceFromTicket(vTarget, true);
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

  // Opsi tiket utama untuk SearchableSelect
  const mainTicketOptions: SearchableOption[] = tickets.map((t) => ({
    value: t.id,
    label: `${t.wsTglKembaliKeCabang ? "[✓ Diserahkan] " : ""}${t.noTiket} — [${t.wsCabang}] ${t.wsMerekKomputer}`,
    sublabel: `SN: ${t.wsSnKomputer || "-"} | PIC Penerima: ${t.wsPicTerima || "-"}`,
  }));

  // Filter tiket berdasarkan Cabang yang dipilih pada Berita Acara
  const availableTicketsForBranch = tickets.filter(
    (t) => (t.wsCabang || "").toUpperCase() === (baForm.cabang || "").toUpperCase()
  );

  // Sembunyikan perangkat yang sudah ada di list (Deduplikasi)
  const unaddedTicketsForBranch = availableTicketsForBranch.filter(
    (t) => !deviceList.some((d) => d.id === t.id)
  );

  // Opsi perangkat tambahan untuk SearchableSelect
  const extraDeviceOptions: SearchableOption[] = unaddedTicketsForBranch.map((t) => ({
    value: t.id,
    label: `${t.wsTglKembaliKeCabang ? "[✓ Diserahkan] " : ""}${t.noTiket} — ${t.wsMerekKomputer}`,
    sublabel: `SN: ${t.wsSnKomputer || "-"}`,
  }));

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

  // --- Vendor Helpers ---
  function setVendorFormAndDeviceFromTicket(t: TicketOption, resetList = false) {
    const namaPerangkat = resolveNamaPerangkat(t.wsMerekKomputer);
    const sn = t.wsSnKomputer || "-";

    if (resetList) {
      setVendorDeviceList([{ id: t.id, namaPerangkat, sn, merekKomputer: t.wsMerekKomputer }]);
    } else {
      setVendorDeviceList((prev) => {
        if (prev.some((d) => d.id === t.id)) return prev;
        return [...prev, { id: t.id, namaPerangkat, sn, merekKomputer: t.wsMerekKomputer }];
      });
    }

    setBaVendorForm({
      vendorName: t.wsVendor || "PT. VENDOR INDONESIA",
      vendorPic: "",
      cabang: t.wsCabang || "Payakumbuh",
      tgl: t.wsTglKeVendor || today,
      diserahkanOleh: t.ownerNama?.toUpperCase() || "DIMAS TEGUH PRIBADI",
      jabatanDiserahkan: "Staff Bagian Infrastruktur Divisi T&D",
    });
  }

  function handleSelectVendorTicket(id: string) {
    setSelectedVendorTicketId(id);
    const found = vendorTickets.find((t) => t.id === id);
    if (found) {
      setVendorFormAndDeviceFromTicket(found, true);
    }
  }

  const vendorTicketOptions: SearchableOption[] = vendorTickets.map((t) => ({
    value: t.id,
    label: `${t.noTiket} — [${t.wsCabang}] ${t.wsMerekKomputer} (Vendor: ${t.wsVendor || "-"})`,
    sublabel: `SN: ${t.wsSnKomputer || "-"} | Tgl Ke Vendor: ${t.wsTglKeVendor || "-"}`,
  }));

  const unaddedVendorTickets = vendorTickets.filter(
    (t) => !vendorDeviceList.some((d) => d.id === t.id)
  );

  const extraVendorDeviceOptions: SearchableOption[] = unaddedVendorTickets.map((t) => ({
    value: t.id,
    label: `${t.noTiket} — [${t.wsCabang}] ${t.wsMerekKomputer}`,
    sublabel: `SN: ${t.wsSnKomputer || "-"} | Vendor: ${t.wsVendor || "-"}`,
  }));

  function handleAddExtraVendorDevice() {
    if (!addVendorDeviceId) return;
    const found = vendorTickets.find((t) => t.id === addVendorDeviceId);
    if (found) {
      const namaPerangkat = resolveNamaPerangkat(found.wsMerekKomputer);
      const sn = found.wsSnKomputer || "-";
      setVendorDeviceList((prev) => [...prev, { id: found.id, namaPerangkat, sn, merekKomputer: found.wsMerekKomputer }]);
      setAddVendorDeviceId("");
    }
  }

  function handleRemoveVendorDevice(index: number) {
    setVendorDeviceList((prev) => prev.filter((_, i) => i !== index));
  }

  function buildVendorSummaryText(): string {
    if (!vendorDeviceList || vendorDeviceList.length === 0) return "0 unit perangkat";

    const counts: Record<string, number> = {};

    for (const d of vendorDeviceList) {
      const foundTicket = vendorTickets.find((t) => t.id === d.id);
      const raw = d.merekKomputer || foundTicket?.wsMerekKomputer || d.namaPerangkat || "";
      const cat = resolveNamaPerangkat(raw);

      counts[cat] = (counts[cat] || 0) + 1;
    }

    const parts = Object.entries(counts).map(([cat, count]) => `${count} unit perangkat ${cat}`);

    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} dan ${parts[1]}`;
    return `${parts.slice(0, -1).join(", ")}, dan ${parts[parts.length - 1]}`;
  }

  async function handleDownloadBeritaAcaraVendorWord() {
    setDownloadingBaVendor(true);
    try {
      const response = await fetch("/api/reports/berita-acara-vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...baVendorForm,
          deviceList: vendorDeviceList,
          format: "word",
        }),
      });

      if (!response.ok) throw new Error("Gagal mengunduh dokumen");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BERITA_ACARA_VENDOR_${(baVendorForm.vendorName || "VENDOR").replace(/\s+/g, "_")}.doc`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Gagal mengunduh dokumen Berita Acara Vendor.");
    } finally {
      setDownloadingBaVendor(false);
    }
  }

  async function handlePrintBeritaAcaraVendor() {
    try {
      const response = await fetch("/api/reports/berita-acara-vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...baVendorForm,
          deviceList: vendorDeviceList,
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
      alert("Gagal mencetak Berita Acara Vendor.");
    }
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

    const params = new URLSearchParams({
      dari: tglDariWs,
      sampai: tglSampaiWs,
    });
    if (jenisPerangkatWs) params.set("jenisPerangkat", jenisPerangkatWs);
    if (cabangWs) params.set("cabang", cabangWs);
    if (statusWs) params.set("status", statusWs);
    if (supervisiWs) params.set("statusSupervisi", supervisiWs);
    if (searchWs.trim()) params.set("search", searchWs.trim());

    const tag = jenisPerangkatWs ? `_${jenisPerangkatWs.replace(/\s+/g, "_").toUpperCase()}` : "";
    const res = await downloadFile(
      `/api/rekap/workstation?${params.toString()}`,
      `REKAP_WORKSTATION${tag}_${tglDariWs}_sd_${tglSampaiWs}.xlsx`
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

      await performBatchSerahkan();
    } catch (e) {
      console.error(e);
      alert("Gagal mengunduh dokumen Berita Acara.");
    } finally {
      setDownloadingBa(false);
    }
  }

  async function performBatchSerahkan() {
    const unreturnedIds = deviceList
      .map(d => d.id)
      .filter(id => {
         const t = tickets.find(x => x.id === id);
         return t && !t.wsTglKembaliKeCabang;
      });

    if (unreturnedIds.length === 0) return;

    try {
      await fetch("/api/tickets/batch-serahkan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketIds: unreturnedIds,
          wsTglKembaliKeCabang: baForm.tgl,
          wsPicTerima: baForm.diterimaPic || baForm.diterimaOleh,
          activityText: `Penyerahan ke Cabang: Diterima oleh ${baForm.diterimaPic || baForm.diterimaOleh} (via Cetak Berita Acara)`
        }),
      });
      // Force reload to update UI state
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (e) {
      console.error("Batch serahkan failed:", e);
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

      await performBatchSerahkan();
    } catch (e) {
      console.error(e);
      alert("Gagal mencetak Berita Acara.");
    }
  }

  const dateFormatted = formatIndonesianDate(baForm.tgl);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* TAB NAVIGATION / SUB-JUDUL */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-hidden shadow-sm">
        <button
          onClick={() => setActiveTab("workstation")}
          className={`flex-1 py-4 px-4 text-center font-bold text-sm transition-all flex items-center justify-center gap-2 border-b-2 ${
            activeTab === "workstation"
              ? "border-primary text-primary bg-primary-50/30"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" /> 1. Rekap Laporan Workstation
        </button>
        <button
          onClick={() => setActiveTab("berita-acara")}
          className={`flex-1 py-4 px-4 text-center font-bold text-sm transition-all flex items-center justify-center gap-2 border-b-2 ${
            activeTab === "berita-acara"
              ? "border-primary text-primary bg-primary-50/30"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <FileText className="w-4 h-4 text-blue-600" /> 2. Berita Acara Cabang
        </button>
        <button
          onClick={() => setActiveTab("berita-acara-vendor")}
          className={`flex-1 py-4 px-4 text-center font-bold text-sm transition-all flex items-center justify-center gap-2 border-b-2 ${
            activeTab === "berita-acara-vendor"
              ? "border-purple-600 text-purple-700 bg-purple-50/30"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <FileText className="w-4 h-4 text-purple-600" /> 3. Berita Acara Vendor
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
              Filter data berdasarkan tanggal, jenis perangkat (misal khusus <strong>EDC</strong>), cabang, status, dan approval supervisi untuk diunduh dalam format Excel. 
            </p>

            {/* PANEL FILTER SISIPAN PERSIS SEPERTI STREAMLINED FILTER BAR */}
            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 space-y-3 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Dari</label>
                  <input
                    type="date"
                    value={tglDariWs}
                    onChange={(e) => setTglDariWs(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Sampai</label>
                  <input
                    type="date"
                    value={tglSampaiWs}
                    onChange={(e) => setTglSampaiWs(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>

                <Select
                  label="Jenis Perangkat"
                  value={jenisPerangkatWs}
                  onChange={(e) => setJenisPerangkatWs(e.target.value)}
                >
                  <option value="">Semua Perangkat</option>
                  {deviceOptionsWs.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Cabang"
                  value={cabangWs}
                  onChange={(e) => setCabangWs(e.target.value)}
                >
                  <option value="">Semua Cabang</option>
                  {cabangOptionsWs.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Status"
                  value={statusWs}
                  onChange={(e) => setStatusWs(e.target.value)}
                >
                  <option value="">Semua Status</option>
                  <option value="proses">Dalam Proses</option>
                  <option value="selesai">Selesai</option>
                </Select>

                <Select
                  label="Supervisi"
                  value={supervisiWs}
                  onChange={(e) => setSupervisiWs(e.target.value)}
                >
                  <option value="">Semua Approval</option>
                  <option value="approved">Approved</option>
                  <option value="belum">Belum Approved</option>
                </Select>

                <Button onClick={unduhWorkstation} loading={loadingWs} className="w-full bg-primary hover:bg-primary/90">
                  {!loadingWs && <Download className="w-4 h-4 mr-1 inline" />} Download Excel
                </Button>
              </div>

              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Cari berdasarkan nomor tiket, kerusakan, merek, vendor..."
                  value={searchWs}
                  onChange={(e) => setSearchWs(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && unduhWorkstation()}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-gray-300 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </div>

            {errWs && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {errWs}
              </p>
            )}
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

                <div className="mb-4 space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    Pilih dari Tiket Perangkat Utama (Status: Selesai &amp; Diserahkan)
                  </label>

                  {tickets.length > 0 ? (
                    <SearchableSelect
                      options={mainTicketOptions}
                      value={selectedTicketId}
                      onChange={(val) => handleSelectMainTicket(val)}
                      placeholder="-- Cari / Pilih Tiket Perangkat Utama --"
                      emptyText="Tidak ada tiket berstatus Selesai yang cocok"
                    />
                  ) : (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                      Belum ada tiket berstatus Selesai (Closed) yang diserahkan ke Cabang.
                    </p>
                  )}
                </div>

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
                  <div className="pt-2 border-t border-gray-200 space-y-2">
                    <label className="block text-xs font-bold text-gray-700">
                      Opsi Penambahan Perangkat (Cabang: {baForm.cabang})
                    </label>

                    {unaddedTicketsForBranch.length > 0 ? (
                      <div className="flex items-center gap-2 w-full">
                        <div className="flex-1 min-w-0">
                          <SearchableSelect
                            options={extraDeviceOptions}
                            value={addDeviceId}
                            onChange={(val) => setAddDeviceId(val)}
                            placeholder="-- Cari / Pilih Perangkat Lain --"
                            emptyText="Tidak ada perangkat tambahan yang cocok"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!addDeviceId}
                          onClick={handleAddExtraDevice}
                          className="shrink-0 text-xs px-3 py-2.5 whitespace-nowrap"
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

      {/* SUB-JUDUL 3: LAPORAN BERITA ACARA SERAH TERIMA PERBAIKAN VENDOR */}
      {activeTab === "berita-acara-vendor" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* FORM INPUT DOKUMEN VENDOR */}
            <div className="lg:col-span-5 space-y-4">
              <Card padding="md">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-purple-700">
                    <FileText className="w-4 h-4 text-purple-600" /> Data Berita Acara Vendor
                  </CardTitle>
                </CardHeader>

                <div className="mb-4 space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    Pilih Tiket Perangkat (Dikirim ke Vendor)
                  </label>

                  {vendorTickets.length > 0 ? (
                    <SearchableSelect
                      options={vendorTicketOptions}
                      value={selectedVendorTicketId}
                      onChange={(val) => handleSelectVendorTicket(val)}
                      placeholder="-- Cari / Pilih Tiket Perbaikan Vendor --"
                      emptyText="Tidak ada tiket perbaikan vendor yang cocok"
                    />
                  ) : (
                    <p className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-md p-2">
                      Belum ada tiket yang tercatat dikirim ke Vendor.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Nama Vendor / Perusahaan Vendor</label>
                    <Input
                      value={baVendorForm.vendorName}
                      onChange={(e) => setBaVendorForm({ ...baVendorForm, vendorName: e.target.value })}
                      placeholder="PT. LENOVO INDONESIA / VENDOR"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Nama PIC / Teknisi Vendor</label>
                    <Input
                      value={baVendorForm.vendorPic}
                      onChange={(e) => setBaVendorForm({ ...baVendorForm, vendorPic: e.target.value })}
                      placeholder="BUDI (TEKNISI VENDOR)"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Cabang Asal Perangkat</label>
                    <Input
                      value={baVendorForm.cabang}
                      onChange={(e) => setBaVendorForm({ ...baVendorForm, cabang: e.target.value })}
                      placeholder="Payakumbuh"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Tanggal Penyerahan ke Vendor</label>
                    <Input
                      type="date"
                      value={baVendorForm.tgl}
                      onChange={(e) => setBaVendorForm({ ...baVendorForm, tgl: e.target.value })}
                    />
                  </div>

                  {/* OPSI PENAMBAHAN PERANGKAT VENDOR */}
                  <div className="pt-2 border-t border-gray-200 space-y-2">
                    <label className="block text-xs font-bold text-gray-700">
                      Opsi Penambahan Perangkat Vendor
                    </label>

                    {unaddedVendorTickets.length > 0 ? (
                      <div className="flex items-center gap-2 w-full">
                        <div className="flex-1 min-w-0">
                          <SearchableSelect
                            options={extraVendorDeviceOptions}
                            value={addVendorDeviceId}
                            onChange={(val) => setAddVendorDeviceId(val)}
                            placeholder="-- Cari Perangkat Vendor Lain --"
                            emptyText="Tidak ada perangkat vendor lain yang cocok"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!addVendorDeviceId}
                          onClick={handleAddExtraVendorDevice}
                          className="shrink-0 text-xs px-3 py-2.5 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1 inline" /> Tambah
                        </Button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic mb-2">
                        Semua perangkat vendor sudah dimasukkan ke list.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Diserahkan Oleh (Petugas IT)</label>
                    <Input
                      value={baVendorForm.diserahkanOleh}
                      onChange={(e) => setBaVendorForm({ ...baVendorForm, diserahkanOleh: e.target.value })}
                      placeholder="DIMAS TEGUH PRIBADI"
                    />
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <Button
                    onClick={handleDownloadBeritaAcaraVendorWord}
                    loading={downloadingBaVendor}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {!downloadingBaVendor && <FileText className="w-4 h-4 mr-1.5" />} Download BA Vendor (.doc)
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handlePrintBeritaAcaraVendor}
                    className="w-full border-purple-600 text-purple-700 hover:bg-purple-50"
                  >
                    <Printer className="w-4 h-4 mr-1.5 text-purple-600" /> Cetak / Export PDF Vendor
                  </Button>
                </div>
              </Card>
            </div>

            {/* LIVE VENDOR DOCUMENT PREVIEW */}
            <div className="lg:col-span-7">
              <Card padding="md" className="bg-gray-100/70 border border-gray-300">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600" /> Preview Dokumen Berita Acara Vendor (A4)
                  </span>
                  <span className="text-[11px] text-gray-400">Otomatis Update</span>
                </div>

                {/* TEMPLAT DOKUMEN BERITA ACARA VENDOR */}
                <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-300 text-gray-900 text-xs sm:text-sm font-sans leading-relaxed">
                  {/* LOGO BANK NAGARI */}
                  <div className="flex items-center justify-start mb-6">
                    <img src="/logo-bank-nagari.png" alt="Logo Bank Nagari" className="h-10 object-contain" />
                  </div>

                  {/* JUDUL */}
                  <div className="text-center my-6 space-y-0.5">
                    <h1 className="font-bold text-sm sm:text-base uppercase tracking-wide">BERITA ACARA</h1>
                    <h2 className="font-bold text-xs sm:text-sm uppercase tracking-wide text-indigo-900">SERAH TERIMA PERANGKAT UNTUK PERBAIKAN VENDOR</h2>
                  </div>

                  {/* PARAGRAF PENYERAHAN */}
                  <p className="mb-4 text-justify leading-relaxed">
                    Pada hari ini <strong>{formatIndonesianDate(baVendorForm.tgl).hari}</strong> Tanggal <strong>{formatIndonesianDate(baVendorForm.tgl).tglFull}</strong> telah dilakukan penyerahan <strong>{buildVendorSummaryText()}</strong> milik <strong>{baVendorForm.cabang.startsWith('Cabang') ? baVendorForm.cabang : `Cabang ${baVendorForm.cabang}`}</strong> kepada pihak Vendor <strong>{baVendorForm.vendorName || "VENDOR"}</strong> untuk perbaikan/pemeliharaan perangkat dengan rincian sebagai berikut:
                  </p>

                  {/* TABEL RINCIAN MULTI-DEVICE VENDOR */}
                  <table className="w-full border-collapse border border-black my-4 text-xs">
                    <thead>
                      <tr className="bg-indigo-100 font-bold text-center">
                        <td className="border border-black p-2 w-10">No</td>
                        <td className="border border-black p-2 text-left">Nama / Merek Perangkat</td>
                        <td className="border border-black p-2 w-36">Serial Number (S/N)</td>
                        {vendorDeviceList.length > 1 && <td className="border border-black p-2 w-10 text-center">Aksi</td>}
                      </tr>
                    </thead>
                    <tbody>
                      {vendorDeviceList.map((d, idx) => (
                        <tr key={d.id || idx} className="hover:bg-gray-50">
                          <td className="border border-black p-2 text-center">{idx + 1}</td>
                          <td className="border border-black p-2">{d.namaPerangkat}</td>
                          <td className="border border-black p-2 text-center font-mono">{d.sn}</td>
                          {vendorDeviceList.length > 1 && (
                            <td className="border border-black p-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveVendorDevice(idx)}
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
                    Demikianlah berita acara serah terima perbaikan vendor ini dibuat rangkap 2 (dua) untuk dapat dipergunakan sebagaimana mestinya.
                  </p>

                  {/* TANGGAL */}
                  <div className="text-center my-4 font-medium">
                    Padang, {formatIndonesianDate(baVendorForm.tgl).tglFull}
                  </div>

                  {/* BOX TANDA TANGAN 2 KOLOM VENDOR */}
                  <div className="grid grid-cols-2 border border-black h-[160px] text-xs">
                    <div className="border-r border-black p-3 flex flex-col justify-between">
                      <div>
                        <div>Diserahkan oleh (IT Support):</div>
                        <div className="text-[11px] text-gray-700">{baVendorForm.jabatanDiserahkan}</div>
                      </div>
                      <div>
                        <div className="font-bold underline uppercase">{baVendorForm.diserahkanOleh}</div>
                        <div className="text-[11px] text-gray-600">Petugas IT Bank Nagari</div>
                      </div>
                    </div>
                    <div className="p-3 flex flex-col justify-between">
                      <div>
                        <div>Diterima oleh (Vendor):</div>
                        <div className="text-[11px] text-gray-700">Vendor: <strong>{baVendorForm.vendorName}</strong></div>
                      </div>
                      <div>
                        <div className="font-bold underline uppercase">{baVendorForm.vendorPic || "........................"}</div>
                        <div className="text-[11px] text-gray-600">Teknisi / PIC Vendor</div>
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
