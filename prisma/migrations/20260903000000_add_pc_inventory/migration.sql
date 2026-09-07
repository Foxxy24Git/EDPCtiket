-- Migration: 20260903000000_add_pc_inventory
-- Deskripsi: Tambah tabel pc_inventory untuk inventaris SN perangkat PC/Laptop/AIO
-- AMAN: Hanya CREATE TABLE baru, tidak ada ALTER/DROP pada tabel yang sudah ada

-- CreateTable
CREATE TABLE "pc_inventory" (
    "id" TEXT NOT NULL,
    "sn" TEXT NOT NULL,
    "merek" TEXT,
    "jenis" TEXT,
    "lokasi" TEXT,
    "cabang" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pc_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pc_inventory_sn_key" ON "pc_inventory"("sn");
