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
  Edit3,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { fmtDateTime } from "@/lib/format";
import type { TicketDetail } from "@/lib/ticketQueries";

const DAFTAR_CABANG_DEFAULT = [
  "PAYAKUMBUH",
  "BUKITTINGGI",
  "BATUSANGKAR",
  "SOLOK",
  "PARIAMAN",
  "PAINAN",
  "SIJUNJUNG",
  "LUBUK SIKAPING",
  "PASAR RAYA",
  "SITEBA",
  "SAWAHLUNTO",
  "SIMPANG EMPAT",
  "MUARA LABUH",
  "LUBUK GADANG",
  "KOTO BARU",
  "PULAU PUNJUNG",
  "UJUNG GADING",
  "LUBUK BASUNG",
  "LUBUK ALUNG",
  "TAPAN",
  "LINTAU",
  "CABANG UTAMA",
  "MENTAWAI",
  "TAPUS",
  "ALAHAN PANJANG",
  "JAKARTA",
  "PEKANBARU",
  "BANDUNG",
  "SYARIAH PADANG",
  "SYARIAH SOLOK",
  "SYARIAH PAYAKUMBUH",
  "SYARIAH BUKITTINGGI",
  "SYARIAH BATUSANGKAR",
  "PADANG PANJANG",
];

interface CustomField {
  id: string;
  label: string;
  type: "text" | "date" | "select" | "textarea";
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

interface DeviceTypeOption {
  id: string;
  nama: string;
  subtypes: string[];
  customFields?: CustomField[];
}

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
    (role === "user" || role === "superadmin") &&
    (ticket.ownerId === currentUserId || !ticket.ownerId || role === "superadmin");

  const isSelesai = ticket.status === "selesai";
  const isCurrentlyInVendor =
    Boolean(ticket.wsTglKeVendor) &&
    (!ticket.wsTglSelesaiVendor || new Date(ticket.wsTglSelesaiVendor) < new Date(ticket.wsTglKeVendor!));
  const isSentToCabang = Boolean(ticket.wsTglKembaliKeCabang);

  // State master data
  const [daftarCabang, setDaftarCabang] = useState<string[]>(DAFTAR_CABANG_DEFAULT);
  const [merekKomputerList, setMerekKomputerList] = useState<string[]>(["Lenovo", "HP", "Dell", "Acer", "Asus", "Apple", "Fujitsu"]);
  const [merekEdcList, setMerekEdcList] = useState<string[]>(["Ingenico", "Verifone", "Pax", "Sunmi", "MoreFun", "Castle"]);
  const [deviceTypesList, setDeviceTypesList] = useState<DeviceTypeOption[]>([
    { id: "workstation", nama: "Komputer", subtypes: ["Desktop", "All-in-One", "Laptop", "Mini PC"] },
    { id: "edc", nama: "Mesin EDC", subtypes: [] },
  ]);

  // State log kegiatan manual
  const [kegiatan, setKegiatan] = useState("");
  const [savingKegiatan, setSavingKegiatan] = useState(false);
  const [kegiatanErr, setKegiatanErr] = useState("");

  // State Modal Detail (Read-Only)
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // State Modal Edit Tiket Input Awal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [editNoSurat, setEditNoSurat] = useState("");
  const [editSn, setEditSn] = useState("");
  const [editCabang, setEditCabang] = useState("");
  const [editCapem, setEditCapem] = useState("");
  const [editTglMasuk, setEditTglMasuk] = useState("");
  const [editDeviceId, setEditDeviceId] = useState<string>("workstation");
  const [editSubtype, setEditSubtype] = useState<string>("");
  const [editMerekPilihan, setEditMerekPilihan] = useState<string>("");
  const [editKelengkapan, setEditKelengkapan] = useState("");
  const [editKerusakan, setEditKerusakan] = useState("");
  const [editCustomValues, setEditCustomValues] = useState<Record<string, string>>({});
  const [editCpTipe, setEditCpTipe] = useState<"pic" | "wag">("pic");
  const [editCpNama, setEditCpNama] = useState("");
  const [editCpTelp, setEditCpTelp] = useState("");

