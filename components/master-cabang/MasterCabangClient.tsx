"use client";

import { useMemo, useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, Loader2, MapPin, Monitor, Truck, Check, Sliders, Layers, Copy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  Th,
  Td,
} from "@/components/ui/Table";

interface Branch {
  id: string;
  namaCabang: string;
  kodeKantor: string | null;
  lokasiKantor: string | null;
}

interface Props {
  initialBranches: Branch[];
}

export function MasterCabangClient({ initialBranches }: Props) {
  const [activeTab, setActiveTab] = useState<"cabang" | "merek" | "vendor" | "opsi">("cabang");
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Dynamic Master Options (Merek Komputer, Merek EDC, Vendor)
  const [masterOptions, setMasterOptions] = useState<{
    merekKomputer: string[];
    merekEdc: string[];
    vendorList: string[];
  }>({
    merekKomputer: ["Lenovo", "HP", "Dell", "Acer", "Asus", "Apple", "Fujitsu"],
    merekEdc: ["Ingenico", "Verifone", "Pax", "Sunmi", "MoreFun", "Castle"],
    vendorList: ["PT Infomedia", "Vendor Lenovo", "PT Multipolar", "Vendor HP", "PT Visionet"],
  });
  const [savingOptions, setSavingOptions] = useState(false);

  // State untuk Opsi Slide-Down (custom fields select dari deviceTypes)
  interface CustomField {
    id: string;
    label: string;
    type: string;
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
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [fieldOptionInputs, setFieldOptionInputs] = useState<Record<string, string>>({});
  const [savingFieldOptions, setSavingFieldOptions] = useState(false);

  // Modals state untuk Cabang
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  // Form states untuk Cabang
  const [form, setForm] = useState({
    namaCabang: "",
    kodeKantor: "",
    lokasiKantor: "",
  });
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Input state untuk Tambah Merek / Vendor
  const [newMerekKomputer, setNewMerekKomputer] = useState("");
  const [newVendor, setNewVendor] = useState("");

  useEffect(() => {
    fetch("/api/master-options")
      .then((res) => res.json())
      .then((data) => {
        if (data.merekKomputer && data.merekEdc && data.vendorList) {
          setMasterOptions(data);
        }
        if (data.deviceTypes && Array.isArray(data.deviceTypes)) {
          setDeviceTypes(data.deviceTypes);
        }
      })
      .catch((err) => console.error("Gagal memuat master options:", err));

    if (branches.length === 0) {
      refreshBranches();
    }
  }, []);

  const refreshBranches = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workstation");
      if (res.ok) {
        const data = await res.json();
        setBranches(data.items ?? []);
      }
    } catch (err) {
      console.error("Gagal refresh cabang:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveMasterOptions = async (updated: typeof masterOptions) => {
    setSavingOptions(true);
    try {
      const res = await fetch("/api/master-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setMasterOptions(updated);
      }
    } catch (e) {
      console.error("Gagal menyimpan data master:", e);
    } finally {
      setSavingOptions(false);
    }
  };

  // Handler untuk Opsi Slide-Down (custom select fields)
  function handleAddOptionToField(fieldId: string, optionVal: string) {
    if (!optionVal.trim()) return;
    const cleanOpt = optionVal.trim();
    setDeviceTypes((prev) =>
      prev.map((d) => {
        if (!d.customFields) return d;
        return {
          ...d,
          customFields: d.customFields.map((f) => {
            if (f.id === fieldId) {
              const currentOpts = f.options || [];
              if (currentOpts.includes(cleanOpt)) return f;
              return { ...f, options: [...currentOpts, cleanOpt] };
            }
            return f;
          }),
        };
      })
    );
  }

  function handleRemoveOptionFromField(fieldId: string, optionVal: string) {
    setDeviceTypes((prev) =>
      prev.map((d) => {
        if (!d.customFields) return d;
        return {
          ...d,
          customFields: d.customFields.map((f) => {
            if (f.id === fieldId) {
              return { ...f, options: (f.options || []).filter((o) => o !== optionVal) };
            }
            return f;
          }),
        };
      })
    );
  }

  async function saveFieldOptions() {
    setSavingFieldOptions(true);
    try {
      const res = await fetch("/api/master-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...masterOptions, deviceTypes }),
      });
      if (!res.ok) {
        console.error("Gagal menyimpan opsi slide-down.");
      }
    } catch (e) {
      console.error("Gagal menyimpan opsi field:", e);
    } finally {
      setSavingFieldOptions(false);
    }
  }

  const filteredBranches = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return branches;
    return branches.filter(
      (b) =>
        b.namaCabang.toLowerCase().includes(q) ||
        (b.kodeKantor && b.kodeKantor.toLowerCase().includes(q)) ||
        (b.lokasiKantor && b.lokasiKantor.toLowerCase().includes(q))
    );
  }, [branches, search]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.namaCabang.trim()) return setError("Nama Cabang wajib diisi.");

    setBusy(true);
    try {
      const res = await fetch("/api/workstation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menambahkan cabang.");
        return;
      }
      setAddOpen(false);
      setForm({ namaCabang: "", kodeKantor: "", lokasiKantor: "" });
      await refreshBranches();
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  };

  const handleEditOpen = (b: Branch) => {
    setSelectedBranch(b);
    setForm({
      namaCabang: b.namaCabang,
      kodeKantor: b.kodeKantor || "",
      lokasiKantor: b.lokasiKantor || "",
    });
    setError("");
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    setError("");
    if (!form.namaCabang.trim()) return setError("Nama Cabang wajib diisi.");

    setBusy(true);
    try {
      const res = await fetch(`/api/workstation/${selectedBranch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal memperbarui data.");
        return;
      }
      setEditOpen(false);
      setSelectedBranch(null);
      setForm({ namaCabang: "", kodeKantor: "", lokasiKantor: "" });
      await refreshBranches();
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteOpen = (b: Branch) => {
    setSelectedBranch(b);
    setError("");
    setDelOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedBranch) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/workstation/${selectedBranch.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Gagal menghapus data.");
        return;
      }
      setDelOpen(false);
      setSelectedBranch(null);
      await refreshBranches();
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  };

  // Handler Merek & Vendor
  const addMerekKomputer = () => {
    if (!newMerekKomputer.trim()) return;
    if (masterOptions.merekKomputer.includes(newMerekKomputer.trim())) return;
    const updated = {
      ...masterOptions,
      merekKomputer: [...masterOptions.merekKomputer, newMerekKomputer.trim()],
    };
    setNewMerekKomputer("");
    saveMasterOptions(updated);
  };

  const removeMerekKomputer = (index: number) => {
    const updated = {
      ...masterOptions,
      merekKomputer: masterOptions.merekKomputer.filter((_, i) => i !== index),
    };
    saveMasterOptions(updated);
  };

  const addVendor = () => {
    if (!newVendor.trim()) return;
    if (masterOptions.vendorList.includes(newVendor.trim())) return;
    const updated = {
      ...masterOptions,
      vendorList: [...masterOptions.vendorList, newVendor.trim()],
    };
    setNewVendor("");
    saveMasterOptions(updated);
  };

  const removeVendor = (index: number) => {
    const updated = {
      ...masterOptions,
      vendorList: masterOptions.vendorList.filter((_, i) => i !== index),
    };
    saveMasterOptions(updated);
  };

  return (
    <div className="space-y-6">
      {/* TABS SUPER ADMIN MASTER DATA */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-hidden shadow-sm">
        <button
          onClick={() => setActiveTab("cabang")}
          className={`flex-1 py-3.5 px-4 text-center font-bold text-sm transition-all flex items-center justify-center gap-2 border-b-2 ${
            activeTab === "cabang"
              ? "border-primary text-primary bg-primary-50/30"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <MapPin className="w-4 h-4" /> 1. Master Cabang Bank Nagari
        </button>

        <button
          onClick={() => setActiveTab("merek")}
          className={`flex-1 py-3.5 px-4 text-center font-bold text-sm transition-all flex items-center justify-center gap-2 border-b-2 ${
            activeTab === "merek"
              ? "border-primary text-primary bg-primary-50/30"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Monitor className="w-4 h-4" /> 2. Master Merek (Komputer &amp; EDC)
        </button>

        <button
          onClick={() => setActiveTab("vendor")}
          className={`flex-1 py-3.5 px-4 text-center font-bold text-sm transition-all flex items-center justify-center gap-2 border-b-2 ${
            activeTab === "vendor"
              ? "border-primary text-primary bg-primary-50/30"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Truck className="w-4 h-4" /> 3. Master Vendor Perbaikan
        </button>

        <button
          onClick={() => setActiveTab("opsi")}
          className={`flex-1 py-3.5 px-4 text-center font-bold text-sm transition-all flex items-center justify-center gap-2 border-b-2 ${
            activeTab === "opsi"
              ? "border-primary text-primary bg-primary-50/30"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Sliders className="w-4 h-4" /> 4. Opsi Slide-Down
        </button>
      </div>

      {/* ── TAB 1: MASTER CABANG ── */}
      {activeTab === "cabang" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Cari berdasarkan nama atau kode kantor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-gray-300 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>
            <div className="flex items-center gap-3">
              {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
              <Button onClick={() => { setForm({ namaCabang: "", kodeKantor: "", lokasiKantor: "" }); setError(""); setAddOpen(true); }}>
                <Plus className="w-4 h-4" /> Tambah Cabang
              </Button>
            </div>
          </div>

          <Card padding="none" className="overflow-hidden">
            {filteredBranches.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">
                Tidak ada data cabang workstation ditemukan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <Th>Nama Cabang</Th>
                      <Th>Kode Kantor</Th>
                      <Th>Lokasi / Alamat Kantor</Th>
                      <Th className="text-right">Aksi</Th>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredBranches.map((b) => (
                      <TableRow key={b.id} className="hover:bg-gray-50 transition-colors">
                        <Td className="font-semibold text-gray-900">{b.namaCabang}</Td>
                        <Td className="font-mono text-gray-600">{b.kodeKantor || "—"}</Td>
                        <Td>{b.lokasiKantor || "—"}</Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditOpen(b)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteOpen(b)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </Td>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── TAB 2: MASTER MEREK KOMPUTER ── */}
      {activeTab === "merek" && (
        <Card padding="lg" className="space-y-4 max-w-2xl mx-auto">
          <div>
            <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" /> Daftar Options Merek Komputer
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Super Admin dapat menambah, mengubah, atau menghapus daftar pilihan merek komputer yang tampil di Form Input Tiket.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Tambah Merek Komputer Baru..."
              value={newMerekKomputer}
              onChange={(e) => setNewMerekKomputer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMerekKomputer()}
            />
            <Button onClick={addMerekKomputer} disabled={savingOptions}>
              <Plus className="w-4 h-4" /> Tambah
            </Button>
          </div>

          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-[350px] overflow-y-auto">
            {masterOptions.merekKomputer.map((merek, idx) => (
              <div key={merek + idx} className="flex items-center justify-between p-3 hover:bg-gray-50">
                <span className="text-sm font-semibold text-gray-800">{merek}</span>
                <button
                  onClick={() => removeMerekKomputer(idx)}
                  className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                  title="Hapus opsi merek"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── TAB 3: MASTER VENDOR PERBAIKAN ── */}
      {activeTab === "vendor" && (
        <Card padding="lg" className="space-y-4 max-w-2xl mx-auto">
          <div>
            <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-600" /> Master Vendor Perbaikan
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Super Admin dapat mengelola daftar nama vendor resmi perbaikan perangkat workstation.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Tambah Nama Vendor Baru..."
              value={newVendor}
              onChange={(e) => setNewVendor(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addVendor()}
            />
            <Button onClick={addVendor} disabled={savingOptions} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4" /> Tambah Vendor
            </Button>
          </div>

          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
            {masterOptions.vendorList.map((vendor, idx) => (
              <div key={vendor + idx} className="flex items-center justify-between p-3.5 hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-gray-800">{vendor}</span>
                </div>
                <button
                  onClick={() => removeVendor(idx)}
                  className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                  title="Hapus Vendor"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── TAB 4: OPSI SLIDE-DOWN (Custom Select Fields dari Master Perangkat) ── */}
      {activeTab === "opsi" && (() => {
        // Kumpulkan semua field bertipe 'select' yang dinamis (bukan cabang/merek bawaan)
        const EXCLUDED_IDS = ["cabang", "merek"];
        const dynamicSelectFields = Array.from(
          new Map(
            deviceTypes
              .flatMap((d) => d.customFields || [])
              .filter((f) => f.type === "select" && !EXCLUDED_IDS.includes(f.id))
              .map((f) => [f.id, f])
          ).values()
        );

        return (
          <div className="space-y-5">
            {/* Header Info */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2 mb-1">
                <Sliders className="w-4 h-4 text-purple-600" /> Kelola Isian Opsi Slide-Down
              </h3>
              <p className="text-xs text-purple-700">
                Setiap kolom bertipe <strong>Slide-Down (Dropdown Select)</strong> yang ditambahkan di{" "}
                <a href="/master-perangkat" className="underline font-semibold hover:text-purple-900">Master Perangkat</a>{" "}
                akan muncul di sini secara otomatis. Isi opsi pilihannya di bawah ini, lalu klik Simpan.
              </p>
            </div>

            {dynamicSelectFields.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-purple-200 rounded-xl bg-purple-50/30">
                <Layers className="w-10 h-10 text-purple-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-500">Belum ada kolom Slide-Down dinamis</p>
                <p className="text-xs text-gray-400 mt-1">
                  Tambahkan kolom bertipe &quot;Slide-down&quot; di{" "}
                  <a href="/master-perangkat" className="text-purple-600 underline">Master Perangkat</a> terlebih dahulu.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {dynamicSelectFields.map((field) => {
                  const inputVal = fieldOptionInputs[field.id] || "";
                  const currentOpts = field.options || [];

                  return (
                    <div key={field.id} className="bg-white border border-indigo-200 rounded-xl shadow-sm overflow-hidden">
                      {/* Card Header */}
                      <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-indigo-600" />
                          <span className="font-bold text-sm text-indigo-900">{field.label}</span>
                        </div>
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-mono">
                          {currentOpts.length} Opsi
                        </span>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3">
                        {/* Input tambah opsi baru */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={`Ketik opsi baru untuk ${field.label}...`}
                            value={inputVal}
                            onChange={(e) =>
                              setFieldOptionInputs((prev) => ({ ...prev, [field.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddOptionToField(field.id, inputVal);
                                setFieldOptionInputs((prev) => ({ ...prev, [field.id]: "" }));
                              }
                            }}
                            className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleAddOptionToField(field.id, inputVal);
                              setFieldOptionInputs((prev) => ({ ...prev, [field.id]: "" }));
                            }}
                            className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambah
                          </button>
                        </div>

                        {/* Salin dari opsi lain */}
                        {(() => {
                          const allOtherOpts = Array.from(new Set(
                            dynamicSelectFields
                              .filter((f) => f.id !== field.id)
                              .flatMap((f) => f.options || [])
                              .filter((o) => !currentOpts.includes(o))
                          ));
                          if (allOtherOpts.length === 0) return null;
                          return (
                            <div className="flex items-center gap-1.5 bg-indigo-50/70 p-2 rounded-lg border border-indigo-100">
                              <Copy className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span className="text-[11px] font-semibold text-indigo-900 shrink-0">Salin dari opsi lain:</span>
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddOptionToField(field.id, e.target.value);
                                    e.target.value = "";
                                  }
                                }}
                                className="w-full text-xs bg-white border border-indigo-200 rounded-md px-2 py-1 text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 font-medium cursor-pointer"
                              >
                                <option value="">-- Pilih opsi yang sudah ada --</option>
                                {allOtherOpts.map((o) => (
                                  <option key={o} value={o}>+ {o}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })()}

                        {/* Daftar Opsi Saat Ini */}
                        {currentOpts.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2.5 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                            {currentOpts.map((opt) => (
                              <span
                                key={opt}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-indigo-900 border border-indigo-200 rounded-lg text-xs font-semibold shadow-xs"
                              >
                                {opt}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOptionFromField(field.id, opt)}
                                  className="hover:text-red-600 text-gray-400 font-bold ml-0.5"
                                  title={`Hapus ${opt}`}
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400 italic py-3 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                            Belum ada opsi. Ketik dan klik &quot;Tambah&quot; di atas.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tombol Simpan */}
            {dynamicSelectFields.length > 0 && (
              <div className="flex justify-end pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={saveFieldOptions}
                  disabled={savingFieldOptions}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                >
                  {savingFieldOptions ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Simpan Semua Opsi Slide-Down
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Modal Tambah Cabang */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Cabang Workstation Baru">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            label="Nama Cabang"
            required
            value={form.namaCabang}
            onChange={(e) => setForm({ ...form, namaCabang: e.target.value })}
            placeholder="cth: SYARIAH PADANG"
          />
          <Input
            label="Kode Kantor (opsional & unik)"
            value={form.kodeKantor}
            onChange={(e) => setForm({ ...form, kodeKantor: e.target.value })}
            placeholder="cth: 010"
          />
          <Input
            label="Lokasi Kantor (opsional)"
            value={form.lokasiKantor}
            onChange={(e) => setForm({ ...form, lokasiKantor: e.target.value })}
            placeholder="cth: Jl. Jenderal Sudirman No. 1 Padang"
          />

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" loading={busy}>
              Simpan Cabang
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Cabang */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Ubah Data Cabang Workstation">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Nama Cabang"
            required
            value={form.namaCabang}
            onChange={(e) => setForm({ ...form, namaCabang: e.target.value })}
          />
          <Input
            label="Kode Kantor (opsional & unik)"
            value={form.kodeKantor}
            onChange={(e) => setForm({ ...form, kodeKantor: e.target.value })}
          />
          <Input
            label="Lokasi Kantor (opsional)"
            value={form.lokasiKantor}
            onChange={(e) => setForm({ ...form, lokasiKantor: e.target.value })}
          />

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" loading={busy}>
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Hapus Cabang */}
      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Hapus Cabang Workstation?" size="sm">
        {selectedBranch && (
          <p className="text-sm text-gray-600">
            Apakah Anda yakin ingin menghapus data master cabang <span className="font-semibold">{selectedBranch.namaCabang}</span>?
            Tiket-tiket yang berelasi dengan cabang ini mungkin akan terdampak.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={() => setDelOpen(false)} disabled={busy}>
            Batal
          </Button>
          <Button variant="danger" loading={busy} onClick={handleDeleteSubmit}>
            Hapus
          </Button>
        </div>
      </Modal>
    </div>
  );
}
