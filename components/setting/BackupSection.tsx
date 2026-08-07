"use client";

import { useEffect, useState } from "react";
import { Database, Download, RefreshCw, CalendarCheck, FileText, CheckCircle2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { BackupFileInfo } from "@/lib/autoBackup";

export function BackupSection() {
  const [files, setFiles] = useState<BackupFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function fetchBackups() {
    setLoading(true);
    try {
      const res = await fetch("/api/backup");
      const data = await res.json();
      if (res.ok) {
        setFiles(data.files || []);
      }
    } catch {
      setError("Gagal memuat daftar backup.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBackups();
  }, []);

  async function handleManualBackup() {
    setBackingUp(true);
    setMsg("");
    setError("");
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Backup database berhasil dibuat: ${data.filename}`);
        await fetchBackups();
      } else {
        setError(data.error || "Gagal membuat backup.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setBackingUp(false);
    }
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle className="mb-2 flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" /> Backup Database Otomatis &amp; Dataset
        </CardTitle>
        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
          Sistem secara otomatis akan mencadangkan (*backup*) dataset database setiap 1 bulan sekali ke dalam folder <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded font-mono text-[11px]">backup_db/</code> di server host. Anda juga dapat memicu backup manual dan mengunduh berkasnya secara langsung di bawah ini.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <CalendarCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed">
            <p className="font-semibold text-blue-950">Status Auto-Backup Bulanan: <span className="text-green-700 font-bold">AKTIF</span></p>
            <p className="mt-0.5 text-blue-800">
              Setiap pergantian bulan, sistem otomatis mengekspor dataset tabel ke dalam format <code className="font-mono">.sql</code> dan <code className="font-mono">.json</code> di folder <code className="font-mono font-bold">backup_db/</code>.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" /> Riwayat Berkas Backup di Folder <code className="font-mono text-xs">backup_db/</code>
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchBackups} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={handleManualBackup} loading={backingUp}>
              <Database className="w-3.5 h-3.5" /> Backup Sekarang
            </Button>
          </div>
        </div>

        {msg && (
          <div className="p-3 mb-4 text-xs bg-green-50 text-green-800 border border-green-200 rounded-md flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> {msg}
          </div>
        )}
        {error && (
          <div className="p-3 mb-4 text-xs bg-red-50 text-red-800 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {files.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
            Belum ada berkas backup di folder <code className="font-mono">backup_db/</code>. Klik &quot;Backup Sekarang&quot; untuk membuat berkas backup pertama.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                  <th className="py-2.5 px-3">Nama Berkas</th>
                  <th className="py-2.5 px-3">Jenis</th>
                  <th className="py-2.5 px-3">Ukuran</th>
                  <th className="py-2.5 px-3">Waktu Dibuat</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {files.map((f) => (
                  <tr key={f.filename} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-gray-800">
                      {f.filename}
                    </td>
                    <td className="py-2.5 px-3">
                      {f.isMonthlyAuto ? (
                        <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-800 font-semibold rounded text-[10px]">
                          Otomatis Bulanan
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 font-medium rounded text-[10px]">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{formatBytes(f.size)}</td>
                    <td className="py-2.5 px-3 text-gray-600">{formatDate(f.createdAt)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <a
                        href={`/api/backup?download=${encodeURIComponent(f.filename)}`}
                        download
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-primary hover:text-primary-dark bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Unduh
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
