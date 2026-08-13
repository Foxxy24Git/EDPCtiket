"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, TicketPlus, Monitor, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

const DAFTAR_CABANG = [
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

const MEREK_KOMPUTER_LIST = ["Lenovo", "HP", "Dell", "Acer", "Asus", "Apple", "Fujitsu"];

type CpTipe = "pic" | "wag";

export interface CustomField {
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

interface WorkstationFormProps {
  onSuccess?: () => void;
}

export function WorkstationForm({ onSuccess }: WorkstationFormProps) {
  const [daftarCabang, setDaftarCabang] = useState<string[]>([]);
  const [merekKomputerList, setMerekKomputerList] = useState<string[]>(MEREK_KOMPUTER_LIST);
  const [merekEdcList, setMerekEdcList] = useState<string[]>(["Ingenico", "Verifone", "Pax", "Sunmi", "MoreFun", "Castle"]);
  const [deviceTypesList, setDeviceTypesList] = useState<DeviceTypeOption[]>([
    { id: "workstation", nama: "Komputer", subtypes: ["Desktop", "All-in-One", "Laptop", "Mini PC"] },
    { id: "edc", nama: "Mesin EDC", subtypes: [] },
  ]);

  useEffect(() => {
    fetch("/api/workstation")
      .then((res) => res.json())
      .then((data) => {
        if (data.items && data.items.length > 0) {
          setDaftarCabang(data.items.map((item: { namaCabang: string }) => item.namaCabang));
        } else {
          setDaftarCabang(DAFTAR_CABANG);
        }
      })
      .catch((err) => {
        console.error("Gagal memuat cabang:", err);
        setDaftarCabang(DAFTAR_CABANG);
      });

    fetch("/api/master-options")
      .then((res) => res.json())
      .then((data) => {
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

  // Perangkat & Merek Dinamis
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("workstation");
  const [selectedSubtype, setSelectedSubtype] = useState<string>("");
  const [merekPilihan, setMerekPilihan] = useState("");

  // Input Awal Workstation
  const [wsCabang, setWsCabang] = useState("");
  const [wsTanggalMasuk, setWsTanggalMasuk] = useState("");
  const [wsNoSurat, setWsNoSurat] = useState("");
  const [wsCapem, setWsCapem] = useState("");
  const [wsKelengkapan, setWsKelengkapan] = useState("");
  const [wsSnKomputer, setWsSnKomputer] = useState("");
  const [wsKerusakan, setWsKerusakan] = useState("");
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  // Field Tiket/CP & Kegiatan
  const [cpTipe] = useState<CpTipe>("pic");
  const [cpNama, setCpNama] = useState("");
  const [cpTelp, setCpTelp] = useState("");
  const [kegiatan, setKegiatan] = useState("Menerima Perangkat");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<string | null>(null);

  const activeDeviceObj = deviceTypesList.find((d) => d.id === selectedDeviceId) || deviceTypesList[0];

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

  function getFieldValue(fieldId: string): string {
    switch (fieldId) {
      case "cabang": return wsCabang;
      case "tanggalMasuk": return wsTanggalMasuk;
      case "noSurat": return wsNoSurat;
      case "merek": return merekPilihan;
      case "capem": return wsCapem;
      case "kelengkapan": return wsKelengkapan;
      case "sn": return wsSnKomputer;
      case "kerusakan": return wsKerusakan;
      default: return customValues[fieldId] || "";
    }
  }

  function setFieldValue(fieldId: string, val: string) {
    switch (fieldId) {
      case "cabang": setWsCabang(val); break;
      case "tanggalMasuk": setWsTanggalMasuk(val); break;
      case "noSurat": setWsNoSurat(val); break;
      case "merek": setMerekPilihan(val); break;
      case "capem": setWsCapem(val); break;
      case "kelengkapan": setWsKelengkapan(val); break;
      case "sn": setWsSnKomputer(val); break;
      case "kerusakan": setWsKerusakan(val); break;
      default:
        setCustomValues((prev) => ({ ...prev, [fieldId]: val }));
        break;
    }
  }

  function resetForm() {
    setSelectedDeviceId("workstation");
    setSelectedSubtype("");
    setMerekPilihan("");
    setWsCabang("");
    setWsTanggalMasuk("");
    setWsNoSurat("");
    setWsCapem("");
    setWsKelengkapan("");
    setWsSnKomputer("");
    setWsKerusakan("");
    setCustomValues({});
    setCpNama("");
    setCpTelp("");
    setKegiatan("Menerima Perangkat");
    setError("");
  }

  // Hitung Merek Komputer/Perangkat final string
  function getFormattedMerek(): string {
    const devName = activeDeviceObj ? activeDeviceObj.nama.replace(/\s*\/\s*Komputer/i, "") : "Perangkat";
    const brand = merekPilihan.trim();
    
    if (selectedSubtype) {
      return brand ? `[${devName} - ${selectedSubtype}] ${brand}` : `[${devName} - ${selectedSubtype}]`;
    }
    return brand ? `[${devName}] ${brand}` : `[${devName}]`;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const formattedMerek = getFormattedMerek();

    // Validasi input wajib dari activeFields
    for (const field of activeFields) {
      if (field.required !== false && field.id !== "capem") {
        const val = getFieldValue(field.id);
        if (!val || !val.trim()) {
          return setError(`${field.label} wajib diisi.`);
        }
      }
    }

    if (cpTipe === "pic") {
      if (!cpNama.trim()) return setError("Nama PIC wajib diisi.");
      if (!cpTelp.trim()) return setError("Nomor telepon PIC wajib diisi.");
      
      const phoneDigitsOnly = /^[0-9]+$/;
      if (!phoneDigitsOnly.test(cpTelp.trim()) || cpTelp.trim().length < 10 || cpTelp.trim().length > 14) {
        return setError("Nomor telepon (PIC) hanya boleh berupa angka (numeric) dengan panjang 10 hingga 14 digit.");
      }
    }
    if (cpTipe === "wag" && !cpNama.trim()) return setError("Nama WAG wajib diisi.");
    if (!kegiatan.trim()) return setError("Kegiatan penanganan pertama wajib diisi.");

    let finalKerusakan = wsKerusakan;
    const extraCustomEntries = Object.entries(customValues).filter(([k, v]) => Boolean(v && v.trim()));
    if (extraCustomEntries.length > 0) {
      const extraText = extraCustomEntries
        .map(([k, v]) => {
          const cfg = activeFields.find((f) => f.id === k);
          return `${cfg ? cfg.label : k}: ${v}`;
        })
        .join(" | ");
      finalKerusakan = finalKerusakan ? `${finalKerusakan}\n[Catatan Tambahan: ${extraText}]` : extraText;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kategori: "workstation",
          wsCabang: wsCabang || daftarCabang[0] || "PAYAKUMBUH",
          wsTanggalMasuk: wsTanggalMasuk || new Date().toISOString(),
          wsNoSurat: wsNoSurat || "SR/00/XX/2026",
          wsMerekKomputer: formattedMerek,
          wsCapem: wsCapem.trim() || undefined,
          wsKelengkapan: wsKelengkapan || "Lengkap",
          wsSnKomputer: wsSnKomputer || "-",
          wsKerusakan: finalKerusakan || "Pemeriksaan perangkat",
          cpTipe,
          cpNama,
          cpTelp: cpTipe === "pic" ? cpTelp.trim() : "",
          kegiatan,
        }),
      });
      let data: { error?: string; item?: { noTiket?: string } } = {};
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) {
        setError(data.error ?? `Gagal membuka tiket (${res.status} ${res.statusText}).`);
        return;
      }
      setCreated(data.item?.noTiket ?? "");
      resetForm();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan koneksi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Modal
        open={Boolean(created)}
        onClose={() => setCreated(null)}
        title=""
        size="sm"
      >
        <div className="flex flex-col items-center justify-center text-center p-4">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-4 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Tiket Berhasil Dibuka!</h3>
          <p className="text-sm text-gray-500 mb-4">
            Nomor tiket Anda: <span className="font-bold text-primary font-mono">{created}</span>
          </p>
          <Button onClick={() => setCreated(null)} className="w-full">
            Tutup
          </Button>
        </div>
      </Modal>

      <Card padding="lg">
        <form onSubmit={submit} className="space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-base font-semibold text-gray-900">1. Data Perangkat &amp; Workstation</h2>
            <p className="text-xs text-gray-500">Pilih jenis perangkat lalu lengkapi detail kerusakan.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">
              Jenis Perangkat <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {deviceTypesList.map((dt) => {
                const isSelected = selectedDeviceId === dt.id;
                return (
                  <button
                    key={dt.id}
                    type="button"
                    onClick={() => {
                      setSelectedDeviceId(dt.id);
                      setSelectedSubtype(dt.subtypes && dt.subtypes.length > 0 ? dt.subtypes[0] : "");
                      setMerekPilihan("");
                      setKegiatan(`Menerima ${dt.nama}`);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? "border-primary bg-primary/5 text-primary shadow-sm font-bold"
                        : "border-gray-200 hover:border-gray-300 text-gray-600 bg-white"
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${isSelected ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}>
                      {dt.id === "edc" ? (
                        <CreditCard className="w-5 h-5" />
                      ) : (
                        <Monitor className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{dt.nama}</p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {dt.subtypes && dt.subtypes.length > 0 ? dt.subtypes.join(", ") : "Standar Perangkat"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {activeDeviceObj && activeDeviceObj.subtypes && activeDeviceObj.subtypes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2 pt-1"
            >
              <label className="text-sm font-semibold text-gray-800">
                Tipe / Sub-Judul {activeDeviceObj.nama} <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {activeDeviceObj.subtypes.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSelectedSubtype(sub)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      selectedSubtype === sub
                        ? "border-primary bg-primary-50 text-primary font-bold shadow-sm"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span>{sub}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeFields.map((field) => {
              const val = getFieldValue(field.id);

              if (field.type === "textarea") {
                return (
                  <div key={field.id} className="sm:col-span-2 flex flex-col gap-1">
                    <label htmlFor={`field-${field.id}`} className="text-sm font-medium text-gray-700">
                      {field.label} {field.required !== false && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      id={`field-${field.id}`}
                      required={field.required !== false}
                      rows={2}
                      value={val}
                      onChange={(e) => setFieldValue(field.id, e.target.value)}
                      placeholder={field.placeholder || `Jelaskan detail ${field.label.toLowerCase()}...`}
                      className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                );
              }

              if (field.id === "cabang") {
                return (
                  <Select
                    key={field.id}
                    label={field.label}
                    required={field.required !== false}
                    value={wsCabang}
                    onChange={(e) => setWsCabang(e.target.value)}
                  >
                    <option value="">— Pilih Cabang —</option>
                    {daftarCabang.map((cabang) => (
                      <option key={cabang} value={cabang}>
                        {cabang}
                      </option>
                    ))}
                  </Select>
                );
              }

              if (field.id === "merek") {
                const rawOpts =
                  field.options && field.options.length > 0
                    ? field.options
                    : selectedDeviceId === "edc"
                    ? merekEdcList
                    : merekKomputerList;

                const opts = rawOpts.filter((m) => m !== "Lainnya (Ketik Manual)");

                return (
                  <div key={field.id} className="flex flex-col gap-1">
                    <Select
                      label={field.label || `Merek ${activeDeviceObj ? activeDeviceObj.nama : "Perangkat"}`}
                      required={field.required !== false}
                      value={merekPilihan}
                      onChange={(e) => setMerekPilihan(e.target.value)}
                    >
                      <option value="">— Pilih Merek —</option>
                      {opts.map((merek) => (
                        <option key={merek} value={merek}>
                          {merek}
                        </option>
                      ))}
                    </Select>
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
                    onChange={(e) => setFieldValue(field.id, e.target.value)}
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
                    <label htmlFor={`field-${field.id}`} className="text-sm font-medium text-gray-700">
                      {field.label} {field.required !== false && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      id={`field-${field.id}`}
                      type="datetime-local"
                      required={field.required !== false}
                      value={val}
                      onChange={(e) => setFieldValue(field.id, e.target.value)}
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
                  onChange={(e) => setFieldValue(field.id, e.target.value)}
                  placeholder={field.placeholder || `Tuliskan ${field.label.toLowerCase()}...`}
                />
              );
            })}
          </div>

          <div className="border-b border-gray-100 pb-3 pt-2">
            <h2 className="text-base font-semibold text-gray-900">2. Informasi Kontak &amp; Penanganan</h2>
            <p className="text-xs text-gray-500">Detail contact person pelapor dan tindakan pertama.</p>
          </div>

          {/* Contact Person */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Informasi Contact Person (PIC) <span className="text-red-500">*</span>
            </label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nama PIC"
                required
                value={cpNama}
                onChange={(e) => setCpNama(e.target.value)}
                placeholder="Nama penanggung jawab cabang..."
              />
              <Input
                label="Nomor Telepon"
                required
                value={cpTelp}
                onChange={(e) => setCpTelp(e.target.value)}
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>

          {/* Kegiatan pertama */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="kegiatan-ws"
              className="text-sm font-medium text-gray-700"
            >
              Kegiatan Penanganan Pertama <span className="text-red-500">*</span>
            </label>
            <textarea
              id="kegiatan-ws"
              required
              rows={3}
              value={kegiatan}
              onChange={(e) => setKegiatan(e.target.value)}
              placeholder="cth: Menerima barang komputer/EDC rusak, melakukan pendataan awal dan kelengkapan..."
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
            <p className="text-xs text-gray-500">
              Timestamp dicatat otomatis saat tiket dibuka.
            </p>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
            >
              {error}
            </motion.p>
          )}

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button type="button" variant="secondary" onClick={resetForm}>
              Reset
            </Button>
            <Button type="submit" loading={submitting}>
              <TicketPlus className="w-4 h-4" /> Buka Tiket Workstation
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
