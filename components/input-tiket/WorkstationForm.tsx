"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, TicketPlus, Monitor, CreditCard, Laptop, Cpu, Server, Tv } from "lucide-react";
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

const MEREK_KOMPUTER_LIST = ["Lenovo", "HP", "Dell", "Acer", "Asus", "Apple", "Fujitsu", "Lainnya (Ketik Manual)"];

type CpTipe = "pic" | "wag";
type JenisPerangkat = "komputer" | "edc";
type TipeKomputer = "aio" | "desktop" | "laptop" | "mini_pc";
interface WorkstationFormProps {
  onSuccess?: () => void;
}

export function WorkstationForm({ onSuccess }: WorkstationFormProps) {
  const [daftarCabang, setDaftarCabang] = useState<string[]>([]);
  const [merekKomputerList, setMerekKomputerList] = useState<string[]>(MEREK_KOMPUTER_LIST);
  const [merekEdcList, setMerekEdcList] = useState<string[]>(["Ingenico", "Verifone", "Pax", "Sunmi", "MoreFun", "Castle", "Lainnya (Ketik Manual)"]);

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
          setMerekKomputerList([...data.merekKomputer, "Lainnya (Ketik Manual)"]);
        }
        if (data.merekEdc && Array.isArray(data.merekEdc)) {
          setMerekEdcList([...data.merekEdc, "Lainnya (Ketik Manual)"]);
        }
      })
      .catch((err) => console.error("Gagal memuat master options:", err));
  }, []);

  // Perangkat & Merek
  const [jenisPerangkat, setJenisPerangkat] = useState<JenisPerangkat>("komputer");
  const [tipeKomputer, setTipeKomputer] = useState<TipeKomputer>("aio");
  const [merekPilihan, setMerekPilihan] = useState("");
  const [merekCustom, setMerekCustom] = useState("");

  // Input Awal Workstation
  const [wsCabang, setWsCabang] = useState("");
  const [wsTanggalMasuk, setWsTanggalMasuk] = useState("");
  const [wsNoSurat, setWsNoSurat] = useState("");
  const [wsCapem, setWsCapem] = useState("");
  const [wsKelengkapan, setWsKelengkapan] = useState("");
  const [wsSnKomputer, setWsSnKomputer] = useState("");
  const [wsKerusakan, setWsKerusakan] = useState("");

  // Field Tiket/CP & Kegiatan
  const [cpTipe] = useState<CpTipe>("pic");
  const [cpNama, setCpNama] = useState("");
  const [cpTelp, setCpTelp] = useState("");
  const [kegiatan, setKegiatan] = useState("Menerima Komputer");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<string | null>(null);

  function resetForm() {
    setJenisPerangkat("komputer");
    setTipeKomputer("aio");
    setMerekPilihan("");
    setMerekCustom("");
    setWsCabang("");
    setWsTanggalMasuk("");
    setWsNoSurat("");
    setWsCapem("");
    setWsKelengkapan("");
    setWsSnKomputer("");
    setWsKerusakan("");
    setCpNama("");
    setCpTelp("");
    setKegiatan("Menerima Komputer");
    setError("");
  }

  // Hitung Merek Komputer final string
  function getFormattedMerek(): string {
    const brand = merekPilihan === "Lainnya (Ketik Manual)" ? merekCustom.trim() : merekPilihan.trim();
    if (jenisPerangkat === "edc") {
      return "[EDC]";
    }
    const tipeLabel =
      tipeKomputer === "aio"
        ? "AIO"
        : tipeKomputer === "desktop"
        ? "Desktop"
        : tipeKomputer === "laptop"
        ? "Laptop"
        : "Mini PC";
    return brand ? `[Komputer - ${tipeLabel}] ${brand}` : `[Komputer - ${tipeLabel}]`;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const formattedMerek = getFormattedMerek();

    // Validasi input wajib
    if (!wsCabang) return setError("Cabang wajib dipilih.");
    if (!wsTanggalMasuk) return setError("Tanggal Masuk wajib diisi.");
    if (!wsNoSurat.trim()) return setError("Nomor Surat wajib diisi.");
    if (jenisPerangkat === "komputer") {
      if (!merekPilihan) return setError("Merek komputer wajib dipilih.");
      if (merekPilihan === "Lainnya (Ketik Manual)" && !merekCustom.trim()) {
        return setError("Nama merek manual wajib diisi.");
      }
    }
    if (!wsKelengkapan.trim()) return setError("Kelengkapan wajib diisi.");
    if (!wsSnKomputer.trim()) return setError("SN Komputer / EDC wajib diisi.");
    if (!wsKerusakan.trim()) return setError("Kerusakan wajib diisi.");

    if (cpTipe === "pic" && (!cpNama.trim() || !cpTelp.trim()))
      return setError("No PIC wajib mengisi nama dan nomor telepon.");
    if (cpTipe === "wag" && !cpNama.trim()) return setError("Nama WAG wajib diisi.");
    if (!kegiatan.trim()) return setError("Kegiatan penanganan pertama wajib diisi.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kategori: "workstation",
          wsCabang,
          wsTanggalMasuk,
          wsNoSurat,
          wsMerekKomputer: formattedMerek,
          wsCapem: wsCapem.trim() || undefined,
          wsKelengkapan,
          wsSnKomputer,
          wsKerusakan,
          cpTipe,
          cpNama,
          cpTelp: cpTipe === "pic" ? cpTelp : "",
          kegiatan,
        }),
      });
      let data: { error?: string; item?: { noTiket?: string } } = {};
      try {
        data = await res.json();
      } catch {
        // ignore JSON parse error
      }

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
            Tiket Workstation berhasil dibuat dengan nomor seri tiket:
            <span className="block mt-2 font-bold font-mono text-xl text-green-700 bg-green-50 px-3 py-1.5 rounded-md border border-green-100">{created}</span>
          </p>
          <Button onClick={() => setCreated(null)} className="w-full">
            Tutup &amp; Buat Tiket Lain
          </Button>
        </div>
      </Modal>

      <Card padding="lg">
        <form onSubmit={submit} className="space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-base font-semibold text-gray-900">1. Data Perangkat &amp; Workstation</h2>
            <p className="text-xs text-gray-500">Pilih jenis perangkat lalu lengkapi detail kerusakan.</p>
          </div>

          {/* ── PILIH JENIS PERANGKAT: KOMPUTER VS EDC ── */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">
              Jenis Perangkat <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setJenisPerangkat("komputer");
                  setMerekPilihan("");
                  setKegiatan("Menerima Komputer");
                }}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                  jenisPerangkat === "komputer"
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-gray-200 hover:border-gray-300 text-gray-600 bg-white"
                }`}
              >
                <div className={`p-2 rounded-lg ${jenisPerangkat === "komputer" ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}>
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Komputer</p>
                  <p className="text-[11px] text-gray-400">Desktop, Laptop, AIO, Mini PC</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setJenisPerangkat("edc");
                  setMerekPilihan("");
                  setKegiatan("Menerima EDC");
                }}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                  jenisPerangkat === "edc"
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-gray-200 hover:border-gray-300 text-gray-600 bg-white"
                }`}
              >
                <div className={`p-2 rounded-lg ${jenisPerangkat === "edc" ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Mesin EDC</p>
                  <p className="text-[11px] text-gray-400">Electronic Data Capture Merchant</p>
                </div>
              </button>
            </div>
          </div>

          {/* ── PILIH SUB-TIPE KOMPUTER (Hanya jika Komputer) ── */}
          {jenisPerangkat === "komputer" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2 pt-1"
            >
              <label className="text-sm font-semibold text-gray-800">
                Tipe Komputer <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "aio", label: "AIO (All-in-One)", Icon: Tv },
                  { id: "desktop", label: "Desktop PC", Icon: Cpu },
                  { id: "laptop", label: "Laptop", Icon: Laptop },
                  { id: "mini_pc", label: "Mini PC", Icon: Server },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTipeKomputer(item.id as TipeKomputer)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      tipeKomputer === item.id
                        ? "border-primary bg-primary-50 text-primary font-bold shadow-sm"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <item.Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Cabang & Tanggal Masuk */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Cabang"
              required
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

            <div className="flex flex-col gap-1">
              <label htmlFor="ws-tanggal-masuk" className="text-sm font-medium text-gray-700">
                Tanggal Masuk <span className="text-red-500">*</span>
              </label>
              <input
                id="ws-tanggal-masuk"
                type="datetime-local"
                required
                value={wsTanggalMasuk}
                onChange={(e) => setWsTanggalMasuk(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nomor Surat"
              required
              value={wsNoSurat}
              onChange={(e) => setWsNoSurat(e.target.value)}
              placeholder="cth: SR/00/XX/XXX/00-2026"
            />

            {/* Merek Select (Hanya untuk Komputer) */}
            {jenisPerangkat === "komputer" && (
              <div className="flex flex-col gap-1">
                <Select
                  label="Merek Komputer"
                  required
                  value={merekPilihan}
                  onChange={(e) => setMerekPilihan(e.target.value)}
                >
                  <option value="">— Pilih Merek —</option>
                  {merekKomputerList.map((merek) => (
                    <option key={merek} value={merek}>
                      {merek}
                    </option>
                  ))}
                </Select>

                {merekPilihan === "Lainnya (Ketik Manual)" && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1">
                    <Input
                      label=""
                      required
                      placeholder="Tuliskan nama merek perangkat..."
                      value={merekCustom}
                      onChange={(e) => setMerekCustom(e.target.value)}
                    />
                  </motion.div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Cabang Pembantu / Capem (opsional)"
              value={wsCapem}
              onChange={(e) => setWsCapem(e.target.value)}
              placeholder="cth: UNAND, dsb"
            />
            <Input
              label="Kelengkapan"
              required
              value={wsKelengkapan}
              onChange={(e) => setWsKelengkapan(e.target.value)}
              placeholder="cth: Adaptor, kabel, dus, dsb"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={`SN ${jenisPerangkat === "komputer" ? "Komputer" : "EDC"}`}
              required
              value={wsSnKomputer}
              onChange={(e) => setWsSnKomputer(e.target.value)}
              placeholder="Nomor seri mesin / perangkat..."
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="ws-kerusakan" className="text-sm font-medium text-gray-700">
              Kerusakan <span className="text-red-500">*</span>
            </label>
            <textarea
              id="ws-kerusakan"
              required
              rows={2}
              value={wsKerusakan}
              onChange={(e) => setWsKerusakan(e.target.value)}
              placeholder="Jelaskan detail kerusakan komputer / EDC..."
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
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
