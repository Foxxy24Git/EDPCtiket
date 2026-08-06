-- AlterTable
ALTER TABLE "server_access_logs" DROP COLUMN "keterangan",
ADD COLUMN "nama_pic" TEXT NOT NULL DEFAULT '',
ADD COLUMN "status_approval" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "approved_by" TEXT;

-- AddForeignKey
ALTER TABLE "server_access_logs" ADD CONSTRAINT "server_access_logs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
