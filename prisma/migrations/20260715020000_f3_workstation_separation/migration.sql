-- F3: Pemisahan Workstation dari ATM & Jaringan
-- 1. Modifikasi tabel workstation_master: ubah schema menjadi master cabang
-- 2. Buat shiftKode & openShiftKode nullable di tabel tickets

-- ===== Step 1: Hapus data lama workstation_master (tidak relevan) =====
-- Hapus semua tiket yang punya workstationId (jika ada) agar bisa drop column
-- (Karena ini dev migration, kita truncate dulu)
DELETE FROM workstation_master;

-- Drop unique index dan kolom lama
ALTER TABLE workstation_master DROP COLUMN IF EXISTS kode_workstation;
ALTER TABLE workstation_master DROP COLUMN IF EXISTS nama_workstation;
ALTER TABLE workstation_master DROP COLUMN IF EXISTS cabang;
ALTER TABLE workstation_master DROP COLUMN IF EXISTS lokasi;
ALTER TABLE workstation_master DROP COLUMN IF EXISTS vendor;

-- Tambah kolom baru untuk master cabang
ALTER TABLE workstation_master ADD COLUMN nama_cabang TEXT NOT NULL DEFAULT '';
ALTER TABLE workstation_master ADD COLUMN kode_kantor TEXT;
ALTER TABLE workstation_master ADD COLUMN lokasi_kantor TEXT;

-- Remove default setelah kolom dibuat
ALTER TABLE workstation_master ALTER COLUMN nama_cabang DROP DEFAULT;

-- Tambah unique constraint untuk kode_kantor
CREATE UNIQUE INDEX workstation_master_kode_kantor_key ON workstation_master(kode_kantor) WHERE kode_kantor IS NOT NULL;

-- ===== Step 2: Buat shiftKode & openShiftKode nullable di tickets =====
ALTER TABLE tickets ALTER COLUMN shift_kode DROP NOT NULL;
ALTER TABLE tickets ALTER COLUMN open_shift_kode DROP NOT NULL;

-- ===== Step 3: TicketActivity.shiftKode juga perlu nullable untuk workstation =====
ALTER TABLE ticket_activities ALTER COLUMN shift_kode DROP NOT NULL;
