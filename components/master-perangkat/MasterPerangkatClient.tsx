"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Save,
  Cpu,
  Check,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ArrowUp,
  ArrowDown,
  Monitor,
  CreditCard,
  Calendar,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export interface CustomField {
  id: string;
  label: string;
  type: "text" | "date" | "select" | "textarea";
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface DeviceType {
  id: string;
  nama: string;
  subtypes: string[];
  customFields?: CustomField[];
}

interface MasterOptionsData {
  merekKomputer: string[];
  merekEdc: string[];
  vendorList: string[];
  deviceTypes: DeviceType[];
}

const DEFAULT_FIELDS_WORKSTATION: CustomField[] = [
  { id: "cabang", label: "Cabang", type: "select", required: true, options: ["PAYAKUMBUH", "BUKITTINGGI", "BATUSANGKAR", "SOLOK", "CABANG UTAMA"] },
  { id: "tanggalMasuk", label: "Tanggal Masuk", type: "date", required: true },
  { id: "noSurat", label: "Nomor Surat", type: "text", required: true, placeholder: "cth: SR/00/XX/XXX/00-2026" },
  { id: "merek", label: "Merek Perangkat", type: "select", required: true, options: ["Lenovo", "HP", "Dell", "Acer", "Asus", "Apple", "Fujitsu"] },
  { id: "capem", label: "Cabang Pembantu / Capem (opsional)", type: "text", required: false, placeholder: "cth: UNAND, dsb" },
  { id: "kelengkapan", label: "Kelengkapan", type: "text", required: true, placeholder: "cth: Adaptor, kabel, dus, dsb" },
  { id: "sn", label: "Serial Number (SN) Perangkat", type: "text", required: true, placeholder: "Nomor seri mesin / perangkat..." },
  { id: "kerusakan", label: "Kerusakan", type: "textarea", required: true, placeholder: "Jelaskan detail kerusakan..." },
];

export function MasterPerangkatClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [merekKomputer, setMerekKomputer] = useState<string[]>([]);
  const [merekEdc, setMerekEdc] = useState<string[]>([]);
  const [vendorList, setVendorList] = useState<string[]>([]);

  // Selection
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("workstation");
  const [previewSubtype, setPreviewSubtype] = useState<string>("");

  // Input sementara Jenis Perangkat & Sub-tipe
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newSubtypeInput, setNewSubtypeInput] = useState("");

  // State Form Builder Field Baru
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<"text" | "date" | "select" | "textarea">("text");
  const [fieldPlaceholder, setFieldPlaceholder] = useState("");
  const [fieldOptionsInput, setFieldOptionsInput] = useState("");

  // State Manage Opsi Dropdown Modal
  const [editingOptionsFieldId, setEditingOptionsFieldId] = useState<string | null>(null);
  const [tempOptions, setTempOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState("");

  function handleOpenManageOptions(field: CustomField) {
    setEditingOptionsFieldId(field.id);
    setTempOptions(field.options && field.options.length > 0 ? [...field.options] : []);
    setNewOptionInput("");
  }

  function handleAddOption() {
    if (!newOptionInput.trim()) return;
    const val = newOptionInput.trim();
    if (tempOptions.includes(val)) return;
    setTempOptions((prev) => [...prev, val]);
    setNewOptionInput("");
  }

  function handleUpdateOptionText(index: number, newText: string) {
    setTempOptions((prev) => {
      const copy = [...prev];
      copy[index] = newText;
      return copy;
    });
  }

  function handleRemoveOption(index: number) {
    setTempOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSaveFieldOptions() {
    if (!editingOptionsFieldId || !selectedDeviceId) return;

    setDeviceTypes((prev) =>
      prev.map((d) => {
        if (d.id === selectedDeviceId) {
          const fields = (d.customFields || []).map((f) => {
            if (f.id === editingOptionsFieldId) {
              return { ...f, options: tempOptions.filter((o) => o.trim().length > 0) };
            }
            return f;
          });
          return { ...d, customFields: fields };
        }
        return d;
      })
    );

    setEditingOptionsFieldId(null);
  }

  useEffect(() => {
    fetchOptions();
  }, []);

  async function fetchOptions() {
    setLoading(true);
    try {
      const res = await fetch("/api/master-options");
      if (res.ok) {
        const data: MasterOptionsData = await res.json();
        const loadedDevices = (data.deviceTypes || []).map((d) => {
          if (!d.customFields || d.customFields.length === 0) {
            return { ...d, customFields: DEFAULT_FIELDS_WORKSTATION };
          }
          return d;
        });

        setDeviceTypes(loadedDevices);
        setMerekKomputer(data.merekKomputer || []);
        setMerekEdc(data.merekEdc || []);
        setVendorList(data.vendorList || []);

        if (loadedDevices.length > 0) {
          setSelectedDeviceId(loadedDevices[0].id);
          if (loadedDevices[0].subtypes && loadedDevices[0].subtypes.length > 0) {
            setPreviewSubtype(loadedDevices[0].subtypes[0]);
          }
        }
      }
    } catch (e) {
      console.error(e);
      setMsg({ type: "error", text: "Gagal memuat data master perangkat." });
    } finally {
      setLoading(false);
    }
  }

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  async function handleSaveAll() {
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        merekKomputer,
        merekEdc,
        vendorList,
        deviceTypes,
      };

      const res = await fetch("/api/master-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowSuccessModal(true);
        setMsg({ type: "success", text: "Pengaturan Master Perangkat & Form Builder berhasil disimpan!" });
      } else {
        const errData = await res.json().catch(() => ({}));
        setMsg({ type: "error", text: errData.error || "Gagal menyimpan data master." });
      }
    } catch (e) {
      console.error(e);
      setMsg({ type: "error", text: "Terjadi kesalahan sistem saat menyimpan." });
    } finally {
      setSaving(false);
    }
  }

  // Handle Jenis Perangkat
  function handleAddDeviceType() {
    if (!newDeviceName.trim()) return;
    const name = newDeviceName.trim();
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    if (deviceTypes.some((d) => d.id === id || d.nama.toLowerCase() === name.toLowerCase())) {
      setMsg({ type: "error", text: `Jenis perangkat "${name}" sudah ada.` });
      return;
    }

    const updated = [
      ...deviceTypes,
      { id, nama: name, subtypes: [], customFields: DEFAULT_FIELDS_WORKSTATION },
    ];
    setDeviceTypes(updated);
    setSelectedDeviceId(id);
    setNewDeviceName("");
    setMsg({ type: "success", text: `Jenis perangkat "${name}" berhasil ditambahkan.` });
  }

  function handleRemoveDeviceType(id: string) {
    const updated = deviceTypes.filter((d) => d.id !== id);
    setDeviceTypes(updated);
    if (selectedDeviceId === id && updated.length > 0) {
      setSelectedDeviceId(updated[0].id);
    }
  }

  // Handle Subtype
  function handleAddSubtype() {
    if (!newSubtypeInput.trim() || !selectedDeviceId) return;
    const subName = newSubtypeInput.trim();

    setDeviceTypes((prev) =>
      prev.map((d) => {
        if (d.id === selectedDeviceId) {
          if (d.subtypes.includes(subName)) return d;
          return { ...d, subtypes: [...d.subtypes, subName] };
        }
        return d;
      })
    );
    setNewSubtypeInput("");
  }

  function handleRemoveSubtype(deviceId: string, subtypeName: string) {
    setDeviceTypes((prev) =>
      prev.map((d) => {
        if (d.id === deviceId) {
          return { ...d, subtypes: d.subtypes.filter((s) => s !== subtypeName) };
        }
        return d;
      })
    );
  }

  // Handle Custom Field Builder & Reordering (Naik / Turun)
  function handleAddCustomField() {
    if (!fieldLabel.trim() || !selectedDeviceId) return;
    const label = fieldLabel.trim();
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "_");

    const parsedOptions =
      fieldType === "select"
        ? fieldOptionsInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    const newField: CustomField = {
      id,
      label,
      type: fieldType,
      options: parsedOptions,
      placeholder: fieldPlaceholder.trim() || undefined,
      required: true,
    };

    setDeviceTypes((prev) =>
      prev.map((d) => {
        if (d.id === selectedDeviceId) {
          const currentFields = d.customFields || [];
          if (currentFields.some((f) => f.id === id)) return d;
          return { ...d, customFields: [...currentFields, newField] };
        }
        return d;
      })
    );

    setFieldLabel("");
    setFieldPlaceholder("");
    setFieldOptionsInput("");
  }

  function handleMoveField(index: number, direction: "up" | "down") {
    if (!selectedDeviceId) return;

    setDeviceTypes((prev) =>
      prev.map((d) => {
        if (d.id === selectedDeviceId) {
          const fields = [...(d.customFields || [])];
          const targetIndex = direction === "up" ? index - 1 : index + 1;

          if (targetIndex >= 0 && targetIndex < fields.length) {
            const temp = fields[index];
            fields[index] = fields[targetIndex];
            fields[targetIndex] = temp;
          }
          return { ...d, customFields: fields };
        }
        return d;
      })
    );
  }

  function handleRemoveCustomField(fieldIdToDelete: string) {
    setDeviceTypes((prev) =>
      prev.map((d) => {
        if (d.id === selectedDeviceId) {
          return {
            ...d,
            customFields: (d.customFields || []).filter((f) => f.id !== fieldIdToDelete),
          };
        }
        return d;
      })
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-500">Memuat master perangkat...</div>;
  }

  const selectedDevice = deviceTypes.find((d) => d.id === selectedDeviceId) || deviceTypes[0];
  const activeFields = selectedDevice?.customFields || DEFAULT_FIELDS_WORKSTATION;
  const editingFieldObj = activeFields.find((f) => f.id === editingOptionsFieldId);

  return (
    <div className="space-y-6">
      <Modal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title=""
        size="sm"
      >
        <div className="flex flex-col items-center justify-center text-center p-4">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-4 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Berhasil Disimpan!</h3>
          <p className="text-sm text-gray-500 mb-4">
            Pengaturan Master Perangkat &amp; Tata Letak Form Builder telah berhasil disimpan.
          </p>
          <Button onClick={() => setShowSuccessModal(false)} className="w-full">
            Tutup
          </Button>
        </div>
      </Modal>

      {/* MODAL KELOLA OPSI DROPDOWN */}
      <Modal
        open={Boolean(editingOptionsFieldId)}
        onClose={() => setEditingOptionsFieldId(null)}
        title={`Kelola Opsi Dropdown: ${editingFieldObj?.label || ""}`}
        size="md"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-gray-500">
            Tambahkan opsi baru, ubah teks opsi, atau hapus pilihan yang akan muncul pada dropdown form.
          </p>

          {/* Form Tambah Opsi Baru */}
          <div className="flex gap-2">
            <Input
              placeholder="Tuliskan opsi baru (cth: TES4)..."
              value={newOptionInput}
              onChange={(e) => setNewOptionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddOption();
                }
              }}
              className="text-xs"
            />
            <Button size="sm" type="button" onClick={handleAddOption} className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
              <Plus className="w-4 h-4 mr-1" /> Tambah
            </Button>
          </div>

          {/* Daftar Opsi Saat Ini */}
          <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-100 rounded-xl p-3 bg-gray-50/50">
            {tempOptions.length === 0 ? (
              <p className="text-xs text-center text-gray-400 py-3">Belum ada pilihan opsi. Tambahkan di atas.</p>
            ) : (
              tempOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
                  <span className="text-xs font-mono font-bold text-gray-400 w-6 text-center">{idx + 1}.</span>
                  <Input
                    value={opt}
                    onChange={(e) => handleUpdateOptionText(idx, e.target.value)}
                    className="text-xs h-8 bg-white border-gray-200 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Hapus Opsi Ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <Button variant="secondary" size="sm" onClick={() => setEditingOptionsFieldId(null)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveFieldOptions} className="bg-primary hover:bg-primary-600">
              <Check className="w-4 h-4 mr-1" /> Simpan Opsi
            </Button>
          </div>
        </div>
      </Modal>
      {msg && (
        <div
          className={`p-3.5 text-xs rounded-xl border flex items-center justify-between shadow-sm ${
            msg.type === "success"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          <span className="font-semibold">{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-gray-400 hover:text-gray-600 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* BAR HEADER PENGATURAN */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" /> Master Perangkat &amp; Tata Letak Form Builder
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Atur jenis perangkat, sub-tipe, dan susun urutan kolom form input tiket secara fleksibel.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchOptions}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset
          </Button>
          <Button size="sm" loading={saving} onClick={handleSaveAll} className="bg-primary hover:bg-primary-600">
            <Save className="w-4 h-4 mr-1.5" /> Simpan Pengaturan Form
          </Button>
        </div>
      </div>

      {/* LAYOUT SPLIT 2 : 1 (PRATINJAU LIVE FORM vs PANEL KONFIGURASI) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KOLOM KIRI (PORSI 2 / ~65% WIDTH) — PRATINJAU LIVE FORM INPUT TIKET ASLI (SEPERTI GAMBAR 2) */}
        <div className="lg:col-span-8 space-y-4">
          <Card padding="lg" className="border-2 border-primary/20 shadow-md">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider mb-1">
                  Live Preview Mockup
                </span>
                <h3 className="text-base font-bold text-gray-900">1. Data Perangkat &amp; Workstation</h3>
                <p className="text-xs text-gray-500">Tampilan persis yang akan dilihat oleh teknisi di Form Input Tiket.</p>
              </div>
              <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-lg">
                Status: {selectedDevice ? selectedDevice.nama : "Workstation"}
              </span>
            </div>

            {/* BAR JENIS PERANGKAT */}
            <div className="space-y-2 mb-5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Jenis Perangkat <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {deviceTypes.map((dt) => {
                  const isSelected = selectedDeviceId === dt.id;
                  return (
                    <button
                      key={dt.id}
                      type="button"
                      onClick={() => {
                        setSelectedDeviceId(dt.id);
                        if (dt.subtypes && dt.subtypes.length > 0) {
                          setPreviewSubtype(dt.subtypes[0]);
                        } else {
                          setPreviewSubtype("");
                        }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? "border-primary bg-primary/5 text-primary shadow-sm font-bold"
                          : "border-gray-200 text-gray-600 bg-white"
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${isSelected ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}>
                        {dt.id === "edc" ? (
                          <CreditCard className="w-4 h-4" />
                        ) : (
                          <Monitor className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate">{dt.nama}</p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {dt.subtypes && dt.subtypes.length > 0 ? dt.subtypes.join(", ") : "Standar"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SUB-TIPE SELECTOR */}
            {selectedDevice && selectedDevice.subtypes && selectedDevice.subtypes.length > 0 && (
              <div className="space-y-2 mb-5 pt-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Tipe / Sub-Judul {selectedDevice.nama} <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedDevice.subtypes.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setPreviewSubtype(sub)}
                      className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        previewSubtype === sub
                          ? "border-primary bg-primary-50 text-primary font-bold shadow-xs"
                          : "border-gray-200 text-gray-600 bg-white"
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* GRID DYNAMIC FIELDS PREVIEW (MENJAWAB GAMBAR 2) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {activeFields.map((field) => {
                if (field.type === "textarea") {
                  return (
                    <div key={field.id} className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-gray-700">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <textarea
                        disabled
                        rows={2}
                        placeholder={field.placeholder || `Jelaskan detail ${field.label.toLowerCase()}...`}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-gray-50/70 text-gray-600"
                      />
                    </div>
                  );
                }

                if (field.type === "select") {
                  const opts =
                    field.options && field.options.length > 0
                      ? field.options
                      : field.id === "cabang"
                      ? ["PAYAKUMBUH", "BUKITTINGGI", "SOLOK", "CABANG UTAMA"]
                      : ["Lenovo", "HP", "Dell", "Acer", "Asus", "Apple"];

                  return (
                    <div key={field.id} className="space-y-1">
                      <label className="text-xs font-bold text-gray-700">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <select disabled className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-gray-50/70 text-gray-600">
                        <option>— Pilih {field.label} —</option>
                        {opts.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  );
                }

                if (field.type === "date") {
                  return (
                    <div key={field.id} className="space-y-1">
                      <label className="text-xs font-bold text-gray-700">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          disabled
                          value="dd/mm/tttt --:--"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-gray-50/70 text-gray-500"
                        />
                        <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={field.id} className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      disabled
                      placeholder={field.placeholder || `Tuliskan ${field.label.toLowerCase()}...`}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-gray-50/70 text-gray-600"
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* KOLOM KANAN (PORSI 1 / ~35% WIDTH) — PANEL PENGEDITAN & KONTROL FORM BUILDER */}
        <div className="lg:col-span-4 space-y-6">
          {/* PANEL 1: KELOLA JENIS PERANGKAT & SUB-TIPE */}
          <Card padding="md">
            <CardHeader>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-blue-600" /> 1. Jenis Perangkat &amp; Sub-Tipe
              </CardTitle>
            </CardHeader>

            <div className="space-y-3">
              {/* Tambah Jenis Perangkat */}
              <div className="flex gap-2">
                <Input
                  placeholder="Perangkat baru (ATM, UPS)..."
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="text-xs"
                />
                <Button size="sm" type="button" onClick={handleAddDeviceType} className="shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Daftar Perangkat Terdaftar */}
              <div className="flex flex-wrap gap-1.5 py-1">
                {deviceTypes.map((dt) => (
                  <span
                    key={dt.id}
                    onClick={() => setSelectedDeviceId(dt.id)}
                    className={`cursor-pointer px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 border transition-all ${
                      selectedDeviceId === dt.id
                        ? "bg-blue-100 text-blue-800 border-blue-300 shadow-2xs"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {dt.nama}
                    {dt.id !== "workstation" && dt.id !== "edc" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveDeviceType(dt.id);
                        }}
                        className="text-gray-400 hover:text-red-600 font-bold ml-1"
                        title="Hapus Jenis Perangkat"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {/* Sub-tipe Manager untuk perangkat aktif */}
              {selectedDevice && (
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-[11px] font-bold text-purple-800 mb-1">
                    Sub-Tipe {selectedDevice.nama}
                  </label>
                  <div className="flex gap-1.5 mb-2">
                    <Input
                      placeholder="Tambah sub-tipe..."
                      value={newSubtypeInput}
                      onChange={(e) => setNewSubtypeInput(e.target.value)}
                      className="text-xs"
                    />
                    <Button size="sm" type="button" onClick={handleAddSubtype} className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {selectedDevice.subtypes.map((sub) => (
                      <span key={sub} className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[11px] font-semibold flex items-center gap-1">
                        {sub}
                        <button type="button" onClick={() => handleRemoveSubtype(selectedDevice.id, sub)} className="hover:text-red-600 font-bold">
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* PANEL 2: FORM BUILDER — TAMBAH & KONTROL POSISI FIELD */}
          <Card padding="md">
            <CardHeader>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" /> 2. Form Builder &amp; Tata Letak
              </CardTitle>
            </CardHeader>

            <div className="space-y-4">
              {/* INPUT KOMLOM BARU */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                <p className="text-[11px] font-bold text-indigo-900">Tambah Kolom Input Baru</p>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Nama / Label Input</label>
                  <Input
                    placeholder="cth: Lokasi ATM, IP Address"
                    value={fieldLabel}
                    onChange={(e) => setFieldLabel(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Tipe Inputan</label>
                  <Select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value as "text" | "date" | "select" | "textarea")}
                    className="text-xs bg-white"
                  >
                    <option value="text">📝 Text Box (Input Teks biasa)</option>
                    <option value="date">📅 Kalender (Tanggal)</option>
                    <option value="select">🔽 Slide-down (Dropdown Select)</option>
                    <option value="textarea">📄 Textarea (Catatan Panjang)</option>
                  </Select>
                </div>

                {fieldType === "select" && (
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-800 mb-0.5">
                      Opsi Slide-Down (pisahkan koma)
                    </label>
                    <Input
                      placeholder="Payakumbuh, Bukittinggi, Solok"
                      value={fieldOptionsInput}
                      onChange={(e) => setFieldOptionsInput(e.target.value)}
                      className="text-xs bg-white border-indigo-300"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Placeholder</label>
                  <Input
                    placeholder="cth: Masukkan lokasi..."
                    value={fieldPlaceholder}
                    onChange={(e) => setFieldPlaceholder(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                <Button size="sm" type="button" onClick={handleAddCustomField} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-1">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Tambahkan Kolom Ini
                </Button>
              </div>

              {/* LIST KONTROL URUTAN FIELD (NAIK / TURUN) */}
              <div>
                <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Atur Posisi &amp; Urutan Kolom:
                </p>

                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {activeFields.map((field, index) => (
                    <div
                      key={field.id + index}
                      className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg text-xs hover:border-indigo-300 transition-colors shadow-2xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-gray-900 truncate">{field.label}</p>
                          {field.type === "select" && (
                            <button
                              type="button"
                              onClick={() => handleOpenManageOptions(field)}
                              className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                              title="Klik untuk Tambah/Edit/Hapus Opsi Dropdown"
                            >
                              <Sliders className="w-3 h-3 text-indigo-600" />
                              {field.options && field.options.length > 0 ? `${field.options.length} Opsi` : "Edit Opsi"}
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 uppercase">{field.type}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveField(index, "up")}
                          className="p-1 text-gray-500 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-500"
                          title="Pindahkan Ke Atas"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === activeFields.length - 1}
                          onClick={() => handleMoveField(index, "down")}
                          className="p-1 text-gray-500 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-500"
                          title="Pindahkan Ke Bawah"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField(field.id)}
                          className="p-1 text-gray-400 hover:text-red-600 ml-1"
                          title="Hapus Kolom Input"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Button size="lg" loading={saving} onClick={handleSaveAll} className="w-full bg-primary hover:bg-primary-600">
            <Check className="w-4 h-4 mr-2" /> Simpan Pengaturan Form
          </Button>
        </div>
      </div>
    </div>
  );
}
