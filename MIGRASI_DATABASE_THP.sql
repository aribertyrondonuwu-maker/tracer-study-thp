-- ══════════════════════════════════════════════════════════════════
--  MIGRASI DATABASE — Tracer Study THP FPIK UNSRAT
--  Program Studi : Teknologi Hasil Perikanan (THP)
--  Fakultas      : Perikanan dan Ilmu Kelautan (FPIK)
--  Universitas   : Sam Ratulangi (UNSRAT)
--  Instrumen     : LAM PTIP IAPS 1.0
--  Tabel         : ts_alumni, ts_employer, ts_stakeholder, ts_admins
--
--  CARA PAKAI:
--  1. Login ke https://supabase.com → project THP Anda
--  2. Buka menu "SQL Editor" di sidebar kiri
--  3. Paste seluruh isi file ini → klik "Run"
--  4. Pastikan semua tabel muncul di menu "Table Editor"
-- ══════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════
--  1. TABEL ALUMNI (Tabel 2.8B1 & 2.8B2 LAM PTIP)
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ts_alumni (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  -- Identitas
  nama          TEXT,
  nim           TEXT,
  masuk         TEXT,
  lulus         TEXT,
  email         TEXT,
  hp            TEXT,
  gender        TEXT,
  ipk           TEXT,
  judul         TEXT,

  -- Status & Karir (Tabel 2.8B1)
  status        TEXT,
  tunggu        TEXT,
  instansi      TEXT,
  jabatan       TEXT,
  kota          TEXT,
  bidang        TEXT,
  level_kerja   TEXT,
  gaji          TEXT,

  -- Kesesuaian (Tabel 2.8B2)
  kesesuaian    TEXT,
  sumber        TEXT,
  kompetensi    TEXT,
  perlu         TEXT,

  -- Rating Prodi oleh Alumni (7 aspek, skala 1–4)
  rtg_ar1       INT2 CHECK (rtg_ar1 BETWEEN 1 AND 4),
  rtg_ar2       INT2 CHECK (rtg_ar2 BETWEEN 1 AND 4),
  rtg_ar3       INT2 CHECK (rtg_ar3 BETWEEN 1 AND 4),
  rtg_ar4       INT2 CHECK (rtg_ar4 BETWEEN 1 AND 4),
  rtg_ar5       INT2 CHECK (rtg_ar5 BETWEEN 1 AND 4),
  rtg_ar6       INT2 CHECK (rtg_ar6 BETWEEN 1 AND 4),
  rtg_ar7       INT2 CHECK (rtg_ar7 BETWEEN 1 AND 4),

  -- Saran & Rekomendasi
  metode        TEXT,
  saran_kur     TEXT,
  saran_fas     TEXT,
  rekomendasi   TEXT,
  pesan         TEXT
);

-- RLS Alumni
ALTER TABLE ts_alumni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alumni_insert_public"
  ON ts_alumni FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "alumni_select_anon"
  ON ts_alumni FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "alumni_all_auth"
  ON ts_alumni FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════════
--  2. TABEL PENGGUNA LULUSAN / EMPLOYER (Tabel 2.7B LAM PTIP)
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ts_employer (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  -- Identitas Instansi
  instansi      TEXT,
  sektor        TEXT,
  kota          TEXT,
  pengisi       TEXT,
  jab_pengisi   TEXT,
  email         TEXT,
  telp          TEXT,

  -- Alumni yang dinilai
  alumni_nama   TEXT,
  alumni_jab    TEXT,
  lama          TEXT,

  -- 7 Aspek Kompetensi LAM PTIP Tabel 2.7B (skala 1–4)
  rtg_er1       INT2 CHECK (rtg_er1 BETWEEN 1 AND 4),  -- Integritas
  rtg_er2       INT2 CHECK (rtg_er2 BETWEEN 1 AND 4),  -- Profesionalisme
  rtg_er3       INT2 CHECK (rtg_er3 BETWEEN 1 AND 4),  -- Bahasa Asing
  rtg_er4       INT2 CHECK (rtg_er4 BETWEEN 1 AND 4),  -- Teknologi Informasi
  rtg_er5       INT2 CHECK (rtg_er5 BETWEEN 1 AND 4),  -- Komunikasi
  rtg_er6       INT2 CHECK (rtg_er6 BETWEEN 1 AND 4),  -- Kerja Tim
  rtg_er7       INT2 CHECK (rtg_er7 BETWEEN 1 AND 4),  -- Pengembangan Diri

  -- Penilaian Umum
  kepuasan      TEXT,
  rekrut        TEXT,
  saran         TEXT,
  pesan         TEXT
);

