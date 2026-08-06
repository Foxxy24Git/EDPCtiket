"use client";

import { useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Search, Edit2, Trash2, Check, Plus } from "lucide-react";
import type { ServerLog } from "./TambahLogModal";

interface DataPengunjungCrudModalProps {
  open: boolean;
  onClose: () => void;
  logs: ServerLog[];
  onRefresh: () => Promise<void>;
  onLogAdded: (log: ServerLog) => void;
  onToast: (message: string) => void;
}

const PIC_LIST = [
  "RUDI HARNO FAZLUR RAHMAN",
  "BERTO LAILATUL",
  "DIMAS TEGUH PRIBADI",
  "TIO RAHMAYUDA",
  "MUHAMMAD RYAN TIRTA ATMAJA",
  "HENDRIANTO",
  "AFRINALDI",
  "RIAN ISLAMI PUTRA",
  "KURNIA FAJRI",
  "IBNU SAUKI",
  "RIDHO M R"
];

export function DataPengunjungCrudModal({
  open,
  onClose,
  logs,
  onRefresh,
  onLogAdded,
  onToast,
}: DataPengunjungCrudModalProps) {
  const [tab, setTab] = useState<"list" | "kiosk" | "form">("list");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [namaOrang, setNamaOrang] = useState("");
  const [instansi, setInstansi] = useState("");
  const [namaPic, setNamaPic] = useState("");
  const [keperluan, setKeperluan] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Antrean Device = log berstatus pre_registered
  const deviceQueueLogs = logs.filter((l) => l.statusApproval === "pre_registered");

  // Deduplikasi data pengunjung di Tab 1 (Data Pengunjung) berdasarkan Nama & Instansi
  // agar pendaftaran ke Antrean Device tidak membuat baris ganda/duplikat di Tab 1
  const masterVisitors = useMemo(() => {
    const map = new Map<string, ServerLog>();
    logs.forEach((log) => {
      const key = `${log.namaOrang.trim().toLowerCase()}_${log.instansi.trim().toLowerCase()}`;
      const existing = map.get(key);
      if (!existing || (existing.statusApproval === "pre_registered" && log.statusApproval !== "pre_registered")) {
        map.set(key, log);
      }
    });
    return Array.from(map.values());
  }, [logs]);

  function handleResetForm() {
    setEditingId(null);
    setNamaOrang("");
    setInstansi("");
    setNamaPic("");
    setKeperluan("");
    setError(null);
  }

  function handleOpenCreate() {
    handleResetForm();
    setTab("form");
  }

  function handleOpenEdit(log: ServerLog) {
    setEditingId(log.id);
    setNamaOrang(log.namaOrang);
    setInstansi(log.instansi || "");
    setNamaPic(log.namaPic || "");
    setKeperluan(log.keperluan || "");
    setError(null);
    setTab("form");
  }

  async function handleSaveForm(e: React.FormEvent) {
    e.preventDefault();
    if (!namaOrang.trim() || !instansi.trim()) {
      setError("Nama pengunjung dan Instansi wajib diisi.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        // Edit log yang sudah ada
        const res = await fetch("/api/server-log", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            action: "edit",
            namaOrang: namaOrang.trim(),
            instansi: instansi.trim(),
            namaPic: namaPic.trim(),
            keperluan: keperluan.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Gagal memperbarui data.");
        onToast("Data pengunjung berhasil di-edit!");
      } else {
        // Tambah baru (masuk ke antrean device kiosk)
        const res = await fetch("/api/server-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            namaOrang: namaOrang.trim(),
            instansi: instansi.trim(),
            namaPic: namaPic.trim(),
            keperluan: keperluan.trim(),
            isPreRegister: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Gagal menambahkan data.");
        onLogAdded(data.log as ServerLog);
        onToast("Data pengunjung berhasil ditambahkan ke Antrean Device!");
      }

      await onRefresh();
      handleResetForm();
      setTab("kiosk"); // Otomatis pindah ke tab Antrean Device
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  // Aksi Tambah Ke Device Direct (Pencegahan Duplikasi Antrean Device)
  async function handleAddDirectToKiosk(item: ServerLog) {
    // Cek jika data pengunjung ini sudah ada di Antrean Device
    const alreadyInQueue = deviceQueueLogs.some(
      (q) =>
        q.namaOrang.trim().toLowerCase() === item.namaOrang.trim().toLowerCase() &&
        q.instansi.trim().toLowerCase() === item.instansi.trim().toLowerCase()
    );

    if (alreadyInQueue) {
      onToast(`"${item.namaOrang}" sudah berada di dalam Antrean Device!`);
      return;
    }

    try {
      const res = await fetch("/api/server-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaOrang: item.namaOrang,
          instansi: item.instansi,
          namaPic: item.namaPic || "",
          keperluan: item.keperluan || "",
          isPreRegister: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mendaftarkan ke device.");
      onLogAdded(data.log as ServerLog);
      await onRefresh();
      onToast(`Data "${item.namaOrang}" berhasil masuk Antrean Device!`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menambahkan ke device.");
    }
  }

  async function handleDeleteDirect(item: ServerLog) {
    if (item.statusApproval === "approved") {
      onToast("Data log server yang sudah disetujui (Approved) bersifat permanen dan tidak dapat dihapus.");
      return;
    }

    setDeletingId(item.id);
    try {
      const res = await fetch(`/api/server-log?id=${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        onToast(data.error ?? "Gagal menghapus data.");
        return;
      }
      onToast("Data pengunjung berhasil dihapus!");
      await onRefresh();
    } catch {
      onToast("Terjadi kesalahan koneksi.");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredLogs = masterVisitors.filter(
    (l) =>
      l.namaOrang.toLowerCase().includes(search.toLowerCase()) ||
      (l.instansi && l.instansi.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredKioskLogs = deviceQueueLogs.filter(
    (l) =>
      l.namaOrang.toLowerCase().includes(search.toLowerCase()) ||
      (l.instansi && l.instansi.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Data Pengunjung"
      size="lg"
    >
      <div className="space-y-4 bg-white">
        
        {/* Navigation Tabs (Data Pengunjung | Antrean Device | + Tambah Pengunjung Baru) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setTab("list")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tab === "list" ? "bg-primary text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Data Pengunjung ({logs.length})
            </button>

            <button
              type="button"
              onClick={() => setTab("kiosk")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tab === "kiosk" ? "bg-primary text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Antrean Device ({deviceQueueLogs.length})
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tab === "form" && !editingId ? "bg-primary text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              + Tambah Pengunjung Baru
            </button>
          </div>
        </div>

        {/* TAB 1: DAFTAR DATA PENGUNJUNG UTAMA */}
        {tab === "list" && (
          <div className="space-y-3">
            {/* Search Filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari nama pengunjung / instansi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-primary font-semibold text-slate-800"
              />
            </div>

            {/* List Table Rapi Ukuran Tetap h-[340px] */}
            <div className="border border-slate-200 rounded-xl overflow-hidden h-[340px] overflow-y-auto bg-white">
              {filteredLogs.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  Tidak ada data pengunjung yang cocok.
                </div>
              ) : (
                <table className="w-full text-left text-xs table-fixed border-collapse">
                  <thead className="bg-slate-100/90 border-b border-slate-200 font-bold text-slate-800">
                    <tr>
                      <th className="p-3 w-[28%]">Nama Tamu</th>
                      <th className="p-3 w-[24%]">Instansi</th>
                      <th className="p-3 w-[28%]">Keperluan</th>
                      <th className="p-3 text-center w-[10%]">Edit</th>
                      <th className="p-3 text-center w-[10%]">Tambah Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredLogs.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-900 truncate">{item.namaOrang}</td>
                        <td className="p-3 text-slate-700 truncate">{item.instansi || "-"}</td>
                        <td className="p-3 text-slate-500 truncate">{item.keperluan || "-"}</td>
                        
                        {/* Edit Kolom */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                            title="Edit Data"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>

                        {/* Tambah Data Kolom (Ikon Plus `+`, Langsung Tambah Ke Antrean Device!) */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleAddDirectToKiosk(item)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 border border-emerald-200 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center mx-auto"
                            title="Tambah Ke Device Kiosk"
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ANTREAN DEVICE (Tamu Terdaftar Di Device Kiosk) */}
        {tab === "kiosk" && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-semibold flex items-center justify-between">
              <span>Daftar pengunjung yang saat ini tampil pada peranti device kiosk (`/auth-server`).</span>
            </div>

            {/* List Table Antrean Device (Ukuran Tetap h-[340px]) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden h-[340px] overflow-y-auto bg-white">
              {filteredKioskLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Tidak ada antrean device yang aktif saat ini.
                </div>
              ) : (
                <table className="w-full text-left text-xs table-fixed border-collapse">
                  <thead className="bg-slate-100/90 border-b border-slate-200 font-bold text-slate-800">
                    <tr>
                      <th className="p-3 w-[28%]">Nama Tamu</th>
                      <th className="p-3 w-[24%]">Instansi</th>
                      <th className="p-3 w-[28%]">Keperluan</th>
                      <th className="p-3 text-center w-[20%]">Hapus Antrean</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredKioskLogs.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-900 truncate">{item.namaOrang}</td>
                        <td className="p-3 text-slate-700 truncate">{item.instansi || "-"}</td>
                        <td className="p-3 text-slate-500 truncate">{item.keperluan || "-"}</td>
                        
                        {/* Tombol Hapus Antrean Langsung (Jika Keliru Dimasukkan) */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            disabled={deletingId === item.id}
                            onClick={() => handleDeleteDirect(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                            title="Hapus Antrean Device Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FORM TAMBAH / EDIT */}
        {tab === "form" && (
          <form onSubmit={handleSaveForm} className="space-y-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">
              {editingId ? "Edit Data Pengunjung" : "Tambah Pengunjung Baru"}
            </h4>

            <Input
              label="Nama Pengunjung"
              id="crud-nama"
              required
              placeholder="Nama lengkap pengunjung / vendor"
              value={namaOrang}
              onChange={(e) => setNamaOrang(e.target.value)}
            />

            <Input
              label="Nama Instansi"
              id="crud-instansi"
              required
              placeholder="Mis. Bank Nagari, PT. PLN..."
              value={instansi}
              onChange={(e) => setInstansi(e.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="crud-pic" className="text-xs font-semibold text-slate-700">
                Nama PIC Pendamping <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <select
                id="crud-pic"
                value={namaPic}
                onChange={(e) => setNamaPic(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-primary cursor-pointer text-slate-800"
              >
                <option value="" className="text-slate-400">Pilih PIC IT Support...</option>
                {PIC_LIST.map((name) => (
                  <option key={name} value={name} className="text-slate-800 font-semibold">{name}</option>
                ))}
              </select>
            </div>

            <Input
              label="Keperluan"
              id="crud-keperluan"
              placeholder="Mis. Maintenance server, Pengecekan AC..."
              value={keperluan}
              onChange={(e) => setKeperluan(e.target.value)}
            />

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2 font-semibold">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setTab("list")}>
                Batal
              </Button>
              <Button type="submit" loading={saving} disabled={!namaOrang.trim() || !instansi.trim() || saving}>
                <Check className="w-4 h-4 mr-1" /> {editingId ? "Simpan Perubahan" : "Simpan Pengunjung"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
