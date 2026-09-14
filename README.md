# Tracer Study THP FPIK UNSRAT
## Sistem Penelusuran Alumni & Survei Kepuasan Stakeholder
### Program Studi Teknologi Hasil Perikanan | LAM PTIP IAPS 1.0

---

## 📋 Overview

Sistem Tracer Study THP adalah aplikasi web untuk:
- **Alumni** mengisi survey karir & penilaian prodi (Tabel 2.8B1 & 2.8B2)
- **Pengguna Lulusan** memberikan penilaian 7 aspek kompetensi (Tabel 2.7B)
- **Stakeholder** survey kepuasan layanan prodi (Tabel 2.7C)
- **Admin** dashboard analisis & export laporan akreditasi

Teknologi:
- **Frontend**: ES6 Modules + Vanilla JS + Chart.js
- **Backend**: Supabase (PostgreSQL + REST API)
- **Deployment**: GitHub Pages (static) + Supabase (database)

---

## 🚀 Setup & Deployment

### Prasyarat
- Akun Supabase (✅ sudah dibuat, database sudah jadi)
- Akun GitHub (untuk repository)
- Git CLI (opsional, bisa pakai GitHub Desktop)

---

### 1️⃣ Persiapan Database Supabase (SUDAH SELESAI)

✅ Tabel sudah dibuat:
- `ts_alumni` — formulir alumni
- `ts_employer` — formulir pengguna lulusan
- `ts_stakeholder` — survei kepuasan stakeholder
- `ts_admins` — kelola admin

✅ Akun default sudah ada:
```
superadmin_thp  /  Admin@THP2025!    → akses penuh
admin_thp       /  Admin123         → hanya Analisis
```

⚠️ **WAJIB GANTI PASSWORD** setelah login pertama kali!

---

### 2️⃣ Setup Repository GitHub

1. **Buat repository baru** di GitHub:
   - Nama: `tracer-study-thp` (atau nama lain)
   - Visibility: **Public** (agar bisa deploy ke Pages)
   - README: Skip (tidak perlu, kita punya sudah)

2. **Clone repository lokal** (di laptop):
   ```bash
   git clone https://github.com/username/tracer-study-thp.git
   cd tracer-study-thp
   ```

3. **Copy semua file** dari folder `/tracer-study-thp/` ke folder repository lokal:
   ```
   ✓ config.js
   ✓ db.js
   ✓ form.js
   ✓ alumni.js
   ✓ employer.js
   ✓ stakeholder.js
   ✓ auth.js
   ✓ app.js
   ✓ admin.js
   ✓ index.html
   ✓ README.md
   ✓ MIGRASI_DATABASE_THP.sql (untuk referensi)
   ```

4. **Push ke GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit: Tracer Study THP"
   git push -u origin main
   ```

---

### 3️⃣ Enable GitHub Pages

1. Di GitHub, buka repository → **Settings**
2. Scroll ke **"Pages"** (sidebar kiri)
3. **Source**: pilih **"Deploy from a branch"**
4. **Branch**: pilih **"main"** + folder **"/ (root)"**
5. Klik **Save**
6. Tunggu ~2 menit, URL akan muncul:
   ```
   https://username.github.io/tracer-study-thp/
   ```

---

### 4️⃣ Verifikasi Supabase Credentials

Pastikan `config.js` punya URL dan key yang benar:

```javascript
export const SUPABASE_URL  = 'https://htbokinxcrwjqyixbhsp.supabase.co';
export const SUPABASE_ANON = 'eyJhbGciOi... [token panjang]';
```

Jika sudah deploy tapi ada error "Cannot connect to database", check:
1. URL Supabase benar (copy dari Settings → API)
2. anon key benar (bukan service role key)
3. Tabel sudah dibuat di Supabase (SQL migrasi sudah dijalankan)

---

## 🔑 Login Admin Dashboard

Akses: `https://username.github.io/tracer-study-thp/`

1. Klik **"Dashboard Admin"** (atau 📊 card di beranda)
2. Login dengan:
   - **Username**: `superadmin_thp`
   - **Password**: `Admin@THP2025!`

3. **Tab yang tersedia** (superadmin):
   - 📊 **Ringkasan**: overview statistik
   - 📋 **LAM PTIP**: laporan akreditasi (Tabel 2.7B, 2.8B1, 2.8B2)
   - 📈 **Analisis**: grafik & pembahasan data
   - 👥 **Alumni**: tabel responden alumni
   - 🏢 **Instansi**: tabel responden pengguna lulusan
   - 👤 **Kelola Admin**: tambah/edit akun admin

---

## 📊 Fitur Utama

