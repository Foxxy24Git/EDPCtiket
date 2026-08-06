# MTR-Report — Bank Nagari IT Support Management System

> Sistem digitalisasi laporan operasional **IT Support Bank Nagari**: tiket gangguan workstation/ATM, monitoring akses server room, monitoring harian & mingguan, rekap laporan, dan persetujuan supervisi — menggantikan proses manual berbasis Excel.

---

## Daftar Isi

- [Tech Stack](#tech-stack)
- [Arsitektur Aplikasi](#arsitektur-aplikasi)
- [Prasyarat Sistem](#prasyarat-sistem)
- [Pengembangan Lokal (Local Development)](#pengembangan-lokal)
- [Konfigurasi Environment Variables](#konfigurasi-environment-variables)
- [Manajemen Database & Migrasi](#manajemen-database--migrasi)
- [Akun Default (Seed)](#akun-default-seed)
- [Perintah-Perintah Penting](#perintah-perintah-penting)
- [Deploy dengan Docker Compose](#deploy-dengan-docker-compose)
- [Struktur Folder](#struktur-folder)
- [Skema Database](#skema-database)
- [Role & Hak Akses (RBAC)](#role--hak-akses-rbac)
- [Catatan Developer](#catatan-developer)

---

## Tech Stack

| Kategori | Teknologi |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) — App Router, Server Components, Server Actions |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) — strict mode aktif |
| **UI / Styling** | [Tailwind CSS v3](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/) |
| **ORM** | [Prisma 6](https://www.prisma.io/) — dengan migrasi struktural |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) |
| **Autentikasi** | JWT (cookie `httpOnly`) via [jose](https://github.com/panva/jose), password hash [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| **UI Icons** | [Lucide React](https://lucide.dev/) |
| **Excel Export** | [ExcelJS](https://github.com/exceljs/exceljs) |
| **Image Processing** | [Sharp](https://sharp.pixelplumbing.com/) — kompresi foto otomatis |
| **Testing** | [Vitest](https://vitest.dev/) |
| **Containerization** | [Docker](https://www.docker.com/) + Docker Compose |

---

## Arsitektur Aplikasi

```
mtr-report/
├── app/                    # Next.js App Router
│   ├── (app)/              # Route group (dilindungi auth middleware)
│   │   ├── dashboard/      # Dashboard ringkasan & statistik
│   │   ├── log-server/     # Monitoring akses server room
│   │   ├── daily-monitoring/  # Laporan harian per shift
│   │   ├── weekly-monitoring/ # Rekap mingguan
│   │   ├── input-tiket/    # Entri tiket gangguan workstation
│   │   ├── supervisi/      # Dashboard persetujuan supervisi
│   │   ├── manajemen-akun/ # Kelola user (superadmin only)
│   │   ├── master-cabang/  # Kelola data cabang (superadmin)
│   │   ├── rekap-laporan/  # Export laporan Excel
│   │   └── setting/        # Pengaturan profil & password
│   └── api/                # API Routes (REST)
│       ├── auth/           # Login & logout
│       ├── server-log/     # CRUD log akses server room
│       ├── tickets/        # CRUD tiket gangguan
│       ├── users/          # Manajemen user
│       ├── me/             # Profil user yang sedang login
│       └── ...
├── components/             # Shared & feature components
│   ├── layout/             # Sidebar, Topbar, layout utama
│   ├── log-server/         # Komponen Log Server Room
│   ├── ui/                 # Komponen UI generik (Button, Input, Table, Modal)
│   └── ...
├── lib/                    # Utility: prisma client, jwt, session, queries
├── prisma/
│   ├── schema.prisma       # Definisi model database
│   ├── seed.ts             # Data awal (user & master cabang)
│   └── migrations/         # Riwayat migrasi SQL (commit semua!)
├── public/
│   └── uploads/            # Media yang diunggah (profil, foto log server)
├── Dockerfile              # Multi-stage build (deps → builder → runner)
└── docker-compose.yml      # Orkestrasi app + db
```

---

## Prasyarat Sistem

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

## Pengembangan Lokal

### 1. Clone Repository

```bash
git clone https://github.com/fikhrihanif/Project-Nagari.git
cd Project-Nagari
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
DATABASE_URL="postgresql://fq_user:fq_pass@localhost:5435/fq_report_db?schema=public"
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

### 6. Isi Data Awal (Seed)

```bash
npm run db:seed
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

## Konfigurasi Environment Variables

| Variabel | Wajib | Deskripsi |
|---|---|---|
| `DATABASE_URL` | ✅ | Connection string PostgreSQL. Format: `postgresql://USER:PASS@HOST:PORT/DB?schema=public` |
| `AUTH_SECRET` | ✅ | Secret key untuk signing JWT. Minimum 32 karakter acak. **Jangan gunakan nilai default di production!** |
| `NODE_ENV` | ✅ (prod) | Set ke `production` saat deploy |
| `TELEGRAM_BOT_TOKEN` | ❌ | Token bot Telegram (dari @BotFather). Digunakan untuk fitur notifikasi dan polling `/start` & `/id`. Kosongkan jika tidak digunakan. |

---

## Manajemen Database & Migrasi

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

## Akun Default (Seed)

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

## Perintah-Perintah Penting

```bash
# Development
npm run dev              # Jalankan server development (hot reload)
npm run build            # Build produksi Next.js
npm run start            # Jalankan server produksi (setelah build)
npm run lint             # Cek kualitas kode (ESLint)
npm test                 # Jalankan unit test (Vitest)

# Database (shorthand npm scripts)
npm run db:migrate       # prisma migrate dev (tambah migrasi baru)
npm run db:seed          # prisma db seed (isi data awal)
npm run db:reset         # prisma migrate reset --force (HAPUS SEMUA + seed ulang)

# Prisma langsung
npx prisma generate      # Generate ulang Prisma Client (wajib setelah schema berubah)
npx prisma migrate dev   # Buat & apply migrasi baru (development)
npx prisma migrate deploy  # Apply migrasi (production, non-interaktif)
npx prisma migrate status  # Cek status migrasi database
npx prisma studio        # Buka GUI database browser (port 5555)
```

---

## Deploy dengan Docker Compose

### Arsitektur Docker

```
docker-compose.yml
├── service: db      → PostgreSQL 16 Alpine, volume: postgres_data
└── service: app     → Next.js standalone build, volume mount: ./public
```

### Langkah-Langkah Deploy (Server Production / Proxmox VM)

#### 1. Clone Repository di Server

```bash
git clone https://github.com/fikhrihanif/Project-Nagari.git fq-report
cd fq-report
```

#### 2. Set Auth Secret

```bash
# Generate secret yang aman
openssl rand -base64 32
```

Buka `docker-compose.yml` dan ganti nilai `AUTH_SECRET`:
```yaml
environment:
  AUTH_SECRET: "hasil-openssl-rand-tadi-paste-di-sini"
```

Atau lebih baik, gunakan file `.env` terpisah untuk injeksi secret:
```bash
echo "AUTH_SECRET=$(openssl rand -base64 32)" > .env.docker
```

#### 3. (Opsional) Set Telegram Bot Token

Jika fitur notifikasi Telegram diaktifkan:
```bash
export TELEGRAM_BOT_TOKEN="token-dari-botfather"
```
Nilai ini akan dibaca otomatis oleh `docker-compose.yml` via `${TELEGRAM_BOT_TOKEN:-}`.

#### 4. Build Docker Image

```bash
docker compose build
```

Image multi-stage build akan:
1. **Stage `deps`**: Install semua npm dependencies
2. **Stage `builder`**: Generate Prisma Client + Build Next.js standalone
3. **Stage `runner`**: Image produksi minimal (hanya runtime artifacts)

#### 5. Jalankan Database Terlebih Dahulu

```bash
docker compose up -d db
```

Tunggu hingga health check database lulus (biasanya 5–15 detik):
```bash
docker compose ps   # Status "db" harus "(healthy)"
```

#### 6. Terapkan Migrasi & Seed Data (Satu Kali)

Karena image app standalone tidak menyertakan Prisma CLI, jalankan migrasi lewat container Node.js sekali pakai:

```bash
docker run --rm \
  --network fq_report_project_default \
  -v "$PWD":/app -w /app \
  -e DATABASE_URL="postgresql://fq_user:fq_pass@db:5432/fq_report_db?schema=public" \
  node:20-alpine \
  sh -c "npm ci && npx prisma migrate deploy && npx prisma db seed"
```

> **Catatan nama jaringan**: `docker-compose.yml` proyek ini menetapkan `name: fq_report_project` di baris pertama, jadi nama jaringannya selalu `fq_report_project_default` — tidak tergantung nama folder tempat clone. Cek dengan `docker network ls`.

#### 7. Jalankan Aplikasi

```bash
docker compose up -d app
```

Akses aplikasi di: **`http://<ip-server>:3050`**

Login: `superadmin` / `superadmin` → **segera ganti password!**

---

### Update Versi (Saat Ada Kode Baru)

```bash
# Pull kode terbaru
git pull origin main

# Rebuild image
docker compose build

# Restart container
docker compose up -d

# Apply migrasi baru jika ada (ulangi langkah 6 jika skema berubah)
docker run --rm \
  --network fq_report_project_default \
  -v "$PWD":/app -w /app \
  -e DATABASE_URL="postgresql://fq_user:fq_pass@db:5432/fq_report_db?schema=public" \
  node:20-alpine \
  sh -c "npm ci && npx prisma migrate deploy"
```

---

### Backup & Pemeliharaan

#### Backup Database
```bash
# Dump database ke file SQL
docker compose exec db pg_dump -U fq_user fq_report_db > backup_$(date +%Y%m%d).sql

# Restore dari backup
docker compose exec -T db psql -U fq_user fq_report_db < backup_20260716.sql
```

#### Backup Media Uploads
Volume media berada di `./public/uploads/` (di-mount langsung ke host). Cukup backup folder tersebut:
```bash
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz ./public/uploads/
```

#### Cek Log Aplikasi
```bash
docker compose logs -f app   # Live log aplikasi Next.js
docker compose logs -f db    # Live log PostgreSQL
```

---

## Struktur Folder

```
prisma/
├── schema.prisma           # Model & relasi database
├── seed.ts                 # Script seed data awal
└── migrations/             # SEMUA file migrasi SQL — wajib di-commit!
    ├── 20260526134623_init/
    ├── 20260715100000_add_server_access_log/
    ├── 20260716073000_add_instansi/
    └── ...

app/
├── (app)/                  # Halaman yang dilindungi middleware autentikasi
└── api/                    # REST API endpoints

components/
├── ui/                     # Komponen primitif: Button, Input, Modal, Table, Card
├── layout/                 # Sidebar, Topbar (global layout)
└── log-server/             # Semua komponen fitur Log Server Room
    ├── LogServerClient.tsx  # Container utama (state, fetch, filter)
    ├── LogServerTable.tsx   # Tabel riwayat akses dengan animasi
    ├── TambahLogModal.tsx   # Modal form input log + kamera
    └── SummaryCards.tsx     # Kartu statistik (total, masuk, keluar, unik)

lib/
├── prisma.ts               # Singleton Prisma Client
├── jwt.ts                  # Sign & verify JWT
├── session.ts              # Helper baca session dari cookie request
└── dashboardQueries.ts     # Query kompleks untuk dashboard
```

---

## Skema Database

Model-model utama di `prisma/schema.prisma`:

| Model | Tabel | Keterangan |
|---|---|---|
| `User` | `users` | Akun login, relasi ke log & tiket |
| `ServerAccessLog` | `server_access_logs` | Log akses masuk/keluar server room |
| `Ticket` | `tickets` | Tiket gangguan workstation / ATM |
| `TicketActivity` | `ticket_activities` | Riwayat aktivitas tiket (komentar, tindakan) |
| `WorkstationMaster` | `workstation_master` | Master data cabang Bank Nagari |

### Kolom Penting `ServerAccessLog`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `namaOrang` | `String` | Nama pengunjung / vendor |
| `instansi` | `String` | Asal instansi pengunjung (wajib diisi) |
| `namaPic` | `String` | PIC IT Support pendamping |
| `keperluan` | `String?` | Keperluan masuk server room |
| `waktuAkses` | `DateTime` | Waktu masuk (otomatis) |
| `waktuKeluar` | `DateTime?` | Waktu keluar (diisi saat klik tombol keluar) |
| `fotoUrl` | `String?` | URL foto pengunjung (diambil via kamera) |
| `statusApproval` | `String` | `pending` / `approved` (disetujui supervisor) |

---

## Role & Hak Akses (RBAC)

| Fitur | `superadmin` | `user` (IT Support) | `supervisi` |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Tambah Log Server | ✅ | ✅ | ❌ |
| Catat Keluar (Server Log) | ✅ | ✅ | ❌ |
| Approve Log Server | ✅ | ❌ | ✅ |
| Input Tiket Gangguan | ✅ | ✅ | ❌ |
| Approve Tiket Workstation | ✅ | ❌ | ✅ |
| Manajemen Akun | ✅ | ❌ | ❌ |
| Master Cabang | ✅ | ❌ | ❌ |
| Rekap & Export Excel | ✅ | ✅ | ✅ |

---

## Catatan Developer

### Konvensi Commit
```
feat(scope): deskripsi singkat fitur baru
fix(scope):  perbaikan bug
db:          perubahan database (migrasi / seed)
refactor:    refaktor kode tanpa perubahan perilaku
docs:        perubahan dokumentasi
```

### Menambahkan PIC Baru ke Dropdown Log Server
Daftar PIC di dropdown **Tambah Log** adalah konstanta statis di:
`components/log-server/TambahLogModal.tsx` → array `PIC_LIST`

Cukup tambahkan nama baru ke array tersebut, tidak ada perubahan database yang diperlukan.

### Error Umum & Solusinya

| Error | Penyebab | Solusi |
|---|---|---|
| `MODULE_NOT_FOUND` di API route | Cache webpack hot-reload setelah `prisma generate` | Stop server → `Remove-Item -Recurse -Force .next` → `npm run dev` |
| `P2003 Foreign key constraint` | Cookie session lama dengan User ID yang sudah tidak valid di DB | Logout → Login ulang |
| `EPERM: operation not permitted` (Windows) | `prisma generate` dijalankan saat server aktif | Stop server terlebih dahulu, jalankan `prisma generate`, lalu start ulang |
| `Hydration failed` di Next.js | Perbedaan render server vs client untuk data dinamis (tanggal/waktu) | Gunakan `useEffect` + state `mounted` sebelum merender nilai berbasis `Date` |

---

## Lisensi

Proyek ini bersifat internal untuk keperluan operasional **Bank Nagari**. Seluruh kode dan data di dalamnya merupakan aset perusahaan.