"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Cpu, Layers, Tag, Building2, Check, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface DeviceType {
  id: string;
  nama: string;
  subtypes: string[];
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
  const [selectedDeviceForSubtype, setSelectedDeviceForSubtype] = useState<string>("");
  const [newSubtypeInput, setNewSubtypeInput] = useState("");

  const [newMerekKomputer, setNewMerekKomputer] = useState("");
  const [newMerekEdc, setNewMerekEdc] = useState("");
  const [newVendor, setNewVendor] = useState("");

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

        if (data.deviceTypes && data.deviceTypes.length > 0) {
          setSelectedDeviceForSubtype(data.deviceTypes[0].id);
        }
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
    setSelectedDeviceForSubtype(id);
    setNewDeviceName("");
    setMsg({ type: "success", text: `Jenis perangkat "${name}" ditambahkan.` });
  }

  function handleRemoveDeviceType(id: string) {
    const updated = deviceTypes.filter((d) => d.id !== id);
    setDeviceTypes(updated);
    if (selectedDeviceForSubtype === id && updated.length > 0) {
      setSelectedDeviceForSubtype(updated[0].id);
    }
  }

  // Helper Subtype
  function handleAddSubtype() {
    if (!newSubtypeInput.trim() || !selectedDeviceForSubtype) return;
    const subName = newSubtypeInput.trim();

    setDeviceTypes((prev) =>
      prev.map((d) => {
        if (d.id === selectedDeviceForSubtype) {
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

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-500">Memuat opsi master...</div>;
  }

  const selectedDevice = deviceTypes.find((d) => d.id === selectedDeviceForSubtype);

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
          <Button variant="outline" size="sm" onClick={fetchOptions}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset
          </Button>
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
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all ${
                  selectedDeviceForSubtype === dt.id
                    ? "border-primary bg-primary-50/40 font-semibold text-primary"
                    : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div
                  className="flex-1 cursor-pointer flex items-center gap-2"
                  onClick={() => setSelectedDeviceForSubtype(dt.id)}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{dt.nama}</span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    ({dt.subtypes.length} sub-tipe)
                  </span>
                </div>
                {dt.id !== "workstation" && dt.id !== "edc" && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDeviceType(dt.id)}
                    className="text-gray-400 hover:text-red-600 p-1"
                    title="Hapus Jenis Perangkat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* BAGIAN 2: SUB-TIPE / SUB-JUDUL PERANGKAT */}
        <Card padding="md">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-gray-900">
              <Layers className="w-4 h-4 text-purple-600" /> 2. Sub-Tipe Perangkat ({selectedDevice?.nama || "Pilih Perangkat"})
            </CardTitle>
          </CardHeader>
          <p className="text-xs text-gray-500 mb-4">
            Kelola pilihan sub-tipe (misal untuk Komputer: Desktop, All in One, Mini PC. Bisa dikosongkan jika tanpa sub-tipe).
          </p>

          {selectedDevice ? (
            <div>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder={`Tambah sub-tipe untuk ${selectedDevice.nama}...`}
                  value={newSubtypeInput}
                  onChange={(e) => setNewSubtypeInput(e.target.value)}
                  className="text-xs"
                />
                <Button size="sm" type="button" onClick={handleAddSubtype} className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white">
                  <Plus className="w-4 h-4 mr-1" /> Tambah Sub
                </Button>
              </div>

              {selectedDevice.subtypes.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {selectedDevice.subtypes.map((sub) => (
                    <span
                      key={sub}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-medium"
                    >
                      {sub}
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtype(selectedDevice.id, sub)}
                        className="hover:text-red-600 ml-1"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic py-4 text-center border border-dashed border-gray-200 rounded-lg">
                  Tanpa Sub-tipe (Perangkat ini tidak menggunakan sub-judul khusus).
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic text-center py-6">Pilih jenis perangkat di sebelah kiri terlebih dahulu.</p>
          )}
        </Card>

        {/* BAGIAN 3: DAFTAR MEREK (KOMPUTER & LAINNYA) */}
        <Card padding="md">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-gray-900">
              <Tag className="w-4 h-4 text-emerald-600" /> 3. Daftar Merek Komputer / Hardware
            </CardTitle>
          </CardHeader>

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
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
            {merekKomputer.map((m) => (
              <span key={m} className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-xs flex items-center gap-1">
                {m}
                <button
                  type="button"
                  onClick={() => setMerekKomputer(merekKomputer.filter((x) => x !== m))}
                  className="hover:text-red-600 ml-1 font-bold"
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

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <Button size="lg" loading={saving} onClick={handleSaveAll} className="px-6">
          <Check className="w-4 h-4 mr-2" /> Simpan Semua Perubahan Master Opsi
        </Button>
      </div>
    </div>
  );
}
