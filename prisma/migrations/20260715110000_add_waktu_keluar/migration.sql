-- AlterTable: add waktu_keluar column to server_access_logs
ALTER TABLE "server_access_logs" ADD COLUMN "waktu_keluar" TIMESTAMP(3);
