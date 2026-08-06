"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Check, RefreshCw, Clock, UserCheck, ShieldCheck, FileCheck, ArrowRight, Building2, User, KeyRound, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PreRegisteredLog {
  id: string;
  namaOrang: string;
  instansi: string;
  keperluan: string | null;
  createdAt: string;
  pencatat: { nama: string };
}

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

export default function AuthServerPage() {
  const [preRegisteredList, setPreRegisteredList] = useState<PreRegisteredLog[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<PreRegisteredLog | null>(null);

  // State Kamera (Auto-Start Kamera Depan / Selfie Mode)
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // State Tanda Tangan
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigContainerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [ttdUrl, setTtdUrl] = useState<string | null>(null);

  // Submitting state & Modal Sukses
  const [submitting, setSubmitting] = useState(false);
  const [completedName, setCompletedName] = useState<string | null>(null);
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

  const fetchPreRegistered = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/server-log/kiosk", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPreRegisteredList(data.items ?? []);
      }
    } catch {
      // ignore
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

  // Handle Kamera (Langsung Kamera Depan / Selfie Mode di Tablet/HP, atau Webcam di Komputer)
  const startCamera = useCallback(async (facing: "user" | "environment" = "user") => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      let s: MediaStream | null = null;

      // 1. Utamakan facingMode "user" langsung tanpa constraint resolusi agar Chrome/Safari di HP/Tablet langsung memilih kamera depan
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
      } catch {
        // 2. Coba paksa exact facingMode jika didukung peranti
        try {
          s = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: facing } },
            audio: false,
          });
        } catch {
          // 3. Fallback umum untuk webcam komputer / peranti umum
          s = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      streamRef.current = s;
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError("Kamera tidak dapat diakses. Pastikan perizinan kamera pada peranti tablet/browser aktif.");
    }
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStream(null);
  }

  // Auto-Start Kamera Depan (Selfie Mode) langsung saat halaman dibuka / foto di-reset
  useEffect(() => {
    if (!fotoUrl) {
      startCamera(facingMode);
    }
  }, [fotoUrl, facingMode, startCamera]);

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
    setErrorMsg(null);
  }

  // Handle Responsif Canvas Tanda Tangan untuk Tablet / Pad
  const setupCanvas = useCallback(() => {
    const canvas = sigCanvasRef.current;
    const container = sigContainerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width > 0) {
      canvas.width = rect.width;
      canvas.height = 180;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#0f172a";
      }
    }
  }, []);

  useEffect(() => {
    setupCanvas();
    window.addEventListener("resize", setupCanvas);
    return () => window.removeEventListener("resize", setupCanvas);
  }, [setupCanvas]);

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
    if ("touches" in e) {
      e.preventDefault();
    }
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
    if ("touches" in e) {
      e.preventDefault();
    }
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
    setErrorMsg(null);
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

  function handleResetAll() {
    setSelectedId("");
    setSelectedLog(null);
    setFotoUrl(null);
    clearSignature();
    setErrorMsg(null);
    startCamera("user");
  }

  async function handleSubmitCheckIn() {
    if (!selectedId) {
      setErrorMsg("Pilih nama/instansi Anda dari daftar pencatatan supervisi terlebih dahulu.");
      return;
    }
    if (!fotoUrl) {
      setErrorMsg("Kamera (foto) dan tanda tangan digital bersifat WAJIB untuk melakukan check-in!");
      return;
    }
    if (!ttdUrl && !hasSignature) {
      setErrorMsg("Kamera (foto) dan tanda tangan digital bersifat WAJIB untuk melakukan check-in!");
      return;
    }

    const canvas = sigCanvasRef.current;
    const finalTtdUrl = ttdUrl || (canvas ? canvas.toDataURL("image/png") : null);

    setSubmitting(true);
    setErrorMsg(null);

    const guestName = selectedLog?.namaOrang || "Pengunjung";

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

      setCompletedName(guestName);
      handleResetAll();
      await fetchPreRegistered();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan koneksi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Header Stabil Sesuai Ukuran Tablet/Pad (Tanpa Deskripsi di Bawah Judul) */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between shadow-xs sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-bank-nagari.png" alt="Logo Bank Nagari" className="h-9 sm:h-10 object-contain" />
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            AUTH SERVER <span className="text-[10px] sm:text-xs bg-primary-50 text-primary border border-primary-100 px-2.5 py-0.5 rounded-full font-bold">PORT 3000 DEVICE</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
            <Clock className="w-4 h-4 text-primary" />
            <span>{timeStr}</span>
          </div>
          <button
            onClick={fetchPreRegistered}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl text-slate-700 transition-all border border-slate-200 cursor-pointer"
            title="Refresh Daftar Tamu"
          >
            <RefreshCw className={`w-4 h-4 ${loadingList ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </header>

      {/* Main Layout Responsive Tablet / Pad Screen Dimensions */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        
        {/* KOLOM KIRI: STEP 1 — Pilih Tamu Terdaftar */}
        <div className="md:col-span-1 lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary font-bold flex items-center justify-center border border-primary-100 text-sm">
                1
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">Pilih Tamu Terdaftar</h2>
            </div>

            {loadingList ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs">Memuat data dari Supervisi...</span>
              </div>
            ) : preRegisteredList.length === 0 ? (
              <div className="py-10 px-4 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-slate-500 space-y-2">
                <ShieldCheck className="w-10 h-10 mx-auto text-slate-400" />
                <p className="text-sm font-semibold text-slate-700">Belum Ada Tamu Terdaftar</p>
                <p className="text-xs text-slate-500">Minta Supervisi untuk mendaftarkan nama &amp; instansi Anda sebelum melakukan check-in.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] md:max-h-[420px] overflow-y-auto pr-1">
                {preRegisteredList.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-primary-50 border-primary text-slate-900 shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                          <User className="w-4 h-4 text-primary shrink-0" />
                          <span>{item.namaOrang}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.instansi}</span>
                        </div>
                        {item.keperluan && (
                          <div className="text-[11px] text-slate-500">
                            Keperluan: <span className="text-slate-700">{item.keperluan}</span>
                          </div>
                        )}
                      </div>

                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                        isSelected ? "border-primary bg-primary text-white" : "border-slate-300 bg-white"
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rincian Pilihan Tamu */}
          {selectedLog && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-primary-200 rounded-2xl p-4 space-y-2 text-xs shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" /> Data Tamu Terverifikasi
                </span>
                <span className="text-[10px] text-slate-400">Pencatat: {selectedLog.pencatat.nama}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700">
                <div>
                  <span className="text-slate-400 text-[10px] block">Nama Tamu:</span>
                  <span className="font-bold text-slate-900">{selectedLog.namaOrang}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Instansi:</span>
                  <span className="font-bold text-slate-900">{selectedLog.instansi}</span>
                </div>
                {selectedLog.keperluan && (
                  <div className="col-span-2">
                    <span className="text-slate-400 text-[10px] block">Keperluan:</span>
                    <span className="font-medium text-slate-700 truncate block">{selectedLog.keperluan}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* KOLOM KANAN: STEP 2 — Kamera & STEP 3 — Tanda Tangan Digital */}
        <div className="md:col-span-1 lg:col-span-7 space-y-4">
          
          {/* STEP 2: Kamera Pengunjung (Kamera Bersifat WAJIB & Auto-Start Live Stream Selfie) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary font-bold flex items-center justify-center border border-primary-100 text-sm">
                  2
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">Foto Pengunjung (Kamera Device)</h2>
              </div>
              
              {/* Badge Status Wajib Foto (Terletak di Sebelah Kanan Card Header) */}
              {fotoUrl ? (
                <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Foto Terambil (WAJIB)
                </span>
              ) : (
                <span className="text-xs text-red-600 font-bold bg-red-50 border border-red-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> WAJIB FOTO
                </span>
              )}
            </div>

            {/* Jendela Kamera / Preview Live Selfie Stream */}
            <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 min-h-[200px] sm:min-h-[220px] flex items-center justify-center">
              {fotoUrl ? (
                <div className="relative w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fotoUrl} alt="Foto Pengunjung" className="w-full max-h-[260px] object-cover rounded-xl" />
                  <button
                    onClick={() => {
                      setFotoUrl(null);
                      startCamera(facingMode);
                    }}
                    className="absolute top-3 right-3 bg-white/90 hover:bg-white text-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold shadow border border-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Foto Ulang
                  </button>
                </div>
              ) : (
                <div className="relative w-full">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-[260px] object-cover rounded-xl" />
                  <canvas ref={captureCanvasRef} className="hidden" />
                  
                  {cameraError && (
                    <div className="absolute top-3 inset-x-3 bg-red-600/90 text-white p-2 rounded-lg text-xs text-center font-semibold">
                      {cameraError}
                    </div>
                  )}

                  <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
                    <button
                      onClick={handleFlipCamera}
                      className="p-2.5 bg-white/90 text-slate-800 rounded-full border border-slate-200 hover:bg-white shadow cursor-pointer"
                      title="Balik Kamera"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCapturePhoto}
                      className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-full shadow-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" /> Jepret Foto
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STEP 3: Tanda Tangan Digital (Signature Pad Bersifat WAJIB & Fit Tablet Pad Screen) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary font-bold flex items-center justify-center border border-primary-100 text-sm">
                  3
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">Tanda Tangan Digital (Signature Pad)</h2>
              </div>

              {/* Badge Status Wajib Tanda Tangan (Disebelahkan di Kanan Sejajar Dengan Foto Terambil) */}
              {hasSignature ? (
                <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Signature Dibubuhkan (WAJIB)
                </span>
              ) : (
                <span className="text-xs text-red-600 font-bold bg-red-50 border border-red-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> WAJIB TANDA TANGAN
                </span>
              )}
            </div>

            {/* Area Canvas Tanda Tangan (Dengan Tombol "Tanda Tangan Ulang" di Pojok Kanan Atas Dalam Canvas) */}
            <div ref={sigContainerRef} className="relative rounded-xl overflow-hidden bg-white border-2 border-slate-200 shadow-inner flex items-center justify-center w-full">
              {hasSignature && (
                <button
                  type="button"
                  onClick={clearSignature}
                  className="absolute top-3 right-3 bg-white/90 hover:bg-white active:bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold shadow border border-slate-200 flex items-center gap-1.5 cursor-pointer z-10"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Tanda Tangan Ulang
                </button>
              )}
              
              <canvas
                ref={sigCanvasRef}
                height={180}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-[180px] cursor-crosshair touch-none bg-white"
              />
              {!hasSignature && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs font-semibold italic opacity-40">
                  Coretan Tanda Tangan Di Sini...
                </div>
              )}
            </div>
          </div>

          {/* Alert Message jika syarat Kamera/Signature belum lengkap */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Submit Check-In (Hanya Aktif Jika Foto & Tanda Tangan SUDAH Lengkap) */}
          <div className="pt-2">
            <button
              onClick={handleSubmitCheckIn}
              disabled={submitting || !selectedId || !fotoUrl || !hasSignature}
              className="w-full py-4 bg-primary hover:bg-primary-dark active:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
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

      {/* Success Notification Modal (Hanya Ditutup Saat User Menekan Tombol Selesai) */}
      <AnimatePresence>
        {completedName && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
              <div className="w-16 h-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto border border-green-200 shadow-inner">
                <KeyRound className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 leading-tight">
                Selamat Datang,<br />
                <span className="text-primary text-3xl font-black">{completedName}</span>
              </h3>
              <p className="text-xs text-slate-600">Akses masuk ruang server Anda telah berhasil dicatat.</p>
              <p className="text-[11px] text-slate-400">Waktu masuk &amp; bukti verifikasi foto + tanda tangan terekam pada log server.</p>
              <button
                onClick={() => setCompletedName(null)}
                className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md"
              >
                Selesai
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
