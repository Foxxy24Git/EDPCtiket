-- Fix kategori column type in tickets table from enum TicketKategori to TEXT
ALTER TABLE "tickets" ALTER COLUMN "kategori" TYPE TEXT USING "kategori"::text;
ALTER TABLE "tickets" ALTER COLUMN "kategori" SET DEFAULT 'workstation';
