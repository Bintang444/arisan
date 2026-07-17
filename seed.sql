-- ============================================================
-- Arisan App — Seed Data (10 dummy participants)
-- Execute this in your Supabase SQL Editor after creating the tables.
-- ============================================================

-- 1. Pengaturan Arisan (start date)
INSERT INTO pengaturan_arisan (tanggal_mulai)
VALUES ('2026-07-20');

-- 2. Peserta Arisan (10 dummy participants with predetermined win order)
INSERT INTO peserta_arisan (nama_peserta, nama_asli, nominal_mingguan, minggu_menang) VALUES
  ('Bude Sri',   'Sri Wahyuni',     50000, 1),
  ('Mak Yati',   'Rohayati',        50000, 2),
  ('Tante Ani',  'Ani Rahmawati',   50000, 3),
  ('Bude Wati',  'Dewi Lestari',    50000, 4),
  ('Mak Sari',   'Sari Dewi',       50000, 5),
  ('Tante Ina',  'Ina Nurhayati',   50000, 6),
  ('Bude Tini',  'Ratini',          50000, 7),
  ('Mak Nani',   'Nani Sumarni',    50000, 8),
  ('Tante Rina', 'Rina Marlina',    50000, 9),
  ('Bude Yanti', 'Yanti Susilawati', 50000, 10);

-- 3. Generate setoran minggu ke-1 (all BELUM_BAYAR)
--    The app will auto-generate these on first admin visit,
--    but including them here so the dashboard works immediately.
INSERT INTO setoran_mingguan (peserta_id, minggu_ke, status, jumlah_bayar, tanggal_bayar)
SELECT id, 1, 'BELUM_BAYAR', NULL, NULL FROM peserta_arisan;
