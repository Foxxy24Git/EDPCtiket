-- AlterEnum
ALTER TYPE "TicketKategori" ADD VALUE 'workstation';

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "workstation_id" TEXT;

-- CreateTable
CREATE TABLE "workstation_master" (
    "id" TEXT NOT NULL,
    "kode_workstation" TEXT NOT NULL,
    "nama_workstation" TEXT NOT NULL,
    "cabang" TEXT,
    "lokasi" TEXT,
    "vendor" TEXT,

    CONSTRAINT "workstation_master_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workstation_master_kode_workstation_key" ON "workstation_master"("kode_workstation");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_workstation_id_fkey" FOREIGN KEY ("workstation_id") REFERENCES "workstation_master"("id") ON DELETE SET NULL ON UPDATE CASCADE;
