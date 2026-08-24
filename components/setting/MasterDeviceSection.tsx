"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Save, Cpu, Layers, Tag, Building2, Check, Eye, CheckCircle2, ChevronDown, Sparkles, Copy } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface CustomField {
  id: string;
  label: string;
  type: "text" | "date" | "select" | "textarea";
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

interface DeviceType {
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

export function MasterDeviceSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [merekKomputer, setMerekKomputer] = useState<string[]>([]);
  const [merekEdc, setMerekEdc] = useState<string[]>([]);
  const [vendorList, setVendorList] = useState<string[]>([]);

  // Form input sementara
  const [newDeviceName, setNewDeviceName] = useState("");
  // State input subtype & field options per-id (dinamis)
  const [subtypeInputs, setSubtypeInputs] = useState<Record<string, string>>({});
  const [fieldOptionInputs, setFieldOptionInputs] = useState<Record<string, string>>({});

  const [newMerekKomputer, setNewMerekKomputer] = useState("");
  const [newVendor, setNewVendor] = useState("");

  // State simulasi Live Preview Mockup
  const [previewDevice, setPreviewDevice] = useState<string>("workstation");
  const [previewSubtype, setPreviewSubtype] = useState<string>("Desktop");
  const [previewSubtypeOpen, setPreviewSubtypeOpen] = useState(false);
  const [previewMerek, setPreviewMerek] = useState<string>("");
  const [previewVendor, setPreviewVendor] = useState<string>("");

  useEffect(() => {
    fetchOptions();
  }, []);

  async function fetchOptions() {
    setLoading(true);
    try {
      const res = await fetch("/api/master-options");
      if (res.ok) {
        const data: MasterOptionsData = await res.json();
        setDeviceTypes(data.deviceTypes || []);
        setMerekKomputer(data.merekKomputer || []);
        setMerekEdc(data.merekEdc || []);
        setVendorList(data.vendorList || []);
      }
    } catch (e) {
      console.error(e);
      setMsg({ type: "error", text: "Gagal memuat data master opsi." });
    } finally {
      setLoading(false);
    }
  }

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
        setMsg({ type: "success", text: "Master Perangkat & Opsi berhasil diperbarui!" });
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

  // Helper Tambah Jenis Perangkat Baru
  function handleAddDeviceType() {
    if (!newDeviceName.trim()) return;
    const name = newDeviceName.trim();
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    if (deviceTypes.some((d) => d.id === id || d.nama.toLowerCase() === name.toLowerCase())) {
      setMsg({ type: "error", text: `Jenis perangkat "${name}" sudah ada.` });
      return;
    }

    const updated = [...deviceTypes, { id, nama: name, subtypes: [] }];
    setDeviceTypes(updated);
    setPreviewDevice(id);
    setPreviewSubtype("");
    setNewDeviceName("");
    setMsg({ type: "success", text: `Jenis perangkat "${name}" ditambahkan.` });
  }

  function handleRemoveDeviceType(id: string) {
    const updated = deviceTypes.filter((d) => d.id !== id);
    setDeviceTypes(updated);
  }

  function setSubtypeInputForDevice(id: string, text: string) {
    setSubtypeInputs((prev) => ({ ...prev, [id]: text }));
  }

