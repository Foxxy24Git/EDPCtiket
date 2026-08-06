"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Check, RefreshCw, Trash2, Clock, UserCheck, ShieldCheck, FileCheck, ArrowRight, Building2, User, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PreRegisteredLog {
  id: string;
  namaOrang: string;
  instansi: string;
  namaPic: string;
  keperluan: string | null;
  createdAt: string;
  pencatat: { nama: string };
}

// ── Kompresi Gambar untuk Kiosk ──────────────────────────────────────────
function compressDataUrl(dataUrl: string, maxWidth = 800, quality = 0.65): Promise<string> {
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

export default function LogServerKioskPage() {
  const [preRegisteredList, setPreRegisteredList] = useState<PreRegisteredLog[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<PreRegisteredLog | null>(null);

  // State Kamera
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("user");
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);

  // State Tanda Tangan
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [ttdUrl, setTtdUrl] = useState<string | null>(null);

  // Submitting state
  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clock state
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch daftar pre-registered logs
  const fetchPreRegistered = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/server-log/kiosk", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPreRegisteredList(data.items ?? []);
      }
    } catch {
      // ignore error
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchPreRegistered();
  }, [fetchPreRegistered]);

  useEffect(() => {
    if (selectedId) {
      const found = preRegisteredList.find((item) => item.id === selectedId);
      setSelectedLog(found ?? null);
    } else {
      setSelectedLog(null);
    }
  }, [selectedId, preRegisteredList]);

  // Handle Kamera
  const startCamera = useCallback(async (facing: "user" | "environment") => {
    setCameraError(null);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(s);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError("Kamera tidak dapat diakses di device ini. Pastikan izin kamera aktif.");
    }
  }, [stream]);

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setStream(null);
    setCameraActive(false);
  }

  function handleFlipCamera() {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    startCamera(next);
  }

  async function handleCapturePhoto() {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const raw = canvas.toDataURL("image/jpeg", 0.9);
    const compressed = await compressDataUrl(raw, 800, 0.65);
    setFotoUrl(compressed);
    stopCamera();
  }

  // Handle Tanda Tangan Canvas
  useEffect(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b";
  }, []);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = sigCanvasRef.current;
    if (canvas && hasSignature) {
      setTtdUrl(canvas.toDataURL("image/png"));
    }
  };

  function clearSignature() {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setTtdUrl(null);
  }

  // Handle Reset Form
  function handleResetAll() {
    setSelectedId("");
    setSelectedLog(null);
    setFotoUrl(null);
    stopCamera();
    clearSignature();
    setErrorMsg(null);
  }

  // Submit Check-in Kiosk
  async function handleSubmitCheckIn() {
    if (!selectedId) {
      setErrorMsg("Pilih nama/instansi Anda dari daftar pencatatan supervisi terlebih dahulu.");
      return;
    }
    if (!fotoUrl) {
      setErrorMsg("Ambil foto kehadiran Anda menggunakan kamera terlebih dahulu.");
      return;
    }
    if (!ttdUrl && !hasSignature) {
      setErrorMsg("Bubuhkan tanda tangan digital Anda pada area yang telah disediakan.");
      return;
    }

    const canvas = sigCanvasRef.current;
    const finalTtdUrl = ttdUrl || (canvas ? canvas.toDataURL("image/png") : null);

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/server-log/kiosk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedId,
          fotoUrl,
          ttdUrl: finalTtdUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Gagal melakukan check-in.");
      }

      setSuccessToast(`Check-in Berhasil! Selamat Datang ${selectedLog?.namaOrang || ""}`);
      handleResetAll();
      await fetchPreRegistered();

      setTimeout(() => {
        setSuccessToast(null);
      }, 5000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan koneksi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Navigation Header */}
      <header className="bg-slate-900/80 border-b border-slate-800 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-bank-nagari.png" alt="Logo Bank Nagari" className="h-10 object-contain bg-white/90 p-1.5 rounded-lg" />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              SERVER ACCESS KIOSK <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">PORT 3001 STANDALONE</span>
            </h1>
            <p className="text-xs text-slate-400">Pencatatan Tamu &amp; Verifikasi Foto + Tanda Tangan Akses Ruang Server</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>{timeStr}</span>
          </div>
          <button
            onClick={fetchPreRegistered}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl text-slate-300 transition-all border border-slate-700"
            title="Refresh Daftar Tamu"
          >
            <RefreshCw className={`w-4 h-4 ${loadingList ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </header>

      {/* Main Kiosk Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* KOLOM KIRI (7 Kolom): STEP 1 — Pilih Tamu Terdaftar Supervisi */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2.5 mb-4 border-b border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center border border-emerald-500/30 text-sm">
                1
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Pilih Tamu Terdaftar</h2>
                <p className="text-xs text-slate-400">Pilih nama/instansi Anda berdasarkan pencatatan Supervisi</p>
              </div>
            </div>

            {loadingList ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                <span className="text-xs">Memuat daftar dari Supervisi...</span>
              </div>
            ) : preRegisteredList.length === 0 ? (
              <div className="py-10 px-4 text-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-slate-400 space-y-2">
                <ShieldCheck className="w-10 h-10 mx-auto text-slate-500" />
                <p className="text-sm font-semibold text-slate-300">Belum Ada Tamu Terdaftar</p>
                <p className="text-xs text-slate-500">Minta Supervisi untuk mendaftarkan nama &amp; instansi Anda di sistem sebelum melakukan check-in.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {preRegisteredList.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-950/20"
                          : "bg-slate-800/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/70"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-sm text-white">
                          <User className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{item.namaOrang}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{item.instansi}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          PIC: <span className="text-slate-300 font-medium">{item.namaPic}</span> | Keperluan: <span className="text-slate-400">{item.keperluan || "-"}</span>
                        </div>
                      </div>

                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                        isSelected ? "border-emerald-500 bg-emerald-500 text-slate-950" : "border-slate-700 bg-slate-900"
                      }`}>
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rincian Pilihan Tamu */}
          {selectedLog && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" /> Data Tamu Terverifikasi
                </span>
                <span className="text-[10px] text-slate-400">Didaftarkan oleh: {selectedLog.pencatat.nama}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-slate-300">
                <div>
                  <span className="text-slate-500 text-[10px] block">Nama Tamu:</span>
                  <span className="font-bold text-white">{selectedLog.namaOrang}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Instansi:</span>
                  <span className="font-bold text-white">{selectedLog.instansi}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">PIC Pendamping:</span>
                  <span className="font-bold text-white">{selectedLog.namaPic}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Keperluan:</span>
                  <span className="font-medium text-slate-300 truncate block">{selectedLog.keperluan || "-"}</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* KOLOM KANAN (7 Kolom): STEP 2 — Kamera & STEP 3 — Tanda Tangan Digital */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* STEP 2: Kamera Pengunjung */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center border border-blue-500/30 text-sm">
                  2
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Foto Pengunjung (Kamera Device)</h2>
                  <p className="text-xs text-slate-400">Ambil foto kehadiran langsung melalui webcam/kamera tablet</p>
                </div>
              </div>
              {fotoUrl && (
                <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Foto Siap
                </span>
              )}
            </div>

            {/* Jendela Kamera / Preview */}
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[220px] flex items-center justify-center">
              {fotoUrl ? (
                <div className="relative w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fotoUrl} alt="Foto Pengunjung" className="w-full max-h-[260px] object-cover rounded-xl" />
                  <button
                    onClick={() => {
                      setFotoUrl(null);
                      startCamera(facingMode);
                    }}
                    className="absolute top-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md border border-slate-700 flex items-center gap-1.5 shadow"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Foto Ulang
                  </button>
                </div>
              ) : cameraActive ? (
                <div className="relative w-full">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-[260px] object-cover rounded-xl" />
                  <canvas ref={captureCanvasRef} className="hidden" />
                  <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
                    <button
                      onClick={handleFlipCamera}
                      className="p-2.5 bg-slate-900/80 text-white rounded-full border border-slate-700 hover:bg-slate-800"
                      title="Balik Kamera"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCapturePhoto}
                      className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-xs rounded-full shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" /> Jepret Foto
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                  <Camera className="w-10 h-10 text-slate-600" />
                  {cameraError ? (
                    <p className="text-xs text-rose-400 max-w-xs">{cameraError}</p>
                  ) : (
                    <p className="text-xs text-slate-400 max-w-xs">Tekan tombol di bawah untuk mengaktifkan kamera device.</p>
                  )}
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl border border-blue-500 shadow-md flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" /> Buka Kamera
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* STEP 3: Tanda Tangan Digital */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center border border-purple-500/30 text-sm">
                  3
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Tanda Tangan Digital (Signature Pad)</h2>
                  <p className="text-xs text-slate-400">Gunakan jari, stylus, atau mouse untuk membubuhkan tanda tangan Anda</p>
                </div>
              </div>
              {hasSignature && (
                <button
                  onClick={clearSignature}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-full"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus / Signature Ulang
                </button>
              )}
            </div>

            {/* Area Canvas Tanda Tangan */}
            <div className="relative rounded-xl overflow-hidden bg-white border-2 border-slate-700 shadow-inner flex items-center justify-center">
              <canvas
                ref={sigCanvasRef}
                width={600}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-[160px] cursor-crosshair touch-none"
              />
              {!hasSignature && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs font-semibold italic opacity-40">
                  Coretan Tanda Tangan Di Sini...
                </div>
              )}
            </div>
          </div>

          {/* Alert Message */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Action Submit Check-In */}
          <div className="pt-2">
            <button
              onClick={handleSubmitCheckIn}
              disabled={submitting || !selectedId || !fotoUrl || !hasSignature}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-2xl shadow-xl shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> Menyimpan Check-In...
                </>
              ) : (
                <>
                  <FileCheck className="w-5 h-5" /> Simpan Akses Server <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>

        </div>
      </main>

      {/* Success Notification Modal */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30 shadow-inner">
                <KeyRound className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Akses Berhasil Dicatat!</h3>
              <p className="text-xs text-slate-300">{successToast}</p>
              <p className="text-[11px] text-slate-500">Waktu masuk &amp; bukti verifikasi terekam pada server log.</p>
              <button
                onClick={() => setSuccessToast(null)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
              >
                Selesai / Kembali ke Menu Utama
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
