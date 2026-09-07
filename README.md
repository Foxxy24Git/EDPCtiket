# Nagari Workstation Monitor (EDPCtiket) — Bank Nagari IT Support Management System

> Sistem digitalisasi laporan operasional & manajemen aset **IT Support Bank Nagari**: tiket gangguan workstation/ATM, rekomendasi otomatis berbasis inventaris aset PC/Laptop/AIO, monitoring akses ruang server (kiosk & approval), pemantauan harian & mingguan, rekap laporan, serta persetujuan supervisi — menggantikan proses manual berbasis Excel.

---

## 📋 Daftar Isi

- [Tech Stack](#tech-stack)
- [Arsitektur Aplikasi](#arsitektur-aplikasi)
- [Fitur Utama](#fitur-utama)
- [Prasyarat Sistem](#prasyarat-sistem)
- [Pengembangan Lokal (Local Development)](#pengembangan-lokal)
- [Konfigurasi Environment Variables](#konfigurasi-environment-variables)
- [Manajemen Database & Seed Data](#manajemen-database--seed-data)
- [Akun Default (Seed)](#akun-default-seed)
- [Perintah-Perintah Penting](#perintah-perintah-penting)
- [Deploy dengan Docker Compose](#deploy-dengan-docker-compose)
- [Struktur Folder](#struktur-folder)
- [Skema Database](#skema-database)
- [Role & Hak Akses (RBAC)](#role--hak-akses-rbac)
- [Catatan Developer & Troubleshooting](#catatan-developer--troubleshooting)
- [Lisensi](#lisensi)

---

## 🛠️ Tech Stack

| Kategori | Teknologi |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) — App Router, Server Components, REST API |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) — strict mode aktif |
| **UI / Styling** | [Tailwind CSS v3](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/) |
| **ORM** | [Prisma 6](https://www.prisma.io/) — dengan migrasi SQL struktural |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) |
| **Autentikasi** | JWT (cookie `httpOnly`) via [jose](https://github.com/panva/jose), password hash [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| **UI Icons** | [Lucide React](https://lucide.dev/) |
| **Excel / Docs Export** | [ExcelJS](https://github.com/exceljs/exceljs), [docx](https://docx.js.org/) |
| **Image Processing** | [Sharp](https://sharp.pixelplumbing.com/) — kompresi foto log server otomatis |
| **Testing** | [Vitest](https://vitest.dev/) |
| **Containerization** | [Docker](https://www.docker.com/) + Docker Compose |

---

## 🚀 Fitur Utama

1. **Sistem Tiket Gangguan Workstation & Auto-Fill Pintar:**
   - Pencarian otomatis saat menginput Serial Number (SN).
   - Memeriksa riwayat tiket sebelumnya terlebih dahulu, lalu *fallback* ke database **Master SN Perangkat (`pc_inventory`)**.
   - Pengisian otomatis Merek, Jenis, dan Cabang untuk memangkas waktu kerja teknisi.
   - *Auto-Sync / Upsert*: Data SN di `pc_inventory` otomatis terbarui dengan lokasi cabang dan spesifikasi terbaru setiap kali tiket baru disimpan.
2. **Master SN Perangkat & Aset PC (PC Inventory):**
   - Tab khusus **Master SN Perangkat** di panel Super Admin (`/master-cabang`).
   - Pencarian cepat, filter merek/jenis/cabang, serta CRUD aset PC lengkap.
   - Import & pembersihan otomatis 1.500+ data SN dari Excel `DATA PC APP.xlsx` via script seed `seed-pc-inventory.js`.
3. **Aktivitas Server & Kiosk Akses Ruang Server:**
   - Kiosk mandiri (`/log-server-kiosk`) untuk foto wajah & tanda tangan digital tamu/vendor.
   - Notifikasi dan alur persetujuan (*approval*) oleh Supervisi / Admin di menu **Aktivitas Server** (`/log-server`).
4. **Modul Supervisi & Approval:**
   - Halaman khusus Supervisi (`/supervisi`) dengan *badge counter real-time* untuk meninjau dan menyetujui tiket perbaikan yang diselesaikan teknisi.
5. **Rekap Laporan & Dokumen Berita Acara:**
   - **Rekap Workstation (Excel):** Fitur download rekap laporan dalam format Excel (`.xlsx`) lengkap dengan filter rentang tanggal, status tiket (selesai & approved), cabang, serta **filter khusus jenis perangkat (EDC, Komputer, Printer, dll.)**.
   - **Berita Acara Serah Terima (Word):** Pembuatan dan cetak dokumen Berita Acara resmi baik **Berita Acara Cabang** (serah terima dari IT ke cabang) maupun **Berita Acara Vendor** (penyerahan ke vendor perbaikan) lengkap dengan tombol cetak di detail tiket & rekap laporan.
6. **Manajemen Master Data & Akun:**
   - Pengelolaan Master Cabang Bank Nagari, Merek Komputer, Vendor Perbaikan, Form Builder Perangkat, dan Manajemen Akun Pengguna (RBAC).

---

## 🏛️ Arsitektur Aplikasi

```
EDPCtiket/
├── app/                    # Next.js App Router
│   ├── (app)/              # Route group utama (dilindungi Auth & RBAC Middleware)
│   │   ├── dashboard/      # Ringkasan status & statistik tiket
│   │   ├── input-tiket/    # Form input tiket perbaikan + Rekomendasi SN
│   │   ├── daily-monitoring/  # Monitoring tiket aktif harian
│   │   ├── weekly-monitoring/ # Riwayat tiket workstation
│   │   ├── supervisi/      # Panel persetujuan supervisi (approval)
│   │   ├── master-perangkat/  # Form builder & master jenis perangkat
│   │   ├── master-cabang/  # Master Cabang, Merek, Vendor, & Master SN (PC Inventory)
│   │   ├── manajemen-akun/ # Kelola akun (Superadmin only)
│   │   ├── log-server/     # Monitoring & approval akses server room
│   │   ├── rekap-laporan/  # Export laporan Excel & Berita Acara Word
│   │   ├── backup-database/ # Backup & maintenance DB PostgreSQL
│   │   └── setting/        # Pengaturan profil & password
│   ├── log-server-kiosk/   # Halaman Kiosk mandiri (Buku Tamu Ruang Server)
│   └── api/                # REST API Endpoints
│       ├── auth/           # Login, logout, session
│       ├── tickets/        # CRUD tiket & `/history-by-sn`
│       ├── pc-inventory/   # CRUD master SN & aset PC
│       ├── master-options/ # Master opsi (merek, vendor, slide-down)
│       └── ...
├── components/             # Shared & Feature Components
│   ├── input-tiket/        # Form & layout input tiket
│   ├── master-cabang/      # Master cabang & tab Master SN Client
│   ├── supervisi/          # Tabel & modal persetujuan supervisi
│   ├── log-server/         # UI Kiosk & tabel log server
│   ├── layout/             # Sidebar, Topbar, AppLogo
│   └── ui/                 # Komponen UI Reusable (Modal, Button, Input, Table)
├── lib/                    # Helper: Prisma singleton, JWT, session, RBAC, Excel/Word
├── prisma/
│   ├── schema.prisma       # Definisi model database PostgreSQL
│   ├── seed.ts             # Seed data awal (users, cabang, opsi default)
│   ├── seed-pc-inventory.js# Seed data pembersihan aset SN dari Excel
│   └── migrations/         # Riwayat migrasi SQL (commit semua!)
├── public/
│   └── uploads/            # Media yang diunggah (profil, foto log server)
├── Dockerfile              # Multi-stage Docker build
└── docker-compose.yml      # Orkestrasi container App + PostgreSQL
```

---

## 💻 Prasyarat Sistem

### Untuk Pengembangan Lokal
| Prasyarat | Versi Minimum |
|---|---|
| [Node.js](https://nodejs.org/) | **v20 LTS** atau lebih baru |
| [npm](https://www.npmjs.com/) | v10+ (disertakan bersama Node.js) |
| [PostgreSQL](https://www.postgresql.org/) | **v16** (atau v15+ kompatibel) |
| [Git](https://git-scm.com/) | Versi terbaru |

### Untuk Deployment Docker
| Prasyarat | Versi Minimum |
|---|---|
| [Docker Engine](https://docs.docker.com/engine/install/) | v24+ |
| [Docker Compose](https://docs.docker.com/compose/) | v2.20+ (plugin, bukan standalone) |
| [Git](https://git-scm.com/) | Versi terbaru |

---

## 🔧 Pengembangan Lokal

### 1. Clone Repository

```bash
git clone https://github.com/Foxxy24Git/EDPCtiket.git
cd EDPCtiket
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi Environment

Salin template environment dan sesuaikan nilainya:

```bash
# Linux / macOS
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

Edit file `.env`:

```env
DATABASE_URL="postgresql://fq_user:fq_pass@localhost:5432/fq_report_db?schema=public"
AUTH_SECRET="ganti-dengan-string-acak-minimum-32-karakter"
```

> **Cara buat `AUTH_SECRET` yang aman:**
> ```bash
> # Linux/macOS
> openssl rand -base64 32
>
> # Windows (PowerShell)
> [Convert]::ToBase64String((New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes(32))
> ```

### 4. Buat Database PostgreSQL

```sql
-- Jalankan di psql atau pgAdmin
CREATE DATABASE fq_report_db;
CREATE USER fq_user WITH PASSWORD 'fq_pass';
GRANT ALL PRIVILEGES ON DATABASE fq_report_db TO fq_user;
```

### 5. Terapkan Migrasi Database

```bash
npx prisma migrate dev
```

Perintah ini akan:
- Membaca semua file di `prisma/migrations/`
- Membuat seluruh tabel, kolom, constraint, dan index di database
- Men-generate Prisma Client

### 6. Isi Data Awal (Seed Data & Master SN)

```bash
# Seed data akun pengguna & master cabang default
npm run db:seed

# Seed data aset SN Perangkat (1.500+ data SN PC/Laptop dari Excel)
node prisma/seed-pc-inventory.js
```

Atau jika ingin reset total kemudian seed ulang:

```bash
npm run db:reset   # HATI-HATI: Menghapus seluruh data!
```

### 7. Generate Prisma Client

Wajib dijalankan setiap kali `prisma/schema.prisma` berubah:

```bash
npx prisma generate
```

> **Catatan Windows**: Selalu hentikan `npm run dev` terlebih dahulu sebelum menjalankan `prisma generate`. File engine DLL (`query_engine-windows.dll.node`) dikunci oleh proses Node.js yang aktif.

### 8. Jalankan Server Development

```bash
npm run dev
```

Akses aplikasi di **http://localhost:3000**

---

## ⚙️ Konfigurasi Environment Variables

| Variabel | Wajib | Deskripsi |
|---|---|---|
| `DATABASE_URL` | ✅ | Connection string PostgreSQL. Format: `postgresql://USER:PASS@HOST:PORT/DB?schema=public` |
| `AUTH_SECRET` | ✅ | Secret key untuk signing JWT. Minimum 32 karakter acak. **Jangan gunakan nilai default di production!** |
| `NODE_ENV` | ✅ (prod) | Set ke `production` saat deploy |
| `TELEGRAM_BOT_TOKEN` | ❌ | Token bot Telegram (dari @BotFather). Digunakan untuk fitur notifikasi dan polling `/start` & `/id`. Kosongkan jika tidak digunakan. |

---

## 🗄️ Manajemen Database & Migrasi

### Workflow Penambahan Kolom / Tabel Baru

1. **Ubah skema** di `prisma/schema.prisma`
2. **Buat migrasi baru** (untuk development):
   ```bash
   npx prisma migrate dev --name nama_fitur_anda
   ```
3. **Generate ulang Prisma Client:**
   ```bash
   npx prisma generate
   ```
4. **Commit file migrasi** ke Git — **jangan pernah abaikan!**:
   ```bash
   git add prisma/migrations/
   git commit -m "db: add [nama_kolom] to [nama_tabel]"
   ```

### Apply Migrasi di Server Production (Non-Interaktif)

```bash
npx prisma migrate deploy
```

> `migrate deploy` tidak interaktif, tidak menghapus data, dan aman untuk dijalankan berulang kali. Ini adalah perintah yang digunakan pada saat startup Docker di production.

### Inspect Database via Prisma Studio

```bash
npx prisma studio
```

Buka Prisma Studio di browser: **http://localhost:5555**

---

## 👤 Akun Default (Seed)

Setelah menjalankan `npm run db:seed`, akun-akun berikut akan tersedia:

| Username | Nama Lengkap | Role | Password Default |
|---|---|---|---|
| `superadmin` | Super Admin | `superadmin` | `superadmin` |
| `mtr1` | Afrinaldi | `user` | `mtr1` |
| `mtr2` | Rian Islami Putra | `user` | `mtr2` |
| `mtr3` | Kurnia Fajri | `user` | `mtr3` |
| `mtr4` | Ibnu Sauki | `user` | `mtr4` |
| `mtr5` | Ridho M R | `user` | `mtr5` |
| `tio` | Tio Rahmayunda | `supervisi` | `tio` |
| `berto` | Berto L | `supervisi` | `berto` |

> ⚠️ **Segera ganti semua password default** setelah pertama kali login melalui menu **Setting → Ubah Password**.

---

## 📜 Perintah-Perintah Penting

```bash
# Development
npm run dev              # Jalankan server development (hot reload)
npm run build            # Build produksi Next.js
npm run start            # Jalankan server produksi (setelah build)
npm run lint             # Cek kualitas kode (ESLint)
npm test                 # Jalankan unit test (Vitest)

# Database (shorthand npm scripts)
npm run db:migrate       # prisma migrate dev (tambah migrasi baru)
npm run db:seed          # prisma db seed (isi data awal user & cabang)
node prisma/seed-pc-inventory.js # Seed data aset SN Perangkat dari Excel
npm run db:reset         # prisma migrate reset --force (HAPUS SEMUA + seed ulang)

# Prisma langsung
npx prisma generate      # Generate ulang Prisma Client (wajib setelah schema berubah)
npx prisma migrate dev   # Buat & apply migrasi baru (development)
npx prisma migrate deploy  # Apply migrasi (production, non-interaktif)
npx prisma migrate status  # Cek status migrasi database
npx prisma studio        # Buka GUI database browser (port 5555)
```

---

## 🐳 Deploy dengan Docker Compose

### Arsitektur Docker

```
docker-compose.yml
├── service: db      → PostgreSQL 16 Alpine, volume: postgres_data
└── service: app     → Next.js standalone build, volume mount: ./public
```

### Langkah-Langkah Deploy & Update Server

#### 🔄 Cara Update Aplikasi di Server yang Sudah Berjalan (Tanpa Menghapus Data Database)

Untuk melakukan update aplikasi pada PC Server yang sudah terdeploy sebelumnya:

1. **Tarik/Copy Kode Terbaru** ke folder proyek di PC Server.
2. **Jalankan Perintah Update Satu Langkah**:
   ```bash
   docker compose up -d --build
   ```
   *Atau jika menggunakan Docker Compose versi v1 (`docker-compose`):*
   ```bash
   docker-compose up -d --build
   ```

> 🛡️ **Keamanan Data DB Terjamin**:  
> Perintah `docker compose up -d --build` secara otomatis akan:
> - Mengompilasi ulang image aplikasi Next.js dengan fitur & perbaikan kode terbaru.
> - Menjalankan migrasi database otomatis (`npx prisma migrate deploy`) via *entrypoint script*.
> - **TIDAK AKAN menghapus atau menimpa data database yang sudah ada**, karena data PostgreSQL tersimpan secara aman dalam Docker Persistent Volume (`fq_postgres_data`).

#### 🚀 Deploy Pertama Kali (Fresh Server Setup)

```bash
docker compose up -d --build
```
Setelah container berjalan, jalankan migrasi & seed data awal:
```bash
# Apply migrasi database
docker compose exec app npx prisma migrate deploy

# Import data aset SN Perangkat
docker compose exec app node prisma/seed-pc-inventory.js
```

> **Penanganan Masalah Migrasi Lock (P3009):**  
> Jika migrasi sempat tertahan di server production, batalkan status penguncian lalu deploy ulang:
> ```bash
> docker-compose exec app npx prisma migrate resolve --rolled-back 20260903000000_add_pc_inventory
> docker-compose exec app npx prisma migrate deploy
> ```

---

## 📊 Skema Database

Model-model utama di `prisma/schema.prisma`:

| Model | Tabel | Deskripsi |
|---|---|---|
| `User` | `users` | Akun login (`superadmin`, `user`, `supervisi`), relasi ke log & tiket |
| `ServerAccessLog` | `server_access_logs` | Log akses masuk/keluar server room (Kiosk & Approval) |
| `WorkstationMaster` | `workstation_master` | Master data cabang resmi Bank Nagari |
| `MasterOption` | `master_options` | Master opsi dinamis (Merek, Vendor, Form Builder, Slide-down) |
| `PcInventory` | `pc_inventory` | Master data aset SN Perangkat (SN, Merek, Jenis, Lokasi, Cabang) |
| `Ticket` | `tickets` | Tiket gangguan workstation / ATM |
| `TicketActivity` | `ticket_activities` | Catatan aktivitas & riwayat penanganan tiket |

---

## 🔐 Role & Hak Akses (RBAC)

| Halaman / Fitur | `superadmin` | `user` (IT Support) | `supervisi` |
|---|:---:|:---:|:---:|
| **Dashboard** (`/dashboard`) | ✅ | ✅ | ✅ |
| **Tiket Monitoring** (`/daily-monitoring`) | ❌ | ✅ | ✅ |
| **Data Tiket** (`/weekly-monitoring`) | ✅ | ✅ | ✅ |
| **Input Tiket** (`/input-tiket`) | ❌ | ✅ | ❌ |
| **Supervisi / Approval Tiket** (`/supervisi`) | ❌ | ❌ | ✅ |
| **Master Perangkat & Opsi** (`/master-cabang`) | ✅ | ❌ | ❌ |
| **Master SN Perangkat** (`pc_inventory`) | ✅ | ❌ | ❌ |
| **Manajemen Akun** (`/manajemen-akun`) | ✅ | ❌ | ❌ |
| **Aktivitas Server & Approval** (`/log-server`) | ✅ | ✅ | ✅ |
| **Backup Database** (`/backup-database`) | ✅ | ❌ | ❌ |
| **Rekap Laporan** (`/rekap-laporan`) | ✅ | ✅ | ✅ |

---

## 💡 Catatan Developer & Troubleshooting

### Konvensi Commit
```
feat(scope): deskripsi singkat fitur baru
fix(scope):  perbaikan bug
db:          perubahan database (migrasi / seed)
refactor:    refaktor kode tanpa perubahan perilaku
docs:        perubahan dokumentasi
```

### Pembersihan Data SN
Script `prisma/seed-pc-inventory.js` secara otomatis memfilter SN kosong/invalid (seperti `"To be filled by O.E.M."`) dan menormalisasi nama merek (misal: `LENOVO` → `Lenovo`, `Hewlett-Packard` → `HP`, `ASUSTeK` → `Asus`).

### Error Umum & Solusinya

| Error | Penyebab | Solusi |
|---|---|---|
| `MODULE_NOT_FOUND` di API route | Cache webpack hot-reload setelah `prisma generate` | Stop server → `Remove-Item -Recurse -Force .next` → `npm run dev` |
| `P2003 Foreign key constraint` | Cookie session lama dengan User ID yang sudah tidak valid di DB | Logout → Login ulang |
| `EPERM: operation not permitted` (Windows) | `prisma generate` dijalankan saat server aktif | Stop server terlebih dahulu, jalankan `prisma generate`, lalu start ulang |
| `Hydration failed` di Next.js | Perbedaan render server vs client untuk data dinamis (tanggal/waktu) | Gunakan `useEffect` + state `mounted` sebelum merender nilai berbasis `Date` |
| `P3009 Migration failed` (Prisma) | State migrasi terkunci setelah restart / gagal di production | Jalankan `npx prisma migrate resolve --rolled-back <migration_name>` lalu deploy ulang |

---

## 📄 Lisensi

Proyek ini bersifat internal untuk keperluan operasional **Bank Nagari**. Seluruh kode dan data di dalamnya merupakan aset perusahaan.