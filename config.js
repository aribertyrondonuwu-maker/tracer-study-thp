// ══════════════════════════════════════════════════════════
//  config.js — Konfigurasi Supabase & Konstanta Global
//  Sistem Survei Mutu THP FPIK UNSRAT — LAM PTIP IAPS 1.0
// ══════════════════════════════════════════════════════════

export const SUPABASE_URL  = 'https://htbokinxcrwjqyixbhsp.supabase.co';
export const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Ym9raW54Y3J3anF5aXhiaHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzODk1NjYsImV4cCI6MjEwNDk2NTU2Nn0.EN5rJFal5-nhMrDcblJMIBv6UKOjyT61NTQ-iD9Thyw';

// ── Tabel Supabase
export const TBL_ALUMNI       = 'ts_alumni';
export const TBL_EMPLOYER     = 'ts_employer';
export const TBL_ADMINS       = 'ts_admins';
export const TBL_STAKEHOLDER  = 'ts_stakeholder';

// ── Role Definitions
export const ROLE = {
  SUPERADMIN : 'superadmin',
  ADMIN      : 'admin',
};

// ── Akses tab per role
//    superadmin → semua tab, termasuk Kelola Admin
//    admin      → bisa lihat & download SEMUA data/laporan,
//                  TAPI tidak bisa mengubah aplikasi:
//                  tidak bisa tambah/hapus/edit data, dan tidak
//                  bisa mengelola akun admin (tab "usr" khusus superadmin)
export const TAB_ACCESS = {
  [ROLE.SUPERADMIN] : ['ov','lam','analisis','al','em','sk','usr'],
  [ROLE.ADMIN]      : ['ov','lam','analisis','al','em','sk'],
};

// ── 7 Aspek LAM PTIP (Tabel 2.7B) — Kepuasan Pengguna Lulusan
export const ASPEK_LAM = [
  { id:'er1', lbl:'Integritas (Etika dan Moral)' },
  { id:'er2', lbl:'Keahlian Berdasarkan Bidang Ilmu (Profesionalisme)' },
  { id:'er3', lbl:'Kemampuan Berbahasa Asing' },
  { id:'er4', lbl:'Penggunaan Teknologi Informasi' },
  { id:'er5', lbl:'Kemampuan Berkomunikasi' },
  { id:'er6', lbl:'Kemampuan Bekerjasama dalam Tim' },
  { id:'er7', lbl:'Kemampuan Pengembangan Diri' },
];

// ── Penilaian Prodi oleh Alumni
export const ASPEK_PRODI = [
  { id:'ar1', lbl:'Kualitas Kurikulum & Kesesuaian dengan Kebutuhan Lapangan' },
  { id:'ar2', lbl:'Kualitas Pengajaran & Kompetensi Dosen THP' },
  { id:'ar3', lbl:'Bimbingan Akademik & Pembimbingan Skripsi' },
  { id:'ar4', lbl:'Fasilitas Laboratorium Pengolahan & Teknologi' },
  { id:'ar5', lbl:'Fasilitas Sarana Prasarana Kampus & Perpustakaan' },
  { id:'ar6', lbl:'Kegiatan PKL / Kerja Lapangan' },
  { id:'ar7', lbl:'Pelayanan Administrasi Akademik' },
];

// ── Tahun Survei (LAM PTIP)
export const TAHUN_SURVEI = {
  TS   : 2025,
  TS_1 : 2024,
  TS_2 : 2023,
};
export const TAHUN_OPTIONS = [
  { value: 2025, label: 'TS (2025)' },
  { value: 2024, label: 'TS-1 (2024)' },
  { value: 2023, label: 'TS-2 (2023)' },
];

// ── Kohort Tahun Lulus untuk Tabel LKPS 2.7B / 2.8B1 / 2.8B2
//    Format resmi LAM PTIP IAPS 1.0: TS-4, TS-3, TS-2 (3 angkatan lulusan yang dilacak)
export const LKPS_TS = 2025; // Tahun Survei (TS) berjalan
export const LKPS_COHORTS = [
  { key: 'ts4', label: 'TS-4', year: LKPS_TS - 4 },
  { key: 'ts3', label: 'TS-3', year: LKPS_TS - 3 },
  { key: 'ts2', label: 'TS-2', year: LKPS_TS - 2 },
];

// ── Warna chart
export const CHART_COLORS = [
  '#003D5B','#006D77','#C5973A','#1B7A4A',
  '#7B5EA7','#C0392B','#17809B','#D97706','#2563EB','#834F00',
];