  function handleAddSubtypeForDevice(deviceId: string, subName: string) {
    if (!subName.trim()) return;
    const cleanSub = subName.trim();

    setDeviceTypes((prev) =>
      prev.map((d) => {
        if (d.id === deviceId) {
          if (d.subtypes.includes(cleanSub)) return d;
          return { ...d, subtypes: [...d.subtypes, cleanSub] };
        }
        return d;
      })
    );
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

  function setFieldOptionInputForField(fieldId: string, text: string) {
    setFieldOptionInputs((prev) => ({ ...prev, [fieldId]: text }));
  }

  function handleAddOptionToField(fieldId: string, optionVal: string) {
    if (!optionVal.trim()) return;
    const cleanOpt = optionVal.trim();

    setDeviceTypes((prev) =>
      prev.map((d) => {
        if (d.customFields) {
          const updatedFields = d.customFields.map((f) => {
            if (f.id === fieldId) {
              const currentOpts = f.options || [];
              if (currentOpts.includes(cleanOpt)) return f;
              return { ...f, options: [...currentOpts, cleanOpt] };
            }
            return f;
          });
          return { ...d, customFields: updatedFields };
        }
        return d;
      })
    );
  }

  function handleRemoveOptionFromField(fieldId: string, optionVal: string) {
    setDeviceTypes((prev) =>
      prev.map((d) => {
        if (d.customFields) {
          const updatedFields = d.customFields.map((f) => {
            if (f.id === fieldId) {
              return { ...f, options: (f.options || []).filter((o) => o !== optionVal) };
            }
            return f;
          });
          return { ...d, customFields: updatedFields };
        }
        return d;
      })
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-500">Memuat opsi master...</div>;
  }

  const activePreviewDeviceObj = deviceTypes.find((d) => d.id === previewDevice) || deviceTypes[0];

  const previewFormattedTitle = (() => {
    if (!activePreviewDeviceObj) return "[Perangkat]";
    const deviceName = activePreviewDeviceObj.nama;
    const sub = previewSubtype ? ` - ${previewSubtype}` : "";
    const brand = previewMerek ? ` (${previewMerek})` : "";
    return `[${deviceName}${sub}]${brand}`;
  })();

  const dynamicSelectFields: CustomField[] = Array.from(
    new Map(
      deviceTypes
        .flatMap((d) => d.customFields || [])
        .filter((f) => f.type === "select" && f.id !== "cabang" && f.id !== "merek")
        .map((f) => [f.id, f])
    ).values()
  );

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`p-3 text-xs rounded-md border flex items-center justify-between ${
            msg.type === "success"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-gray-400 hover:text-gray-600 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* HEADER SIMPAN BERSAMA */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" /> Pengaturan Jenis Perangkat & Opsi Sistem
          </h2>
          <p className="text-xs text-gray-500">
            Tambah jenis perangkat baru (seperti ATM, Router, UPS), sub-tipe, merek, dan vendor perbaikan.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" loading={saving} onClick={handleSaveAll}>
            <Save className="w-4 h-4 mr-1.5" /> Simpan Semua Perubahan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BAGIAN 1: JENIS PERANGKAT DINAMIS */}
        <Card padding="md">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-gray-900">
              <Cpu className="w-4 h-4 text-blue-600" /> 1. Kelola Jenis Perangkat (Misal: ATM, Router, Server)
            </CardTitle>
          </CardHeader>
          <p className="text-xs text-gray-500 mb-4">
            Tambahkan jenis perangkat baru yang akan muncul di Form Input Tiket.
          </p>

          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Nama perangkat baru (misal: Router, ATM, UPS)..."
              value={newDeviceName}
              onChange={(e) => setNewDeviceName(e.target.value)}
              className="text-xs"
            />
            <Button size="sm" type="button" onClick={handleAddDeviceType} className="shrink-0">
              <Plus className="w-4 h-4 mr-1" /> Tambah
            </Button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {deviceTypes.map((dt) => (
              <div
                key={dt.id}
                className="flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all border-gray-200 bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex-1 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-semibold text-gray-800">{dt.nama}</span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    ({dt.subtypes.length} opsi slide-down)
                  </span>
                </div>
                {dt.id !== "workstation" && dt.id !== "edc" && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDeviceType(dt.id)}
                    className="text-gray-400 hover:text-red-600 p-1 font-bold"
                    title="Hapus Jenis Perangkat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>

      {/* SEKSI 2: KELOLA OPSI SLIDE-DOWN DEDIKASI PER JENIS PERANGKAT */}
      <div className="space-y-4 pt-2 border-t border-gray-200">
        <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-purple-600" /> 2. Kelola Opsi Slide-Down Sub-Tipe Per Perangkat ({deviceTypes.length} Jenis Perangkat)
            </h3>
            <p className="text-xs text-purple-700 mt-0.5">
              Setiap jenis perangkat yang dibuat oleh Super Admin otomatis memiliki sub-judul card dedikasi di bawah ini untuk mengedit opsi <em>slide-down</em>-nya.
            </p>
          </div>
        </div>

        {/* Dynamic Grid: Setiap Jenis Perangkat Memiliki Card Dedikasi Sendiri */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {deviceTypes.map((dt) => {
            const inputVal = subtypeInputs[dt.id] || "";

            // Ambil daftar opsi slide-down dari perangkat lain yang belum ada di perangkat ini
            const availableFromOtherDevices = Array.from(
              new Set(
                deviceTypes
                  .filter((other) => other.id !== dt.id)
                  .flatMap((other) => other.subtypes)
                  .filter((sub) => !dt.subtypes.includes(sub))
              )
            );

            return (
              <Card key={dt.id} padding="md" className="border-l-4 border-l-purple-500 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between text-gray-900">
                      <span className="flex items-center gap-2 font-bold">
                        <Layers className="w-4 h-4 text-purple-600" /> Opsi Slide-Down: {dt.nama}
                      </span>
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-mono">
                        {dt.subtypes.length} Opsi
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <p className="text-xs text-gray-500 mb-3">
                    Ketik opsi baru dari awal ATAU salin opsi dari perangkat lain:
                  </p>

                  {/* Form Input Subtype Manual */}
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder={`Ketik opsi baru untuk ${dt.nama}...`}
                      value={inputVal}
                      onChange={(e) => setSubtypeInputForDevice(dt.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSubtypeForDevice(dt.id, inputVal);
                          setSubtypeInputForDevice(dt.id, "");
                        }
                      }}
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => {
                        handleAddSubtypeForDevice(dt.id, inputVal);
                        setSubtypeInputForDevice(dt.id, "");
                      }}
                      className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Tambah
                    </Button>
                  </div>

                  {/* Opsi Salin Dari Perangkat Lain */}
                  {availableFromOtherDevices.length > 0 && (
                    <div className="mb-3 flex items-center gap-1.5 bg-purple-50/70 p-2 rounded-lg border border-purple-100">
                      <Copy className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span className="text-[11px] font-semibold text-purple-900 shrink-0">Salin dari Opsi Terdaftar:</span>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddSubtypeForDevice(dt.id, e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="w-full text-xs bg-white border border-purple-200 rounded-md px-2 py-1 text-purple-900 focus:outline-none focus:ring-1 focus:ring-purple-400 font-medium truncate cursor-pointer"
                      >
                        <option value="">-- Pilih Opsi yang Sudah Ada --</option>
                        {availableFromOtherDevices.map((sub) => (
                          <option key={sub} value={sub}>
                            + {sub}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Badges Container */}
                  {dt.subtypes.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2.5 bg-purple-50/40 border border-purple-100 rounded-xl">
                      {dt.subtypes.map((sub) => (
                        <span
                          key={sub}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-purple-800 border border-purple-200 rounded-lg text-xs font-semibold shadow-xs"
                        >
                          {sub}
                          <button
                            type="button"
                            onClick={() => handleRemoveSubtype(dt.id, sub)}
                            className="hover:text-red-600 text-gray-400 font-bold ml-1"
                            title={`Hapus ${sub}`}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 italic py-2.5 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                      Belum ada opsi slide-down untuk {dt.nama}. (Petugas tidak perlu memilih sub-tipe).
                    </p>
                  )}
                </div>
              </Card>
            );
          })}

          {/* Cards Opsi untuk Dynamic Select Fields (Ditambahkan di Master Perangkat) */}
          {dynamicSelectFields.map((field) => {
            const inputVal = fieldOptionInputs[field.id] || "";
            const currentOpts = field.options || [];

            // Opsi dari slide-down lain yang belum dimasukkan ke field ini
            const availablePresets = Array.from(
              new Set([
                ...merekKomputer,
                ...vendorList,
                ...deviceTypes.flatMap((d) => d.subtypes),
              ])
            ).filter((o) => !currentOpts.includes(o));

            return (
              <Card key={field.id} padding="md" className="border-l-4 border-l-indigo-500 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between text-gray-900">
                      <span className="flex items-center gap-2 font-bold">
                        <Layers className="w-4 h-4 text-indigo-600" /> Opsi Slide-Down: {field.label}
                      </span>
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-mono">
                        {currentOpts.length} Opsi
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <p className="text-xs text-gray-500 mb-3">
                    Card otomatis dari kolom slide-down <strong>{field.label}</strong> pada Master Perangkat. Ketik baru atau salin opsi:
                  </p>

                  {/* Form Input Opsi Manual */}
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder={`Ketik opsi baru untuk ${field.label}...`}
                      value={inputVal}
                      onChange={(e) => setFieldOptionInputForField(field.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddOptionToField(field.id, inputVal);
                          setFieldOptionInputForField(field.id, "");
                        }
                      }}
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => {
                        handleAddOptionToField(field.id, inputVal);
                        setFieldOptionInputForField(field.id, "");
                      }}
                      className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Tambah
                    </Button>
                  </div>

                  {/* Salin dari Opsi Terdaftar */}
                  {availablePresets.length > 0 && (
                    <div className="mb-3 flex items-center gap-1.5 bg-indigo-50/70 p-2 rounded-lg border border-indigo-100">
                      <Copy className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="text-[11px] font-semibold text-indigo-900 shrink-0">Salin dari Opsi Terdaftar:</span>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddOptionToField(field.id, e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="w-full text-xs bg-white border border-indigo-200 rounded-md px-2 py-1 text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 font-medium truncate cursor-pointer"
                      >
                        <option value="">-- Pilih Opsi yang Sudah Ada --</option>
                        {availablePresets.map((opt) => (
                          <option key={opt} value={opt}>
                            + {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Badges Container */}
                  {currentOpts.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2.5 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                      {currentOpts.map((opt) => (
                        <span
                          key={opt}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-indigo-900 border border-indigo-200 rounded-lg text-xs font-semibold shadow-xs"
                        >
                          {opt}
                          <button
                            type="button"
                            onClick={() => handleRemoveOptionFromField(field.id, opt)}
                            className="hover:text-red-600 text-gray-400 font-bold ml-1"
                            title={`Hapus ${opt}`}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 italic py-2.5 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                      Belum ada opsi slide-down untuk {field.label}. Tambahkan di atas.
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

        {/* BAGIAN 3: DAFTAR MEREK HARDWARE / PERANGKAT */}
        <Card padding="md">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-gray-900">
              <Tag className="w-4 h-4 text-emerald-600" /> 3. Daftar Merek Hardware &amp; Perangkat (Komputer, Router, ATM, Server, dll)
            </CardTitle>
          </CardHeader>
          <p className="text-xs text-gray-500 mb-3">
            Kelola daftar merek hardware (seperti Lenovo, HP, Dell, Cisco, Mikrotik, Sunmi, dll) yang dapat dipilih saat menginput tiket.
          </p>

          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Tambah merek baru (misal: Cisco, Mikrotik, Asus)..."
              value={newMerekKomputer}
              onChange={(e) => setNewMerekKomputer(e.target.value)}
              className="text-xs"
            />
            <Button
              size="sm"
              type="button"
              onClick={() => {
                if (newMerekKomputer.trim() && !merekKomputer.includes(newMerekKomputer.trim())) {
                  setMerekKomputer([...merekKomputer, newMerekKomputer.trim()]);
                  setNewMerekKomputer("");
                }
              }}
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-emerald-50/30 border border-emerald-100 rounded-xl">
            {merekKomputer.map((m) => (
              <span key={m} className="px-2.5 py-1 bg-white text-emerald-800 border border-emerald-200 rounded-md text-xs font-semibold flex items-center gap-1 shadow-xs">
                {m}
                <button
                  type="button"
                  onClick={() => setMerekKomputer(merekKomputer.filter((x) => x !== m))}
                  className="hover:text-red-600 ml-1 text-gray-400 font-bold"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </Card>

        {/* BAGIAN 4: DAFTAR VENDOR PERBAIKAN */}
        <Card padding="md">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-gray-900">
              <Building2 className="w-4 h-4 text-amber-600" /> 4. Daftar Vendor Perbaikan Perangkat
            </CardTitle>
          </CardHeader>

          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Tambah vendor baru (misal: PT Infomedia)..."
              value={newVendor}
              onChange={(e) => setNewVendor(e.target.value)}
              className="text-xs"
            />
            <Button
              size="sm"
              type="button"
              onClick={() => {
                if (newVendor.trim() && !vendorList.includes(newVendor.trim())) {
                  setVendorList([...vendorList, newVendor.trim()]);
                  setNewVendor("");
                }
              }}
              className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
            {vendorList.map((v) => (
              <span key={v} className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-xs flex items-center gap-1">
                {v}
                <button
                  type="button"
                  onClick={() => setVendorList(vendorList.filter((x) => x !== v))}
                  className="hover:text-red-600 ml-1 font-bold"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* BAGIAN 5: LIVE PREVIEW MOCKUP INTERAKTIF (FORM SIMULATOR) */}
      <Card padding="md" className="bg-slate-900 text-white border-slate-800 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Sparkles className="w-32 h-32 text-indigo-400" />
        </div>

        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between text-white">
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400 animate-pulse" /> Live Preview Simulation (Simulasi Interaktif Tampilan Input Tiket)
            </span>
            <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              Interaktif / Slide-down
            </span>
          </CardTitle>
        </CardHeader>
        <p className="text-xs text-slate-300 mb-5">
          Uji coba langsung pilihan jenis perangkat, sub-tipe (fitur <em>slide-down</em>), merek, dan vendor di bawah ini. Tampilan ini secara <em>real-time</em> mensimulasikan apa yang dilihat petugas saat menginput tiket.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {/* SIMULASI 1: JENIS PERANGKAT */}
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-2">
            <label className="block text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <Tag className="w-3 h-3 text-blue-400" /> 1. Pilih Jenis Perangkat
            </label>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {deviceTypes.map((dt) => (
                <button
                  key={dt.id}
                  type="button"
                  onClick={() => {
                    setPreviewDevice(dt.id);
                    setPreviewSubtype(dt.subtypes[0] || "");
                    setPreviewSubtypeOpen(true);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    previewDevice === dt.id
                      ? "bg-blue-600 text-white font-bold shadow-md ring-2 ring-blue-400/40"
                      : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <span className="truncate">{dt.nama}</span>
                  {previewDevice === dt.id && <CheckCircle2 className="w-3.5 h-3.5 text-blue-200 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* SIMULASI 2: SUB-TIPE (SLIDE DOWN INTERAKTIF) */}
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-2">
            <label className="block text-[11px] font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-purple-400" /> 2. Sub-Tipe (Slide Down)
              </span>
              {activePreviewDeviceObj?.subtypes && activePreviewDeviceObj.subtypes.length > 0 && (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                  Wajib Pilih
                </span>
              )}
            </label>

            {activePreviewDeviceObj && activePreviewDeviceObj.subtypes.length > 0 ? (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewSubtypeOpen((prev) => !prev)}
                  className="w-full text-xs bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg flex items-center justify-between font-medium hover:border-purple-400 transition-colors cursor-pointer"
                >
                  <span>{previewSubtype ? `Sub: ${previewSubtype}` : "-- Pilih Sub-Tipe --"}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${previewSubtypeOpen ? "rotate-180 text-purple-400" : ""}`} />
                </button>

                <AnimatePresence>
                  {previewSubtypeOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden bg-slate-900 border border-slate-700 rounded-lg divide-y divide-slate-800 shadow-lg"
                    >
                      {activePreviewDeviceObj.subtypes.map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => {
                            setPreviewSubtype(sub);
                            setPreviewSubtypeOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                            previewSubtype === sub ? "bg-purple-600/40 text-purple-200 font-bold" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          <span>{sub}</span>
                          {previewSubtype === sub && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="p-3 text-[11px] text-slate-400 italic text-center bg-slate-900/40 border border-dashed border-slate-700 rounded-lg">
                Tidak ada sub-tipe untuk jenis ini.
              </div>
            )}
          </div>

          {/* SIMULASI 3: MEREK HARDWARE */}
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-2">
            <label className="block text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <Tag className="w-3 h-3 text-emerald-400" /> 3. Merek Hardware
            </label>
            <select
              value={previewMerek}
              onChange={(e) => setPreviewMerek(e.target.value)}
              className="w-full text-xs bg-slate-700 border border-slate-600 text-white px-2.5 py-2 rounded-lg focus:outline-none focus:border-emerald-400 font-medium cursor-pointer"
            >
              <option value="">-- Pilih Merek --</option>
              {merekKomputer.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* SIMULASI 4: VENDOR PERBAIKAN */}
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-2">
            <label className="block text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-amber-400" /> 4. Vendor Perbaikan
            </label>
            <select
              value={previewVendor}
              onChange={(e) => setPreviewVendor(e.target.value)}
              className="w-full text-xs bg-slate-700 border border-slate-600 text-white px-2.5 py-2 rounded-lg focus:outline-none focus:border-amber-400 font-medium cursor-pointer"
            >
              <option value="">-- Pilih Vendor --</option>
              {vendorList.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* PROTOTYPE HASIL FORMAT OUTPUT */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="font-semibold text-slate-400">Hasil Format Sistem:</span>
            <span className="bg-slate-800 text-emerald-400 border border-slate-700 px-3 py-1.5 rounded-lg font-mono font-bold text-xs shadow-inner">
              {previewFormattedTitle}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 italic">
            ✓ Data tersimpan otomatis ketika menekan &quot;Simpan Semua Perubahan&quot;
          </span>
        </div>
      </Card>

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <Button size="lg" loading={saving} onClick={handleSaveAll} className="px-6">
          <Check className="w-4 h-4 mr-2" /> Simpan Semua Perubahan Master Opsi
        </Button>
      </div>
    </div>
  );
}
