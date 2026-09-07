-- AlterTable
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "is_terminated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "server_access_logs" ADD COLUMN IF NOT EXISTS "is_terminated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "pc_inventory" ADD COLUMN IF NOT EXISTS "is_terminated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "workstation_master" ADD COLUMN IF NOT EXISTS "is_terminated" BOOLEAN NOT NULL DEFAULT false;
