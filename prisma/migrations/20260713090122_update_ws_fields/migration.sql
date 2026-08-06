-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "ws_cabang" TEXT,
ADD COLUMN     "ws_capem" TEXT,
ADD COLUMN     "ws_kelengkapan" TEXT,
ADD COLUMN     "ws_kerusakan" TEXT,
ADD COLUMN     "ws_merek_komputer" TEXT,
ADD COLUMN     "ws_no_surat" TEXT,
ADD COLUMN     "ws_pic_terima" TEXT,
ADD COLUMN     "ws_sn_komputer" TEXT,
ADD COLUMN     "ws_tanggal_masuk" TIMESTAMP(3),
ADD COLUMN     "ws_tgl_ke_vendor" TIMESTAMP(3),
ADD COLUMN     "ws_tgl_kembali_ke_cabang" TIMESTAMP(3),
ADD COLUMN     "ws_tgl_selesai_vendor" TIMESTAMP(3),
ADD COLUMN     "ws_vendor" TEXT;