-- RLS Employer
ALTER TABLE ts_employer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employer_insert_public"
  ON ts_employer FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "employer_select_anon"
  ON ts_employer FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "employer_all_auth"
  ON ts_employer FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════════
--  3. TABEL STAKEHOLDER (Tabel 2.7C LAM PTIP)
--     Responden: Mahasiswa, Dosen, Tendik, Mitra, Lulusan, dll.
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ts_stakeholder (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  tahun_survei  INT2,
  jenis         TEXT,   -- Mahasiswa / Dosen / Tendik / Mitra / Lulusan / dll
  nama          TEXT,
  instansi      TEXT,
  email         TEXT,

  -- 7 Aspek Layanan Prodi (skala 1=Kurang, 2=Cukup, 3=Baik, 4=Sangat Baik)
  rtg_sk1       INT2 CHECK (rtg_sk1 BETWEEN 1 AND 4),  -- Kualitas Pengajaran
  rtg_sk2       INT2 CHECK (rtg_sk2 BETWEEN 1 AND 4),  -- Relevansi Kurikulum
  rtg_sk3       INT2 CHECK (rtg_sk3 BETWEEN 1 AND 4),  -- Fasilitas & Sarana
  rtg_sk4       INT2 CHECK (rtg_sk4 BETWEEN 1 AND 4),  -- Pelayanan Akademik
  rtg_sk5       INT2 CHECK (rtg_sk5 BETWEEN 1 AND 4),  -- Kompetensi SDM
  rtg_sk6       INT2 CHECK (rtg_sk6 BETWEEN 1 AND 4),  -- Suasana Akademik
  rtg_sk7       INT2 CHECK (rtg_sk7 BETWEEN 1 AND 4),  -- Kerjasama & Mitra

  kepuasan      TEXT,
  saran         TEXT,
  harapan       TEXT
);

-- RLS Stakeholder
ALTER TABLE ts_stakeholder ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stakeholder_insert_public"
  ON ts_stakeholder FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "stakeholder_select_anon"
  ON ts_stakeholder FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "stakeholder_all_auth"
  ON ts_stakeholder FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════════
--  4. TABEL ADMIN
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ts_admins (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  username    TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'admin'
               CHECK (role IN ('superadmin','admin')),
  is_active   BOOLEAN DEFAULT TRUE
);

-- RLS Admins
ALTER TABLE ts_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_select_anon"
  ON ts_admins FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "admins_all_auth"
  ON ts_admins FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════════
--  5. SEED DATA — Akun Default
--     ⚠️ WAJIB GANTI PASSWORD setelah pertama login!
-- ══════════════════════════════════════════════════════════════════
INSERT INTO ts_admins (username, password, full_name, role, is_active)
VALUES
  ('superadmin_thp', 'Admin@THP2025!', 'Super Admin THP',  'superadmin', TRUE),
  ('admin_thp',      'Admin123',       'Admin Prodi THP',  'admin',      TRUE)
ON CONFLICT (username) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════
--  6. INDEX (untuk performa query)
-- ══════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_alumni_lulus      ON ts_alumni (lulus);
CREATE INDEX IF NOT EXISTS idx_alumni_status     ON ts_alumni (status);
CREATE INDEX IF NOT EXISTS idx_alumni_created    ON ts_alumni (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employer_created  ON ts_employer (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stakeholder_tahun ON ts_stakeholder (tahun_survei);
CREATE INDEX IF NOT EXISTS idx_stakeholder_jenis ON ts_stakeholder (jenis);
CREATE INDEX IF NOT EXISTS idx_admins_username   ON ts_admins (username);


-- ══════════════════════════════════════════════════════════════════
--  SELESAI ✅
--  Tabel yang dibuat:
--    - ts_alumni       → Formulir Alumni (Tabel 2.8B1 & 2.8B2)
--    - ts_employer     → Formulir Pengguna Lulusan (Tabel 2.7B)
--    - ts_stakeholder  → Survei Kepuasan Stakeholder (Tabel 2.7C)
--    - ts_admins       → Manajemen Admin Dashboard
--
--  Akun default:
--    superadmin_thp / Admin@THP2025!  → akses penuh
--    admin_thp      / Admin123        → hanya Analisis
--
--  Langkah berikutnya:
--    1. Salin Project URL & anon key dari Settings → API
--    2. Isi ke file config.js pada sistem THP
-- ══════════════════════════════════════════════════════════════════
