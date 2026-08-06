"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Camera,
  Upload,
  X,
  RefreshCw,
  ZoomIn,
  Clock,
  ImageIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// ── Convert Data URL ke Blob (100% handal di semua browser) ───────────────
function dataURLtoBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// ── Kompresi gambar: resize max 800px & JPEG quality 0.65 ─────────────────
function compressImage(dataUrl: string, maxWidth = 800, quality = 0.65): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ── Komponen viewfinder kamera ──────────────────────────────────────────────
function CameraViewfinder({
  stream,
  onCapture,
  onClose,
  onFlip,
}: {
  stream: MediaStream;
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  onFlip: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  async function handleCapture() {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const raw = canvas.toDataURL("image/jpeg", 1);
    const compressed = await compressImage(raw, 800, 0.65);
    onCapture(compressed);
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black select-none">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full object-cover"
        style={{ maxHeight: "260px", display: "block" }}
      />
      <canvas ref={captureCanvasRef} className="hidden" />

      {/* Overlay controls */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="border border-white/10" />
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-5 py-3 bg-gradient-to-t from-black/70 to-transparent">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full bg-white/20 hover:bg-white/35 text-white transition-colors"
          title="Tutup kamera"
        >
          <X className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleCapture}
          className="w-14 h-14 rounded-full bg-white/90 hover:bg-white border-4 border-white/40 shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center pointer-events-auto"
          title="Ambil foto"
        >
          <Camera className="w-6 h-6 text-gray-800" />
        </button>

        <button
          type="button"
          onClick={onFlip}
          className="p-2 rounded-full bg-white/20 hover:bg-white/35 text-white transition-colors"
          title="Balik kamera"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Tipe ─────────────────────────────────────────────────────────────────────
interface TambahLogModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (log: ServerLog) => void;
}

export interface ServerLog {
  id: string;
  namaOrang: string;
  instansi: string;
  namaPic: string;
  keperluan: string | null;
  jenisAkses: string;
  waktuAkses: string;
  waktuKeluar: string | null;
  fotoUrl: string | null;
  ttdUrl?: string | null;
  statusApproval: string;
  approvedBy: string | null;
  createdAt: string;
  pencatat: { id: string; nama: string; username: string };
  approver: { id: string; nama: string; username: string } | null;
}

type FotoMode = "idle" | "camera" | "preview";

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

export function TambahLogModal({ open, onClose, onSuccess }: TambahLogModalProps) {
  const [namaOrang, setNamaOrang] = useState("");
  const [instansi, setInstansi] = useState("");
  const [namaPic, setNamaPic] = useState("");
  const [keperluan, setKeperluan] = useState("");

  const [fotoMode, setFotoMode] = useState<FotoMode>("idle");
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      stopCamera();
    }
  }, [open]);

  function stopCamera() {
    setStream((prev) => {
      if (prev) prev.getTracks().forEach((t) => t.stop());
      return null;
    });
    setFotoMode((prev) => (prev === "camera" ? "idle" : prev));
  }

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    setCameraError(null);
    setStream((prev) => {
      if (prev) prev.getTracks().forEach((t) => t.stop());
      return null;
    });
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(s);
      setFotoMode("camera");
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError(
        "Kamera tidak dapat diakses di browser ini. Gunakan opsi 'Unggah Foto File'."
      );
    }
  }, []);

  function handleFlip() {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  }

  async function handleCapture(dataUrl: string) {
    setStream((prev) => {
      if (prev) prev.getTracks().forEach((t) => t.stop());
      return null;
    });
    setFotoPreview(dataUrl);
    setFotoMode("preview");
    await uploadDataUrl(dataUrl);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const dataUrl = evt.target?.result as string;
      if (!dataUrl) return;
      const compressed = await compressImage(dataUrl, 800, 0.65);
      setFotoPreview(compressed);
      setFotoMode("preview");
      await uploadDataUrl(compressed);
    };
    reader.readAsDataURL(file);
  }

  async function uploadDataUrl(dataUrl: string) {
    setUploading(true);
    try {
      const blob = dataURLtoBlob(dataUrl);
      const file = new File([blob], `log-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/server-log/upload", { method: "POST", body: fd });
      let data: Record<string, unknown> = {};
      try { data = await uploadRes.json(); } catch { data = {}; }
      if (uploadRes.ok && typeof data.url === "string") {
        setFotoUrl(data.url);
      } else {
        // Fallback langsung simpan Base64 dataUrl jika upload server bermasalah
        setFotoUrl(dataUrl);
      }
    } catch {
      // Fallback langsung simpan Base64 dataUrl
      setFotoUrl(dataUrl);
    } finally {
      setUploading(false);
    }
  }

  function removeFoto() {
    stopCamera();
    setFotoPreview(null);
    setFotoUrl(null);
    setFotoMode("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetForm() {
    setNamaOrang("");
    setInstansi("");
    setNamaPic("");
    setKeperluan("");
    setError(null);
    removeFoto();
  }

  function handleClose() { resetForm(); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!namaOrang.trim()) { setError("Nama orang wajib diisi."); return; }
    if (!instansi.trim()) { setError("Nama instansi wajib diisi."); return; }
    if (!namaPic.trim()) { setError("Nama PIC wajib diisi."); return; }
    if (!keperluan.trim()) { setError("Keperluan wajib diisi."); return; }
    if (!fotoUrl) { setError("Foto wajib diambil atau diunggah."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/server-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaOrang: namaOrang.trim(),
          instansi: instansi.trim(),
          namaPic: namaPic.trim(),
          keperluan: keperluan.trim() || null,
          fotoUrl,
        }),
      });
      let data: Record<string, unknown>;
      try { data = await res.json(); } catch {
        throw new Error("Respons server tidak valid. Coba refresh halaman.");
      }
      if (!res.ok) throw new Error((data.error as string) ?? "Gagal menyimpan.");
      onSuccess(data.log as ServerLog);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Tambah Log Akses Server"
      description="Catat siapa yang masuk ke ruang server. Waktu masuk terekam otomatis."
      size="md"
    >
      <div className="max-h-[72vh] overflow-y-auto pr-1">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Info Waktu Masuk Auto */}
          <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl border border-primary-100 text-primary">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-semibold">
              Waktu Masuk: Otomatis (Waktu Sekarang)
            </span>
          </div>

          {/* Nama Orang */}
          <Input
            label="Nama Orang"
            id="log-nama"
            required
            placeholder="Nama lengkap pengunjung / vendor"
            value={namaOrang}
            onChange={(e) => setNamaOrang(e.target.value)}
          />

          {/* Nama Instansi */}
          <Input
            label="Nama Instansi"
            id="log-instansi"
            required
            placeholder="Mis. Bank Nagari, PT. PLN, Vendor..."
            value={instansi}
            onChange={(e) => setInstansi(e.target.value)}
          />

          {/* Nama PIC */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="log-pic" className="text-xs font-semibold text-gray-700">
              Nama PIC Pendamping <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="log-pic"
                required
                value={namaPic}
                onChange={(e) => setNamaPic(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border border-gray-200 bg-white pl-3 pr-8 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                  backgroundPosition: "right 12px center",
                  backgroundSize: "14px",
                  backgroundRepeat: "no-repeat"
                }}
              >
                <option value="" disabled className="text-gray-400 font-medium">Pilih PIC IT Support...</option>
                {PIC_LIST.map((name) => (
                  <option key={name} value={name} className="text-gray-800 font-semibold">{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Keperluan */}
          <Input
            label="Keperluan"
            id="log-keperluan"
            required
            placeholder="Mis. Maintenance server, Pengecekan AC..."
            value={keperluan}
            onChange={(e) => setKeperluan(e.target.value)}
          />

          {/* ── Foto / Kamera / Upload File ───────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1.5">
              Foto Pengunjung <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal text-xs ml-1">(wajib)</span>
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            <AnimatePresence mode="wait">
              {fotoMode === "idle" && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="space-y-2"
                >
                  {cameraError && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                      {cameraError}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode)}
                      className="flex flex-col items-center justify-center gap-1.5 p-4 border-2 border-dashed border-primary/40 bg-primary-50/40 rounded-xl text-primary hover:border-primary hover:bg-primary-50 transition-all"
                    >
                      <Camera className="w-6 h-6" />
                      <span className="text-xs font-semibold">Buka Kamera</span>
                      <span className="text-[10px] text-primary/60">Foto langsung webcam/HP</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-1.5 p-4 border-2 border-dashed border-gray-300 bg-gray-50/70 rounded-xl text-gray-700 hover:border-gray-400 hover:bg-gray-100 transition-all"
                    >
                      <ImageIcon className="w-6 h-6 text-gray-500" />
                      <span className="text-xs font-semibold">Unggah File</span>
                      <span className="text-[10px] text-gray-400">Pilih dari Galeri/PC</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {fotoMode === "camera" && stream && (
                <motion.div
                  key="camera"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <CameraViewfinder
                    stream={stream}
                    onCapture={handleCapture}
                    onClose={stopCamera}
                    onFlip={handleFlip}
                  />
                  <p className="text-center text-xs text-gray-400 mt-1.5">
                    Posisikan kamera lalu tekan tombol bulat
                  </p>
                </motion.div>
              )}

              {fotoMode === "preview" && fotoPreview && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative rounded-xl overflow-hidden border border-gray-200 bg-black/5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fotoPreview}
                    alt="Preview Foto"
                    className="w-full object-cover rounded-xl"
                    style={{ maxHeight: "220px" }}
                  />
                  {uploading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-gray-700 font-semibold">Mengompresi &amp; mengunggah foto...</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={removeFoto}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow hover:bg-white transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-700" />
                  </button>
                  {!uploading && fotoUrl && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-green-600/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow">
                      <ZoomIn className="w-3.5 h-3.5" /> Foto tersimpan &amp; terverifikasi
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 pb-1">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Batal
            </Button>
            <Button
              type="submit"
              loading={saving || uploading}
              disabled={!namaOrang.trim() || !instansi.trim() || !namaPic.trim() || !keperluan.trim() || !fotoUrl || saving || uploading}
            >
              <Upload className="w-4 h-4" />
              Simpan Log
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
