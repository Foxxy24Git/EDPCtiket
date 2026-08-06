"use client";

import { cn } from "@/lib/cn";
import { type Role } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { Bell, ChevronDown, LogOut, User2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Super Admin",
  user: "Petugas IT Support",
  supervisi: "Supervisi",
};

export interface SessionUser {
  nama: string;
  username: string;
  role: Role;
  fotoProfilUrl?: string | null;
}

export function Topbar({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [activeCount, setActiveCount] = useState(0);

  async function handleLogout() {
    setDropdownOpen(false);
    // Hanya periksa jika user adalah petugas IT Support atau Super Admin (yang mencatat log)
    if (user.role !== "supervisi") {
      try {
        const res = await fetch("/api/server-log/active-count", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.activeCount > 0) {
            setActiveCount(data.activeCount);
            setShowWarningModal(true);
            return;
          }
        }
      } catch (err) {
        console.error("Gagal memeriksa log aktif:", err);
      }
    }
    await executeLogout();
  }

  async function executeLogout() {
    setLoggingOut(true);
    setShowWarningModal(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-20 flex items-center justify-between",
        "px-6 bg-surface-muted/95 backdrop-blur-md border-b border-gray-200/80 shadow-2xs"
      )}
      style={{
        left: "var(--sidebar-width)",
        height: "var(--topbar-height)",
      }}
    >
      {/* Kiri: judul sistem */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xs text-gray-400 font-medium">Sistem Monitoring</p>
          <p className="text-sm font-semibold text-gray-900">
            Workstation Bank Nagari
          </p>
        </div>
      </div>

      {/* Kanan: notif + profil */}
      <div className="flex items-center gap-3">
        <button
          aria-label="Notifikasi"
          className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            aria-label="Menu akun"
            aria-expanded={dropdownOpen}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 overflow-hidden">
              {user.fotoProfilUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.fotoProfilUrl}
                  alt={user.nama}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User2 className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-800 leading-tight">
                {user.nama}
              </p>
              <p className="text-xs text-gray-400 leading-tight">
                @{user.username}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-gray-400 transition-transform duration-200",
                dropdownOpen && "rotate-180"
              )}
            />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-card-lg border border-gray-100 z-20 overflow-hidden animate-slide-up">
                <div className="px-3 py-2.5 border-b border-gray-100">
                  <p className="text-xs text-gray-400">Masuk sebagai</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {user.nama}
                  </p>
                  <Badge variant="neutral" className="mt-1">
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </div>
                <ul className="py-1">
                  <li>
                    <a
                      href="/setting"
                      className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Profil &amp; Setting
                    </a>
                  </li>
                  <li>
                    <button
                      disabled={loggingOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      {loggingOut ? "Keluar…" : "Keluar"}
                    </button>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Peringatan Logout */}
      <Modal
        open={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        title="Pengunjung Belum Keluar!"
        size="sm"
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Peringatan Akses Server</p>
            <p className="text-xs text-gray-500 mt-2">
              Masih terdapat <span className="text-amber-600 font-bold">{activeCount} orang</span> di dalam ruang server yang belum mencatat waktu keluar.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Apakah Anda yakin ingin tetap keluar/logout?
            </p>
          </div>
          <div className="flex gap-2 w-full mt-4">
            <Button
              variant="secondary"
              onClick={() => setShowWarningModal(false)}
              className="flex-1 text-xs"
            >
              Batalkan
            </Button>
            <Button
              onClick={executeLogout}
              loading={loggingOut}
              className="flex-1 text-xs !bg-amber-500 hover:!bg-amber-600 border-0 text-white"
            >
              Ya, Tetap Keluar
            </Button>
          </div>
        </div>
      </Modal>
    </header>
  );
}
