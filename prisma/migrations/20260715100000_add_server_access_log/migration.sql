-- CreateTable
CREATE TABLE "server_access_logs" (
    "id" TEXT NOT NULL,
    "nama_orang" TEXT NOT NULL,
    "keperluan" TEXT,
    "jenis_akses" TEXT NOT NULL,
    "waktu_akses" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "foto_url" TEXT,
    "catatan_oleh" TEXT NOT NULL,
    "keterangan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_access_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "server_access_logs" ADD CONSTRAINT "server_access_logs_catatan_oleh_fkey" FOREIGN KEY ("catatan_oleh") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
