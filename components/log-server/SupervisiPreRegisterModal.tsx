"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { UserPlus, UserCheck } from "lucide-react";
import type { ServerLog } from "./TambahLogModal";

interface SupervisiPreRegisterModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (log: ServerLog) => void;
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

export function SupervisiPreRegisterModal({ open, onClose, onSuccess }: SupervisiPreRegisterModalProps) {
  const [namaOrang, setNamaOrang] = useState("");
  const [instansi, setInstansi] = useState("");
  const [namaPic, setNamaPic] = useState("");
  const [keperluan, setKeperluan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setNamaOrang("");
    setInstansi("");
    setNamaPic("");
    setKeperluan("");
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!namaOrang.trim()) { setError("Nama pengunjung wajib diisi."); return; }
    if (!instansi.trim()) { setError("Nama instansi wajib diisi."); return; }

    setSaving(true);
    setError(null);

    try {
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
      if (!res.ok) throw new Error(data.error ?? "Gagal mendaftarkan pengunjung.");

      onSuccess(data.log as ServerLog);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan koneksi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Input Data Pengunjung"
      description="Daftarkan data pengunjung/instansi yang akan masuk ke ruang server. Data akan langsung terekam pada log server dan opsi device."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner Info */}
        <div className="flex items-center gap-2.5 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs">
          <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Data pengunjung ini akan terekam otomatis pada log server &amp; tersedia di laman device.</span>
        </div>

        {/* Nama Tamu */}
        <Input
          label="Nama Pengunjung"
          id="pre-nama"
          required
          placeholder="Nama lengkap pengunjung / vendor"
          value={namaOrang}
          onChange={(e) => setNamaOrang(e.target.value)}
        />

        {/* Instansi */}
        <Input
          label="Nama Instansi"
          id="pre-instansi"
          required
          placeholder="Mis. Bank Nagari, PT. PLN, Vendor..."
          value={instansi}
          onChange={(e) => setInstansi(e.target.value)}
        />

        {/* PIC Pendamping (Opsional) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pre-pic" className="text-xs font-semibold text-gray-700">
            Nama PIC Pendamping <span className="text-gray-400 font-normal">(Opsional)</span>
          </label>
          <select
            id="pre-pic"
            value={namaPic}
            onChange={(e) => setNamaPic(e.target.value)}
            className="w-full text-xs font-semibold rounded-xl border border-gray-200 bg-white px-3 py-2.5 outline-none focus:border-primary cursor-pointer"
          >
            <option value="" className="text-gray-400">Pilih PIC IT Support...</option>
            {PIC_LIST.map((name) => (
              <option key={name} value={name} className="text-gray-800 font-semibold">{name}</option>
            ))}
          </select>
        </div>

        {/* Keperluan */}
        <Input
          label="Keperluan"
          id="pre-keperluan"
          placeholder="Mis. Maintenance server, Pengecekan AC..."
          value={keperluan}
          onChange={(e) => setKeperluan(e.target.value)}
        />

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2.5">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Batal
          </Button>
          <Button type="submit" loading={saving} disabled={!namaOrang.trim() || !instansi.trim() || saving}>
            <UserPlus className="w-4 h-4 mr-1" /> Simpan Data Pengunjung
          </Button>
        </div>
      </form>
    </Modal>
  );
}