  // State Penyerahan ke Vendor Modal
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [vendorNameInput, setVendorNameInput] = useState(ticket.wsVendor || "");
  const [vendorPicInput, setVendorPicInput] = useState("");
  const [vendorSaving, setVendorSaving] = useState(false);
  const [vendorErr, setVendorErr] = useState("");
  const [vendorOptions, setVendorOptions] = useState<string[]>(["PT Infomedia", "Vendor Lenovo", "PT Multipolar", "Vendor HP", "PT Visionet"]);

  useEffect(() => {
    fetch("/api/workstation")
      .then((res) => res.json())
      .then((data) => {
        if (data.items && data.items.length > 0) {
          setDaftarCabang(data.items.map((item: { namaCabang: string }) => item.namaCabang));
        }
      })
      .catch((err) => console.error("Gagal memuat cabang:", err));

    fetch("/api/master-options")
      .then((res) => res.json())
      .then((data) => {
        if (data.vendorList && Array.isArray(data.vendorList)) {
          setVendorOptions(data.vendorList);
        }
        if (data.merekKomputer && Array.isArray(data.merekKomputer)) {
          setMerekKomputerList(data.merekKomputer.filter((m: string) => m !== "Lainnya (Ketik Manual)"));
        }
        if (data.merekEdc && Array.isArray(data.merekEdc)) {
          setMerekEdcList(data.merekEdc.filter((m: string) => m !== "Lainnya (Ketik Manual)"));
        }
        if (data.deviceTypes && Array.isArray(data.deviceTypes) && data.deviceTypes.length > 0) {
          setDeviceTypesList(data.deviceTypes);
        }
      })
      .catch((err) => console.error("Gagal memuat master options:", err));
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

  function parseMerekKomputer(raw: string, devTypes: DeviceTypeOption[]) {
    let devId = devTypes[0]?.id || "workstation";
    let subtype = "";
    let brand = raw || "";

    if (!raw) return { devId, subtype, brand };

    const match = raw.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
      const inside = match[1];
      brand = match[2].trim();

      if (inside.includes(" - ")) {
        const parts = inside.split(" - ");
        const devName = parts[0].trim();
        subtype = parts[1].trim();
        const foundDev = devTypes.find(
          (d) => d.nama.toLowerCase().includes(devName.toLowerCase()) || devName.toLowerCase().includes(d.nama.toLowerCase())
        );
        if (foundDev) devId = foundDev.id;
      } else {
        const devName = inside.trim();
        const foundDev = devTypes.find(
          (d) => d.nama.toLowerCase().includes(devName.toLowerCase()) || devName.toLowerCase().includes(d.nama.toLowerCase())
        );
        if (foundDev) devId = foundDev.id;
      }
    } else {
      brand = raw.trim();
    }

    return { devId, subtype, brand };
  }

  const activeDeviceObj = deviceTypesList.find((d) => d.id === editDeviceId) || deviceTypesList[0];

  const defaultFields: CustomField[] = [
    { id: "cabang", label: "Cabang", type: "select", required: true, options: daftarCabang },
    { id: "tanggalMasuk", label: "Tanggal Masuk", type: "date", required: true },
    { id: "noSurat", label: "Nomor Surat", type: "text", required: true, placeholder: "cth: SR/00/XX/XXX/00-2026" },
    { id: "merek", label: `Merek ${activeDeviceObj ? activeDeviceObj.nama : "Perangkat"}`, type: "select", required: true },
    { id: "capem", label: "Cabang Pembantu / Capem (opsional)", type: "text", required: false, placeholder: "cth: UNAND, dsb" },
    { id: "kelengkapan", label: "Kelengkapan", type: "text", required: true, placeholder: "cth: Adaptor, kabel, dus, dsb" },
    { id: "sn", label: `Serial Number (SN) ${activeDeviceObj ? activeDeviceObj.nama : "Perangkat"}`, type: "text", required: true, placeholder: "Nomor seri mesin / perangkat..." },
    { id: "kerusakan", label: "Kerusakan", type: "textarea", required: true, placeholder: "Jelaskan detail kerusakan..." },
  ];

  const activeFields =
    activeDeviceObj?.customFields && activeDeviceObj.customFields.length > 0
      ? activeDeviceObj.customFields
      : defaultFields;

  const hasMerekInFields = editDeviceId !== "edc" && activeFields.some((f) => f.id === "merek");

  function getEditFieldValue(fieldId: string): string {
    switch (fieldId) {
      case "cabang": return editCabang;
      case "tanggalMasuk": return editTglMasuk;
      case "noSurat": return editNoSurat;
      case "merek": return editMerekPilihan;
      case "capem": return editCapem;
      case "kelengkapan": return editKelengkapan;
      case "sn": return editSn;
      case "kerusakan": return editKerusakan;
      default:
        const cfg = activeFields.find((f) => f.id === fieldId || f.label === fieldId);
        return editCustomValues[fieldId] || (cfg ? editCustomValues[cfg.label] : "") || "";
    }
  }

  function setEditFieldValue(fieldId: string, val: string) {
    switch (fieldId) {
      case "cabang": setEditCabang(val); break;
      case "tanggalMasuk": setEditTglMasuk(val); break;
      case "noSurat": setEditNoSurat(val); break;
      case "merek": setEditMerekPilihan(val); break;
      case "capem": setEditCapem(val); break;
      case "kelengkapan": setEditKelengkapan(val); break;
      case "sn": setEditSn(val); break;
      case "kerusakan": setEditKerusakan(val); break;
      default:
        setEditCustomValues((prev) => ({ ...prev, [fieldId]: val }));
        break;
    }
  }

  function getFormattedEditMerek(): string {
    const devName = activeDeviceObj
      ? activeDeviceObj.nama.replace(/\s*\/\s*Komputer/i, "").replace(/Workstation\s*\/\s*/i, "")
      : "Perangkat";

    if (!hasMerekInFields) {
      if (editSubtype) {
        return `[${devName} - ${editSubtype}]`;
      }
      return `[${devName}]`;
    }

    const brand = editMerekPilihan.trim();

    if (editSubtype) {
      return brand ? `[${devName} - ${editSubtype}] ${brand}` : `[${devName} - ${editSubtype}]`;
    }
    return brand ? `[${devName}] ${brand}` : `[${devName}]`;
  }

  function parseKerusakanAndCustomValues(rawKerusakan: string, fields: CustomField[]) {
    let mainKerusakan = rawKerusakan || "";
    const parsedValues: Record<string, string> = {};

    const matchExtra = mainKerusakan.match(/^([\s\S]*?)(?:\n?\[Catatan Tambahan:\s*([\s\S]*?)\])?$/);
    if (matchExtra) {
      mainKerusakan = matchExtra[1].trim();
      const extraStr = matchExtra[2];
      if (extraStr) {
        const parts = extraStr.split(" | ");
        for (const p of parts) {
          const idx = p.indexOf(":");
          if (idx !== -1) {
            const keyOrLabel = p.slice(0, idx).trim();
            const val = p.slice(idx + 1).trim();

            const matchedField = fields.find(
              (f) => f.id.toLowerCase() === keyOrLabel.toLowerCase() || f.label.toLowerCase() === keyOrLabel.toLowerCase()
            );

            if (matchedField) {
              parsedValues[matchedField.id] = val;
            } else {
              parsedValues[keyOrLabel] = val;
            }
          }
        }
      }
    }

    return { mainKerusakan, parsedValues };
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditErr("");

    // Validasi field dinamis dari activeFields
    for (const field of activeFields) {
      if (field.id === "capem") continue;
      if (field.id === "merek" && (!hasMerekInFields || editDeviceId === "edc")) continue;

      if (field.required !== false) {
        const val = getEditFieldValue(field.id);
        if (!val || !val.trim()) {
          return setEditErr(`${field.label} wajib diisi.`);
        }
      }
    }

    if (!editCpNama.trim()) return setEditErr("Nama PIC wajib diisi.");
    if (!editCpTelp.trim()) return setEditErr("Nomor telepon PIC wajib diisi.");

    const phoneDigitsOnly = /^[0-9]+$/;
    if (!phoneDigitsOnly.test(editCpTelp.trim()) || editCpTelp.trim().length < 10 || editCpTelp.trim().length > 14) {
      return setEditErr("Nomor telepon (PIC) hanya boleh berupa angka (numeric) dengan panjang 10 hingga 14 digit.");
    }

    // Susun finalKerusakan tanpa duplikasi key kustom
    let finalKerusakan = editKerusakan.trim();
    const extraParts: string[] = [];

    for (const field of activeFields) {
      if (["cabang", "tanggalMasuk", "noSurat", "merek", "capem", "kelengkapan", "sn", "kerusakan"].includes(field.id)) {
        continue;
      }
      const val = (editCustomValues[field.id] || editCustomValues[field.label] || "").trim();
      if (val) {
        extraParts.push(`${field.label}: ${val}`);
      }
    }

    if (extraParts.length > 0) {
      const extraText = extraParts.join(" | ");
      finalKerusakan = finalKerusakan
        ? `${finalKerusakan}\n[Catatan Tambahan: ${extraText}]`
        : `[Catatan Tambahan: ${extraText}]`;
    }

    const formattedMerek = getFormattedEditMerek();

    // Parse main kerusakan lama dan nilai kustom lama untuk membandingkan perubahan
    const { mainKerusakan: oldMainKerusakan, parsedValues: oldCustomValues } = parseKerusakanAndCustomValues(
      ticket.wsKerusakan || "",
      activeFields
    );

    // Deteksi rincian perubahan data tiket (apa yang diubah menjadi apa)
    const changes: string[] = [];

    if (editCabang.trim() !== (ticket.wsCabang || "")) {
      changes.push(`Cabang: '${ticket.wsCabang || "—"}' ➔ '${editCabang.trim()}'`);
    }
    if ((editCapem.trim() || "") !== (ticket.wsCapem || "")) {
      changes.push(`Capem: '${ticket.wsCapem || "—"}' ➔ '${editCapem.trim() || "—"}'`);
    }
    if (editNoSurat.trim() !== (ticket.wsNoSurat || "")) {
      changes.push(`No Surat: '${ticket.wsNoSurat || "—"}' ➔ '${editNoSurat.trim()}'`);
    }

    const oldTglStr = ticket.wsTanggalMasuk ? new Date(ticket.wsTanggalMasuk).toISOString().slice(0, 16) : "";
    if (editTglMasuk && editTglMasuk !== oldTglStr) {
      changes.push(`Tanggal Masuk: '${oldTglStr || "—"}' ➔ '${editTglMasuk}'`);
    }

    if (formattedMerek !== (ticket.wsMerekKomputer || "")) {
      changes.push(`Merek/Perangkat: '${ticket.wsMerekKomputer || "—"}' ➔ '${formattedMerek}'`);
    }
    if (editSn.trim() !== (ticket.wsSnKomputer || "")) {
      changes.push(`Serial Number (SN): '${ticket.wsSnKomputer || "—"}' ➔ '${editSn.trim()}'`);
    }
    if (editKelengkapan.trim() !== (ticket.wsKelengkapan || "")) {
      changes.push(`Kelengkapan: '${ticket.wsKelengkapan || "—"}' ➔ '${editKelengkapan.trim()}'`);
    }

    // Cek perubahan Kerusakan (hanya teks utama)
    if (editKerusakan.trim() !== oldMainKerusakan) {
      changes.push(`Kerusakan: '${oldMainKerusakan || "—"}' ➔ '${editKerusakan.trim()}'`);
    }

    // Cek perubahan masing-masing field kustom (TES, COBA, dsb) secara spesifik
    for (const field of activeFields) {
      if (["cabang", "tanggalMasuk", "noSurat", "merek", "capem", "kelengkapan", "sn", "kerusakan"].includes(field.id)) {
        continue;
      }
      const oldVal = (oldCustomValues[field.id] || oldCustomValues[field.label] || "").trim();
      const newVal = (editCustomValues[field.id] || editCustomValues[field.label] || "").trim();

      if (oldVal !== newVal) {
        changes.push(`${field.label}: '${oldVal || "—"}' ➔ '${newVal || "—"}'`);
      }
    }

    if (editCpNama.trim() !== (ticket.cpNama || "")) {
      changes.push(`Nama PIC: '${ticket.cpNama || "—"}' ➔ '${editCpNama.trim()}'`);
    }
    if (editCpTelp.trim() !== (ticket.cpTelp || "")) {
      changes.push(`No Telp/WA: '${ticket.cpTelp || "—"}' ➔ '${editCpTelp.trim()}'`);
    }

    const activityText =
      changes.length > 0
        ? `Memperbarui rincian data tiket:\n- ` + changes.join("\n- ")
        : `Memperbarui rincian data tiket (${editNoSurat.trim()} / SN: ${editSn.trim()})`;

    setEditSaving(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wsCabang: editCabang.trim(),
          wsCapem: editCapem.trim() || null,
          wsNoSurat: editNoSurat.trim(),
          wsMerekKomputer: formattedMerek,
          wsSnKomputer: editSn.trim(),
          wsKelengkapan: editKelengkapan.trim(),
          wsKerusakan: finalKerusakan,
          wsTanggalMasuk: editTglMasuk ? new Date(editTglMasuk).toISOString() : undefined,
          cpTipe: "pic",
          cpNama: editCpNama.trim(),
          cpTelp: editCpTelp.trim(),
          activityText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditErr(data.error ?? "Gagal menyimpan perubahan tiket.");
        return;
      }
      setEditModalOpen(false);
      await reload();
    } catch {
      setEditErr("Terjadi kesalahan jaringan saat menyimpan perubahan.");
    } finally {
      setEditSaving(false);
    }
  }

