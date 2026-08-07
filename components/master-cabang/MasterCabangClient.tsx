"use client";

import { useMemo, useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, Loader2, MapPin, Monitor, Truck, Check } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"cabang" | "merek" | "vendor">("cabang");
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