### Formulir Alumni (5 Langkah)
1. Identitas & biodata
2. Status pekerjaan & waktu tunggu
3. Kesesuaian bidang kerja
4. Penilaian 7 aspek prodi
5. Rekomendasi & saran

**Data ke Tabel 2.8B1** (Waktu Tunggu) & **2.8B2** (Kesesuaian Kerja)

### Formulir Pengguna Lulusan (3 Langkah)
1. Identitas instansi & alumni yang dinilai
2. Penilaian 7 aspek kompetensi (Tabel 2.7B LAM PTIP)
3. Kepuasan umum & saran

**7 Aspek Kompetensi**:
1. Integritas (Etika & Moral)
2. Profesionalisme (Keahlian Bidang)
3. Bahasa Asing
4. Teknologi Informasi
5. Komunikasi
6. Kerja Tim
7. Pengembangan Diri

### Survei Stakeholder (3 Langkah)
Responden: Mahasiswa, Dosen, Tendik, Mitra, Lulusan, dll.

**7 Aspek Layanan Prodi (Tabel 2.7C)**:
1. Pengajaran & Pembelajaran
2. Relevansi Kurikulum
3. Fasilitas & Sarana
4. Pelayanan Akademik
5. Kompetensi SDM
6. Suasana Akademik
7. Kerjasama & Kemitraan

### Dashboard Admin
- 📈 **Grafik live**: status pekerjaan, waktu tunggu, bidang kerja, 7 aspek
- 📥 **Export data**: CSV, Excel, Word (dengan format akreditasi)
- 🤖 **AI Narasi**: generate pembahasan otomatis dari data
- 🔐 **Manajemen akun**: tambah admin, ubah role (superadmin/admin)

---

## 🔒 Keamanan

### Password Policy
- ⚠️ **Ganti default password** saat login pertama
- Minimum 8 karakter, mix huruf + angka + simbol
- Contoh: `THP@Prodi2025!Secure`

### Role-Based Access
- **Superadmin**: Akses penuh semua tab + export + kelola admin
- **Admin**: HANYA tab Analisis & Pembahasan (baca data saja)

### Data RLS (Row Level Security)
- Responden publik bisa isi formulir (INSERT)
- Hanya admin authenticated yang bisa lihat & download data
- Statistik publik available tanpa login (di halaman Statistik Publik)

---

## 📱 Responsivitas

Sistem sudah dioptimasi untuk:
- ✅ Desktop (1024px+)
- ✅ Tablet (768px - 1024px)
- ✅ Mobile (< 768px)

CSS variables & media queries sudah di-setup sesuai desain LAM PTIP.

---

## 🐛 Troubleshooting

### Error: "Cannot connect to Supabase"
**Solusi**:
1. Cek URL Supabase di `config.js` (Settings → API → Project URL)
2. Cek anon key (bukan service role key)
3. Buka browser console (F12) → lihat error message
4. Pastikan database name di config.js sesuai (TBL_ALUMNI dll)

### Formulir tidak bisa submit
**Solusi**:
1. Check network tab (F12 → Network) → cek request ke Supabase
2. Pastikan internet stabil
3. Refresh halaman & coba lagi
4. Clear browser cache

### Login admin gagal
**Solusi**:
1. Pastikan username & password benar (case-sensitive!)
2. Cek di Supabase → Table `ts_admins` → verify akun ada & is_active=true
3. Jika lupa password, direct edit di Supabase table

---

## 📞 Support & Maintenance

### Backup Database
Secara berkala backup data:
1. Supabase dashboard → Table Editor
2. Export → pilih format (CSV/JSON)
3. Simpan di secure storage

### Update Akun Admin
Di Supabase `ts_admins` table:
```sql
UPDATE ts_admins 
SET password = 'password_baru' 
WHERE username = 'superadmin_thp';
```

### Ubah Identitas Prodi
Jika ada perubahan nama/struktur:
1. Edit di `index.html` → Section identitas & about
2. Edit di `config.js` → ASPEK_PRODI (jika aspek berubah)
3. Push ke GitHub
4. GitHub Pages auto-update (dalam 1-5 menit)

---

## 📚 Dokumentasi Lengkap

- **LAM PTIP IAPS 1.0**: https://lamptip.or.id
- **Supabase Docs**: https://supabase.com/docs
- **GitHub Pages**: https://docs.github.com/en/pages

---

## 📄 Lisensi

Sistem ini dikembangkan untuk **Program Studi Teknologi Hasil Perikanan FPIK UNSRAT**.

Untuk penggunaan di prodi lain, silakan hubungi koordinator IT Fakultas.

---

**Versi**: 1.0  
**Deploy Date**: September 2026  
**Last Updated**: September 2026

Selamat menggunakan sistem Tracer Study THP! 🎓📊