  // --- HANDLER PENYERAHAN KE VENDOR ---
  async function handleSendToVendor(e: React.FormEvent) {
    e.preventDefault();
    setVendorErr("");
    if (isCurrentlyInVendor) {
      return setVendorErr("Perangkat saat ini sedang berada di Vendor. Silakan lakukan pengembalian dari Vendor terlebih dahulu!");
    }
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
          wsTglSelesaiVendor: null,
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
    if (isCurrentlyInVendor) {
      return setCabangErr("Perangkat saat ini sedang berada di Vendor. Silakan tekan 'Terima dari Vendor' terlebih dahulu!");
    }
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

            {/* Tombol Edit Tiket */}
            <Button
              variant="outline"
              size="sm"
              disabled={isSelesai}
              onClick={() => {
                if (isSelesai) return;
                setEditErr("");
                setEditNoSurat(ticket.wsNoSurat || "");
                setEditSn(ticket.wsSnKomputer || "");
                setEditCabang(ticket.wsCabang || "");
                setEditCapem(ticket.wsCapem || "");
                setEditTglMasuk(
                  ticket.wsTanggalMasuk
                    ? new Date(ticket.wsTanggalMasuk).toISOString().slice(0, 16)
                    : ""
                );

                const parsed = parseMerekKomputer(ticket.wsMerekKomputer || "", deviceTypesList);
                setEditDeviceId(parsed.devId);
                setEditSubtype(parsed.subtype);
                setEditMerekPilihan(parsed.brand);

                // Parse wsKerusakan & customValues
                const { mainKerusakan, parsedValues } = parseKerusakanAndCustomValues(ticket.wsKerusakan || "", activeFields);

                setEditKelengkapan(ticket.wsKelengkapan || "");
                setEditKerusakan(mainKerusakan);
                setEditCustomValues(parsedValues);
                setEditCpTipe((ticket.cpTipe as "pic" | "wag") || "pic");
                setEditCpNama(ticket.cpNama || "");
                setEditCpTelp(ticket.cpTelp || "");
                setEditModalOpen(true);
              }}
              className={
                isSelesai
                  ? "border-gray-200 text-gray-400 bg-gray-50 opacity-60 cursor-not-allowed"
                  : "border-indigo-600 text-indigo-700 hover:bg-indigo-50"
              }
              title={isSelesai ? "Tiket sudah Selesai (Closed)." : "Edit Tiket"}
            >
              <Edit3 className="w-4 h-4 text-indigo-600" /> Edit Tiket
            </Button>

            {/* Tombol Vendor Dynamically Toggle */}
            {isCurrentlyInVendor ? (
              <Button
                variant="outline"
                size="sm"
                disabled={isSelesai}
                onClick={() => {
                  if (isSelesai) return;
                  setVendorReturnErr("");
                  setVendorReturnModalOpen(true);
                }}
                className={
                  isSelesai
                    ? "border-gray-200 text-gray-400 bg-gray-50 opacity-60 cursor-not-allowed"
                    : "border-orange-600 text-orange-700 hover:bg-orange-50 font-bold"
                }
                title={
                  isSelesai
                    ? "Tiket sudah Selesai (Closed)."
                    : "Terima/Pengembalian dari Vendor"
                }
              >
                <CornerDownLeft className="w-4 h-4 text-orange-600" /> Terima dari Vendor
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={isSentToCabang || isSelesai}
                onClick={() => {
                  if (isSentToCabang || isSelesai) return;
                  setVendorErr("");
                  setVendorModalOpen(true);
                }}
                className={
                  isSentToCabang || isSelesai
                    ? "border-gray-200 text-gray-400 bg-gray-50 opacity-60 cursor-not-allowed"
                    : "border-amber-600 text-amber-700 hover:bg-amber-50"
                }
                title={
                  isSelesai
                    ? "Tiket sudah Selesai (Closed)."
                    : isSentToCabang
                    ? "Perangkat sudah diserahkan ke Cabang."
                    : "Penyerahan ke Vendor"
                }
              >
                <Truck className="w-4 h-4 text-amber-600" /> Penyerahan ke Vendor
              </Button>
            )}

            {/* Tombol Penyerahan ke Cabang */}
            <Button
              variant="outline"
              size="sm"
              disabled={isCurrentlyInVendor || isSentToCabang || isSelesai}
              onClick={() => {
                if (isCurrentlyInVendor) {
                  alert("Perangkat saat ini sedang di-servis di Vendor! Silakan tekan tombol 'Terima dari Vendor' terlebih dahulu sebelum melakukan penyerahan ke cabang.");
                  return;
                }
                if (isSentToCabang || isSelesai) return;
                setCabangErr("");
                setCabangModalOpen(true);
              }}
              className={
                isCurrentlyInVendor || isSentToCabang || isSelesai
                  ? "border-gray-200 text-gray-400 bg-gray-50 opacity-60 cursor-not-allowed"
                  : "border-emerald-600 text-emerald-700 hover:bg-emerald-50"
              }
              title={
                isSelesai
                  ? "Tiket sudah Selesai (Closed)."
                  : isSentToCabang
                  ? "Perangkat sudah diserahkan ke Cabang."
                  : isCurrentlyInVendor
                  ? "Perangkat sedang di Vendor. Harus 'Terima dari Vendor' dulu!"
                  : "Penyerahan Perangkat ke Cabang"
              }
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

            {/* Tombol Close Tiket */}
            {!isSelesai && (
              <Button
                size="sm"
                disabled={isCurrentlyInVendor}
                onClick={() => {
                  if (isCurrentlyInVendor) {
                    alert("Perangkat saat ini sedang di-servis di Vendor! Silakan lakukan pengembalian dari Vendor terlebih dahulu sebelum melakukan Close Tiket.");
                    return;
                  }
                  setActionErr("");
                  setCloseOpen(true);
                }}
                className={
                  isCurrentlyInVendor
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
                    : "bg-primary hover:bg-primary-600 text-white"
                }
                title={
                  isCurrentlyInVendor
                    ? "Perangkat sedang di Vendor. Harus 'Terima dari Vendor' dulu!"
                    : "Close Tiket"
                }
              >
                <CheckCircle2 className="w-4 h-4" /> Close Tiket
              </Button>
            )}

            {/* Tombol Hapus Tiket */}
            <Button
              variant="danger"
              size="sm"
              className={
                isSentToCabang || isSelesai
                  ? "ml-auto bg-gray-200 text-gray-400 border-gray-200 opacity-60 cursor-not-allowed"
                  : "ml-auto"
              }
              disabled={isSentToCabang || isSelesai}
              onClick={() => {
                if (isSentToCabang || isSelesai) return;
                setActionErr("");
                setDelOpen(true);
              }}
              title={
                isSelesai
                  ? "Tiket sudah Selesai (Closed) dan tidak dapat dihapus."
                  : isSentToCabang
                  ? "Perangkat telah diserahkan ke Cabang dan tiket tidak dapat dihapus."
                  : "Hapus Tiket"
              }
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

          {isSelesai && (
            <div className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Tiket telah <strong>Selesai (Closed)</strong>. Log kronologi penanganan tidak dapat ditambah lagi.</span>
            </div>
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

      {/* ---- MODAL EDIT TIKET INPUT AWAL ---- */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Data Tiket (Input Awal)"
        size="lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <p className="text-xs text-gray-500">
            Edit informasi awal tiket seperti Nomor Surat, Serial Number, Cabang, Merek, dan Kerusakan. 
            Nomor Tiket <span className="font-mono font-bold text-gray-800">{ticket.noTiket}</span> tidak dapat diubah.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Select Jenis Perangkat */}
            <Select
              label="Jenis Perangkat"
              required
              value={editDeviceId}
              onChange={(e) => {
                const newId = e.target.value;
                setEditDeviceId(newId);
                const dev = deviceTypesList.find((d) => d.id === newId);
                setEditSubtype(dev && dev.subtypes && dev.subtypes.length > 0 ? dev.subtypes[0] : "");
                setEditMerekPilihan("");
              }}
            >
              {deviceTypesList.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.nama}
                </option>
              ))}
            </Select>

