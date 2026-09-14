# 📚 PANDUAN LENGKAP SETUP TRACER STUDY THP

## Daftar Isi
1. [Database Supabase (DONE)](#1-database-supabase)
2. [Setup GitHub Repository](#2-setup-github-repository)
3. [Deploy ke GitHub Pages](#3-deploy-ke-github-pages)
4. [Testing & Verifikasi](#4-testing--verifikasi)
5. [Management & Maintenance](#5-management--maintenance)

---

## 1. Database Supabase ✅

### Status: SUDAH SELESAI ✓

Yang sudah dikerjakan:
- ✅ Project Supabase baru dibuat: `tracer-study-thp`
- ✅ SQL migrasi dijalankan → semua tabel ada
- ✅ Akun default sudah dibuat
- ✅ API Key sudah di-generate

### Informasi Supabase THP
```
Project Name    : tracer-study-thp
Project URL     : https://htbokinxcrwjqyixbhsp.supabase.co
Organization    : tracer-study-thp-fpik-unsrat
Region          : Asia-Pacific (Northeast Asia - Tokyo)

Credentials:
- SUPABASE_URL  : https://htbokinxcrwjqyixbhsp.supabase.co
- SUPABASE_ANON : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Akun Default:
- superadmin_thp / Admin@THP2025! (akses penuh)
- admin_thp      / Admin123       (hanya analisis)
```

### Tabel yang Tersedia
| Tabel | Keterangan | Baris |
|-------|-----------|-------|
| `ts_alumni` | Formulir alumni (Tabel 2.8B1 & 2.8B2) | 0 |
| `ts_employer` | Formulir pengguna lulusan (Tabel 2.7B) | 0 |
| `ts_stakeholder` | Survei kepuasan stakeholder (Tabel 2.7C) | 0 |
| `ts_admins` | Kelola admin & user | 2 (default) |

---

## 2. Setup GitHub Repository

### Step 2.1: Buat Repository Baru di GitHub

1. Login ke [github.com](https://github.com)
2. Click **"+"** (pojok kanan atas) → **"New repository"**
3. Isi form:
   ```
   Repository name   : tracer-study-thp
   Description       : Sistem Tracer Study Prodi THP FPIK UNSRAT
   Visibility        : 🔴 PUBLIC (PENTING! agar bisa pakai GitHub Pages)
   Initialize repo   : ☐ Skip (kita punya files sudah)
   ```
4. Click **"Create repository"**

### Step 2.2: Setup Lokal (di Laptop)

**Opsi A: Pakai Git CLI**

Buka Terminal/Command Prompt:
```bash
# Clone repository kosong
git clone https://github.com/YOUR_USERNAME/tracer-study-thp.git
cd tracer-study-thp

# Copy semua file dari folder yang sudah disediakan
# (config.js, index.html, admin.js, dll)
cp /path/to/tracer-study-thp/* .

# Push ke GitHub
git add .
git commit -m "Initial commit: Tracer Study THP Setup"
git push -u origin main
```

**Opsi B: Pakai GitHub Desktop (GUI - lebih mudah)**

1. Buka [desktop.github.com](https://desktop.github.com) → install
2. Login dengan akun GitHub
3. Click **File** → **Clone Repository**
4. Pilih repository `tracer-study-thp` yang baru dibuat
5. Pilih folder lokal untuk disimpan
6. Copy semua file THP ke folder repository lokal
7. Di GitHub Desktop:
   - Bagian **"Changes"** akan menunjukkan file baru
   - Isi **"Summary"**: `Initial commit: Tracer Study THP`
   - Click **"Commit to main"**
   - Click **"Push origin"**

### Step 2.3: Verifikasi Push Berhasil

1. Buka GitHub repository di browser
2. Klik tab **"Code"** → pastikan file-file sudah ada:
   - ✅ index.html
   - ✅ config.js
   - ✅ admin.js
   - ✅ dll

---

## 3. Deploy ke GitHub Pages

### Step 3.1: Enable GitHub Pages

1. Buka repository di browser
2. Click tab **"Settings"** (gear icon)
3. Di sidebar kiri, scroll ke **"Pages"**
4. Di section **"Build and deployment"**:
   ```
   Source        : 🔘 Deploy from a branch
   Branch        : main (dropdown)
   Folder        : / (root)
   ```
5. Click **"Save"**

### Step 3.2: Tunggu & Verifikasi

Tunggu ~2-5 menit untuk deploy.

Akan muncul notifikasi:
```
✅ Your site is ready to be published at https://YOUR_USERNAME.github.io/tracer-study-thp/
```

Test aplikasi:
1. Buka: `https://YOUR_USERNAME.github.io/tracer-study-thp/`
2. Seharusnya muncul halaman beranda Tracer Study THP
3. Coba klik **"Isi Formulir Alumni"** → pastikan halaman form muncul
4. Coba klik **"Dashboard Admin"** → login dengan `superadmin_thp` / `Admin@THP2025!`

---

## 4. Testing & Verifikasi

### Test 4.1: Cek Koneksi Supabase

Di halaman formulir alumni:
1. Isi semua field (Nama, NIM, Email, dll)
2. Next sampai halaman terakhir
3. Click **"Kirim Formulir"**
4. Jika berhasil → halaman success muncul
5. Jika error → check browser console (F12 → Console)

### Test 4.2: Dashboard Admin

1. Click **"Dashboard Admin"**
2. Login: `superadmin_thp` / `Admin@THP2025!`
3. Pastikan tab-tab muncul:
   - ✅ Ringkasan
   - ✅ LAM PTIP
   - ✅ Analisis
   - ✅ Alumni (tabel kosong atau ada data test)
   - ✅ Instansi
   - ✅ Kelola Admin

### Test 4.3: GANTI PASSWORD DEFAULT ⚠️

**Wajib lakukan ini!** Password default harus diganti setelah testing.

**Cara 1: Via Dashboard Admin**
1. Login dengan `superadmin_thp` / `Admin@THP2025!`
2. Tab **"Kelola Admin"** → klik username `superadmin_thp`
3. Edit password → save

**Cara 2: Langsung di Supabase** (jika dashboard belum bisa edit)
1. Buka [supabase.com](https://supabase.com) → project THP
2. Table **"ts_admins"**
3. Klik row `superadmin_thp` → edit password
4. Save

Password baru contoh:
```
superadmin_thp  →  THP@SuperAdmin2025!SecurePass123
admin_thp       →  THP@Admin2025!Pass456
```

---

## 5. Management & Maintenance

### Backup Data (Rutin)

**Setiap minggu:**
1. Supabase dashboard → project THP
2. Sidebar: **"Database"** → klik 3-dot menu → **"Download backup"**
3. Atau export manual per tabel:
   - Table Editor → pilih tabel
   - Click **"..."** → **"Export as CSV"** / **"JSON"**

### Monitoring Responden

Cek jumlah responden secara berkala:
1. Login dashboard admin
2. Tab **"Ringkasan"** → lihat summary cards
3. Atau tab **"Alumni"** / **"Instansi"** → lihat tabel

### Update Identitas Prodi

Jika ada perubahan struktur atau nama:

1. Edit file `index.html`:
   - Cari & ganti nama prodi di section "Identitas Program Studi"
   - Update deskripsi di hero section

2. Edit file `config.js`:
   ```javascript
   // Jika ada perubahan aspek penilaian
   export const ASPEK_PRODI = [
     { id:'ar1', lbl:'[nama aspek baru]' },
     // ... dll
   ];
   ```

3. Push ke GitHub:
   ```bash
   git add .
   git commit -m "Update prodi identity"
   git push
   ```

4. GitHub Pages auto-update dalam 1-5 menit

### Tambah Admin Baru

1. Login dashboard → Tab **"Kelola Admin"**
2. Click **"➕ Tambah Admin"**
3. Isi:
   - **Username**: (misal: `admin_adi`)
   - **Password**: (password kuat!)
   - **Nama Lengkap**: (misal: Adi Suryanto)
   - **Role**: pilih `superadmin` atau `admin`
4. Click **"Simpan"**

### Kelola Akses Admin

**Superadmin** → akses semua fitur:
- Lihat semua tab (Ringkasan, LAM, Analisis, Alumni, Instansi, Kelola Admin)
- Export data
- Edit data (delete responden, dll)

**Admin** → akses terbatas (baca saja):
- Hanya tab **"Analisis"** yang visible
- Bisa lihat grafik & pembahasan
- Tidak bisa export atau delete data

---

## Checklist Setup Lengkap

### Sebelum Launch Publik
- [ ] Database Supabase sudah siap (✅ DONE)
- [ ] GitHub repository sudah dibuat
- [ ] Semua file sudah ter-push ke GitHub
- [ ] GitHub Pages sudah enabled & live
- [ ] Test formulir alumni → bisa submit data
- [ ] Test dashboard admin → bisa login & lihat data
- [ ] **Password default sudah diganti** ⚠️
- [ ] Admin baru sudah ditambahkan (jika ada)
- [ ] URL deployment sudah di-share ke koordinator prodi

### Saat Launch
- [ ] Sosialisasi ke alumni (email, WhatsApp, dll)
- [ ] Training admin tentang dashboard
- [ ] Share link form ke berbagai channel (media sosial, website prodi, dll)

### Post-Launch
- [ ] Monitor responden secara berkala
- [ ] Backup data setiap minggu
- [ ] Ganti password admin setiap 3 bulan (security best practice)
- [ ] Update dokumentasi jika ada perubahan

---

## Catatan Penting

### URL Deployment
Ubah `YOUR_USERNAME` dengan username GitHub Anda:
```
https://YOUR_USERNAME.github.io/tracer-study-thp/
```

Contoh:
```
https://aribertyo.github.io/tracer-study-thp/
```

### Perubahan Kode
Setiap kali edit file:
1. Edit di laptop
2. `git add .` → `git commit -m "desc"` → `git push`
3. Tunggu 1-5 menit → GitHub Pages auto-update
4. Refresh browser (Ctrl+F5 untuk clear cache)

### Jika Ada Error di Production
1. Check browser console (F12 → Console)
2. Copy error message
3. Buka GitHub issue → paste error
4. Atau direct contact: [kontak developer]

---

## FAQ

**Q: Bagaimana jika lupa password admin?**
A: Edit langsung di Supabase table `ts_admins` → ubah kolom password.

**Q: Bisa ganti URL GitHub Pages ke domain sendiri?**
A: Bisa! Settings → Pages → Custom domain (butuh domain + DNS setup).

**Q: Apakah data aman?**
A: Ya, semua data di-encrypt di Supabase. Access hanya via HTTPS + API key.

**Q: Bisa download laporan akreditasi?**
A: Bisa! Tab Analisis → export as Word/Excel/PDF.

**Q: Apakah bisa offline?**
A: Tidak. Aplikasi butuh internet untuk submit formulir & access database.

---

## Kontak & Support

Jika ada pertanyaan atau error:
1. **Email**: [kontak administrator IT FPIK]
2. **WhatsApp**: [nomor support]
3. **Discord/Telegram**: [group support prodi]

---

**Setup Guide versi**: 1.0  
**Last updated**: September 2026

Selamat! Tracer Study THP siap digunakan! 🚀