            {/* Select Sub-tipe jika ada */}
            {(() => {
              const activeDev = deviceTypesList.find((d) => d.id === editDeviceId);
              if (!activeDev || !activeDev.subtypes || activeDev.subtypes.length === 0) return null;
              return (
                <Select
                  label="Tipe / Sub-Judul"
                  value={editSubtype}
                  onChange={(e) => setEditSubtype(e.target.value)}
                >
                  <option value="">— Pilih Sub-tipe —</option>
                  {activeDev.subtypes.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </Select>
              );
            })()}

            {/* Render activeFields dynamically */}
            {activeFields.map((field) => {
              const val = getEditFieldValue(field.id);

              if (field.id === "cabang") {
                return (
                  <Select
                    key={field.id}
                    label={field.label}
                    required={field.required !== false}
                    value={editCabang}
                    onChange={(e) => setEditCabang(e.target.value)}
                  >
                    <option value="">— Pilih Cabang —</option>
                    {daftarCabang.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    {editCabang && !daftarCabang.includes(editCabang) && (
                      <option value={editCabang}>{editCabang}</option>
                    )}
                  </Select>
                );
              }

              if (field.id === "merek") {
                if (!hasMerekInFields) return null;

                const rawOpts = editDeviceId === "edc" ? merekEdcList : merekKomputerList;
                const opts = rawOpts.filter((m) => m !== "Lainnya (Ketik Manual)");
                return (
                  <Select
                    key={field.id}
                    label={field.label || `Merek ${activeDeviceObj ? activeDeviceObj.nama : "Perangkat"}`}
                    required={field.required !== false}
                    value={editMerekPilihan}
                    onChange={(e) => setEditMerekPilihan(e.target.value)}
                  >
                    <option value="">— Pilih Merek —</option>
                    {opts.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    {editMerekPilihan && !opts.includes(editMerekPilihan) && (
                      <option value={editMerekPilihan}>{editMerekPilihan}</option>
                    )}
                  </Select>
                );
              }

              if (field.id === "tanggalMasuk") {
                return (
                  <div key={field.id} className="flex flex-col gap-1">
                    <label htmlFor="edit-tgl-masuk" className="text-sm font-medium text-gray-700">
                      {field.label} {field.required !== false && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      id="edit-tgl-masuk"
                      type="datetime-local"
                      required={field.required !== false}
                      value={editTglMasuk}
                      onChange={(e) => setEditTglMasuk(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                );
              }

              if (field.type === "textarea") {
                return (
                  <div key={field.id} className="sm:col-span-2 flex flex-col gap-1">
                    <label htmlFor={`edit-field-${field.id}`} className="text-sm font-medium text-gray-700">
                      {field.label} {field.required !== false && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      id={`edit-field-${field.id}`}
                      rows={3}
                      required={field.required !== false}
                      value={val}
                      onChange={(e) => setEditFieldValue(field.id, e.target.value)}
                      placeholder={field.placeholder || `Jelaskan detail ${field.label.toLowerCase()}...`}
                      className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                );
              }

              if (field.type === "select") {
                const opts = field.options && field.options.length > 0 ? field.options : [];
                return (
                  <Select
                    key={field.id}
                    label={field.label}
                    required={field.required !== false}
                    value={val}
                    onChange={(e) => setEditFieldValue(field.id, e.target.value)}
                  >
                    <option value="">— Pilih {field.label} —</option>
                    {opts.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </Select>
                );
              }

              if (field.type === "date") {
                return (
                  <div key={field.id} className="flex flex-col gap-1">
                    <label htmlFor={`edit-field-${field.id}`} className="text-sm font-medium text-gray-700">
                      {field.label} {field.required !== false && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      id={`edit-field-${field.id}`}
                      type="datetime-local"
                      required={field.required !== false}
                      value={val}
                      onChange={(e) => setEditFieldValue(field.id, e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                );
              }

              return (
                <Input
                  key={field.id}
                  label={field.label}
                  required={field.required !== false}
                  value={val}
                  onChange={(e) => setEditFieldValue(field.id, e.target.value)}
                  placeholder={field.placeholder || `cth: ${field.label}...`}
                />
              );
            })}

            {/* Informasi Pelapor / Contact Person */}
            <div className="sm:col-span-2 border-t border-gray-100 pt-3 mt-1">
              <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Informasi Pelapor / Contact Person</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Nama PIC"
                  required
                  value={editCpNama}
                  onChange={(e) => setEditCpNama(e.target.value)}
                  placeholder="Nama PIC penanggung jawab..."
                />
                <Input
                  label="No Telepon / WA"
                  required
                  value={editCpTelp}
                  onChange={(e) => setEditCpTelp(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
            </div>
          </div>

          {editErr && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {editErr}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setEditModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={editSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Edit3 className="w-4 h-4 mr-1" /> Simpan Perubahan
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
