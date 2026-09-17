// ══════════════════════════════════════════════════════════
//  admin.js — Dashboard Admin
//  Superadmin : semua tab (Ringkasan, LAM, Analisis, Data Alumni,
//               Data Pengguna Lulusan, Kelola Admin)
//  Admin      : HANYA tab Analisis & Pembahasan
// ══════════════════════════════════════════════════════════

import { db }       from './db.js';
import { TBL_ALUMNI, TBL_EMPLOYER, TBL_ADMINS, TBL_STAKEHOLDER,
         ASPEK_LAM, ASPEK_PRODI, CHART_COLORS,
         TAB_ACCESS, ROLE, TAHUN_SURVEI, LKPS_COHORTS } from './config.js';
import { getUser, isSuperAdmin, isLoggedIn } from './auth.js';
import { ASPEK_KEPUASAN } from './stakeholder.js';

// ── Chart instances (untuk destroy saat re-render)
const charts = {};

// ════════════════════════════════════════════════════════
//  TAB NAVIGATION — dengan penegakan role
// ════════════════════════════════════════════════════════
export function admTab(tabId) {
  const user    = getUser();
  const allowed = TAB_ACCESS[user?.role] || [];

  if (!allowed.includes(tabId)) {
    console.warn(`[auth] Role "${user?.role}" tidak boleh akses tab "${tabId}"`);
    tabId = allowed[0] || 'analisis';
  }

  document.querySelectorAll('.adm-tab').forEach(btn => {
    btn.classList.toggle('a', btn.dataset.tab === tabId);
  });

  document.querySelectorAll('.ap').forEach(p => p.classList.remove('a'));
  const panel = document.getElementById(`ap-${tabId}`);
  if (panel) panel.classList.add('a');

  switch (tabId) {
    case 'ov':       return renderOverview();
    case 'lam':      return renderLAM();
    case 'analisis': return renderAnalisis();
    case 'al':       return renderTableAlumni();
    case 'em':       return renderTableEmployer();
    case 'sk':       return renderTableStakeholder();
    case 'usr':      return isSuperAdmin() ? loadAdmins() : null;
  }
}

window._admTab = admTab;

// ════════════════════════════════════════════════════════
//  DATA FETCHER (shared cache per session)
// ════════════════════════════════════════════════════════
let _cache = { al: null, em: null, sk: null, ts: null };

async function getData() {
  if (_cache.al && _cache.em) return _cache;
  const [{ data: al }, { data: em }, { data: sk }] = await Promise.all([
    db.from(TBL_ALUMNI).select('*').order('created_at', { ascending: false }),
    db.from(TBL_EMPLOYER).select('*').order('created_at', { ascending: false }),
    db.from(TBL_STAKEHOLDER).select('*').order('created_at', { ascending: false }),
  ]);
  _cache = { al: al || [], em: em || [], sk: sk || [], ts: Date.now() };
  return _cache;
}

export function clearCache() { _cache = { al: null, em: null, sk: null, ts: null }; }

// ════════════════════════════════════════════════════════
//  RINGKASAN (Superadmin only)
// ════════════════════════════════════════════════════════
async function renderOverview() {
  const { al, em } = await getData();
  const bekerja    = al.filter(a => a.status && !a.status.includes('Belum') && !a.status.includes('Studi')).length;
  const pctKerja   = al.length ? Math.round(bekerja / al.length * 100) : 0;
  const relevan    = al.filter(a => ['Sangat Erat','Erat'].includes(a.kesesuaian)).length;
  const pctRelevan = bekerja ? Math.round(relevan / bekerja * 100) : 0;
  const avg7       = avgRtg(em, ['rtg_er1','rtg_er2','rtg_er3','rtg_er4','rtg_er5','rtg_er6','rtg_er7']);
  const avgProdi   = avgRtg(al, ['rtg_ar1','rtg_ar2','rtg_ar3','rtg_ar4','rtg_ar5','rtg_ar6','rtg_ar7']);

  document.getElementById('sgrid').innerHTML = `
    <div class="sc"><div class="sl">Respons Alumni</div><div class="sv">${al.length}</div></div>
    <div class="sc"><div class="sl">Respons Instansi</div><div class="sv">${em.length}</div></div>
    <div class="sc"><div class="sl">% Lulusan Bekerja</div><div class="sv">${pctKerja}<span class="su">%</span></div></div>
    <div class="sc"><div class="sl">% Kerja Relevan</div><div class="sv">${pctRelevan}<span class="su">%</span></div></div>
    <div class="sc"><div class="sl">Rata-rata 7 Aspek LAM</div><div class="sv">${avg7}<span class="su">/5</span></div></div>
    <div class="sc"><div class="sl">Rata-rata Penilaian Prodi</div><div class="sv">${avgProdi}<span class="su">/5</span></div></div>`;

  if (al.length) {
    mkChart('ch-status', 'doughnut', countBy(al,'status'));
    const bidangMap = countBy(al,'bidang');
    const bKeys     = Object.keys(bidangMap).map(k => k.split('(')[0].trim().substring(0,22));
    mkChart('ch-bidang', 'bar', Object.fromEntries(bKeys.map((k,i) => [k, Object.values(bidangMap)[i]])));
    mkChart('ch-tunggu', 'doughnut', countBy(al,'tunggu'));
    mkChart('ch-sesuai', 'doughnut', countBy(al,'kesesuaian'));
    const ks  = ASPEK_PRODI.map(r => r.id.replace('ar','rtg_ar'));
    const rav = ks.map(k => avgOf(al, k));
    mkHBar('ch-rtg', ASPEK_PRODI.map(r => r.lbl.substring(0,32)), rav, '#006D77');
  }
  if (em.length) {
    mkChart('ch-puas', 'doughnut', countBy(em,'kepuasan'));
    const eks = ASPEK_LAM.map(r => r.id.replace('er','rtg_er'));
    const e7v = eks.map(k => avgOf(em, k));
    mkHBar('ch-7asp', ASPEK_LAM.map(r => r.lbl.substring(0,32)), e7v, '#003D5B');
  }
}

// ════════════════════════════════════════════════════════
//  LAPORAN LAM PTIP — Tabel 2.7B, 2.7C, 2.8B1, 2.8B2
//  Format persis mengikuti template resmi LKPS LAM PTIP IAPS 1.0
//  (kohort lulusan TS-4 / TS-3 / TS-2)
// ════════════════════════════════════════════════════════

// ── Util pencocokan nama & kategori ──
function _norm(s) { return (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' '); }

function matchAlumniLulusTahun(em, alList) {
  const byName = {};
  alList.forEach(a => { if (a.nama) byName[_norm(a.nama)] = a.lulus ? parseInt(a.lulus) : null; });
  return em.map(e => {
    // Prioritas 1: kolom "Tahun Alumni" yang diisi manual oleh admin pada tabel Data Pengguna Lulusan
    // Prioritas 2 (cadangan): pencocokan otomatis lewat nama alumni ke tabel Data Alumni
    const manual = e.alumni_lulus_tahun ? parseInt(e.alumni_lulus_tahun) : null;
    const viaName = e.alumni_nama ? (byName[_norm(e.alumni_nama)] ?? null) : null;
    return { ...e, _lulusTahun: manual ?? viaName ?? null };
  });
}

function wtBucket(t) {
  if (!t) return null;
  if (t.includes('< 6') || t.includes('Kurang dari 6')) return 'lt6';
  if (t.includes('> 18')) return 'gt18';
  return 'mid'; // 6–12 atau 12–18 bulan
}

function levelBucket(lv) {
  if (!lv) return null;
  const s = lv.toLowerCase();
  if (s.includes('multinasional') || s.includes('internasional')) return 'multi';
  if (s.includes('nasional')) return 'nas';
  if (s.includes('lokal')) return 'lok';
  return null;
}

// ── Konfigurasi "Jumlah Lulusan" per kohort (input manual — data institusi,
//    bukan jumlah responden survei, sehingga tidak bisa dihitung otomatis) ──
const LKPS_CFG_KEY = 'lkps_jumlah_lulusan_thp';
function getLkpsCfg()  { try { return JSON.parse(localStorage.getItem(LKPS_CFG_KEY) || '{}'); } catch { return {}; } }
function saveLkpsCfg(cfg) { localStorage.setItem(LKPS_CFG_KEY, JSON.stringify(cfg)); }
window._saveLkpsJumlah = function (key, value) {
  const cfg = getLkpsCfg();
  cfg[key] = value;
  saveLkpsCfg(cfg);
  renderLAM();
};

// ── Rencana Tindak Lanjut per aspek Tabel 2.7B (editable, tersimpan di browser) ──
const LKPS_RTL_KEY = 'lkps_rtl_27b_thp';
const DEFAULT_RTL_27B = [
  'Mempertahankan pembinaan karakter dan etika melalui mata kuliah etika profesi dan kegiatan kemahasiswaan',
  'Memperkuat kurikulum berbasis kompetensi dan memperbanyak praktikum/magang industri pengolahan hasil perikanan',
  'Mempertahankan kegiatan presentasi, seminar mahasiswa, dan pelatihan public speaking dalam kurikulum',
  'Memperkuat pembelajaran berbasis TI dan penggunaan perangkat lunak pengolahan data/produksi',
  'Memperbanyak pelatihan soft skill, workshop pengembangan karir, dan program mentoring bersama alumni',
  'Mempertahankan kegiatan berbasis tim seperti proyek kelompok, PKL, dan organisasi kemahasiswaan',
  'Memperbanyak pelatihan soft skill, workshop pengembangan karir, dan program mentoring bersama alumni',
];
function getLkpsRtl() {
  try { const v = JSON.parse(localStorage.getItem(LKPS_RTL_KEY) || 'null'); return Array.isArray(v) && v.length === 7 ? v : DEFAULT_RTL_27B.slice(); }
  catch { return DEFAULT_RTL_27B.slice(); }
}
window._saveLkpsRtl = function (idx, val) {
  const arr = getLkpsRtl();
  arr[idx] = val;
  localStorage.setItem(LKPS_RTL_KEY, JSON.stringify(arr));
};

// ── Perhitungan Tabel 2.7B (dua bagian sesuai format resmi) ──
function compute27B(em, alList) {
  const emY  = matchAlumniLulusTahun(em, alList);
  const rtl  = getLkpsRtl();
  const cfg  = getLkpsCfg();

  const partA = LKPS_COHORTS.map(c => ({
    ...c,
    jumlahLulusan: cfg[c.key + '_lulus'] || '',
    tanggapan: emY.filter(e => e._lulusTahun === c.year).length,
  }));
  const totalTanggapan = partA.reduce((s, r) => s + r.tanggapan, 0);
  const totalLulusan   = partA.reduce((s, r) => s + (parseInt(r.jumlahLulusan) || 0), 0);

  const partB = ASPEK_LAM.map((r, i) => {
    const k     = `rtg_er${i + 1}`;
    const vs    = em.map(e => e[k]).filter(Boolean);
    const total = vs.length;
    const cnt   = { 4: 0, 3: 0, 2: 0, 1: 0 };
    vs.forEach(v => { const c = v >= 4 ? 4 : v >= 3 ? 3 : v >= 2 ? 2 : 1; cnt[c]++; });
    const pctOf = c => total ? Math.round((cnt[c] / total) * 1000) / 10 : 0;
    const pSB = pctOf(4), pB = pctOf(3), pC = pctOf(2), pK = pctOf(1);
    const pKepuasan = Math.round((pSB + pB) * 10) / 10;
    return { no: i + 1, label: r.lbl, total, pSB, pB, pC, pK, pKepuasan, rtl: rtl[i] || '' };
  });
  const avgOf = key => partB.length ? Math.round(partB.reduce((s, r) => s + r[key], 0) / partB.length * 10) / 10 : 0;
  const jumlahRow = { pSB: avgOf('pSB'), pB: avgOf('pB'), pC: avgOf('pC'), pK: avgOf('pK'), pKepuasan: avgOf('pKepuasan') };

  return { partA, totalTanggapan, totalLulusan, partB, jumlahRow };
}

// ── Perhitungan Tabel 2.8B1 (Waktu Tunggu, per kohort) ──
function compute28B1(al) {
  const cfg  = getLkpsCfg();
  const rows = LKPS_COHORTS.map(c => {
    const cohort   = al.filter(a => parseInt(a.lulus) === c.year);
    const terlacak = cohort.length;
    return {
      ...c,
      jumlahLulusan: cfg[c.key + '_lulus'] || '',
      terlacak,
      lt6 : cohort.filter(a => wtBucket(a.tunggu) === 'lt6').length,
      mid : cohort.filter(a => wtBucket(a.tunggu) === 'mid').length,
      gt18: cohort.filter(a => wtBucket(a.tunggu) === 'gt18').length,
    };
  });
  const totLulusan  = rows.reduce((s, r) => s + (parseInt(r.jumlahLulusan) || 0), 0);
  const totTerlacak = rows.reduce((s, r) => s + r.terlacak, 0);
  const totLt6  = rows.reduce((s, r) => s + r.lt6, 0);
  const totMid  = rows.reduce((s, r) => s + r.mid, 0);
  const totGt18 = rows.reduce((s, r) => s + r.gt18, 0);
  const pctLt6  = totTerlacak ? Math.round(totLt6 / totTerlacak * 100) : 0;
  return { rows, totLulusan, totTerlacak, totLt6, totMid, totGt18, pctLt6 };
}

// ── Perhitungan Tabel 2.8B2 (Tempat Kerja / Berwirausaha, per kohort) ──
function compute28B2(al) {
  const cfg  = getLkpsCfg();
  const rows = LKPS_COHORTS.map(c => {
    const cohort   = al.filter(a => parseInt(a.lulus) === c.year);
    const terlacak = cohort.length;
    return {
      ...c,
      jumlahLulusan: cfg[c.key + '_lulus'] || '',
      terlacak,
      lok  : cohort.filter(a => levelBucket(a.level_kerja) === 'lok').length,
      nas  : cohort.filter(a => levelBucket(a.level_kerja) === 'nas').length,
      multi: cohort.filter(a => levelBucket(a.level_kerja) === 'multi').length,
    };
  });
  const totLulusan  = rows.reduce((s, r) => s + (parseInt(r.jumlahLulusan) || 0), 0);
  const totTerlacak = rows.reduce((s, r) => s + r.terlacak, 0);
  const totLok   = rows.reduce((s, r) => s + r.lok, 0);
  const totNas   = rows.reduce((s, r) => s + r.nas, 0);
  const totMulti = rows.reduce((s, r) => s + r.multi, 0);
  return { rows, totLulusan, totTerlacak, totLok, totNas, totMulti };
}

async function renderLAM() {
  const { al, em } = await getData();
  const div = document.getElementById('lam-report');
  if (!al.length && !em.length) { div.innerHTML = '<div class="empty">Belum ada data.</div>'; return; }

  const editable = isSuperAdmin();
  const c27b  = compute27B(em, al);
  const c28b1 = compute28B1(al);
  const c28b2 = compute28B2(al);

  const jumlahLulusanCell = (key, val) => editable
    ? `<input type="number" min="0" value="${val}" onchange="window._saveLkpsJumlah('${key}_lulus', this.value)"
        style="width:64px;font-size:12px;text-align:center;border:1px solid var(--g300);border-radius:4px;padding:3px">`
    : `${val || '–'}`;

  const rows27bA = c27b.partA.map(r => `<tr>
    <td>${r.label} (${r.year})</td>
    <td style="text-align:center">${jumlahLulusanCell(r.key, r.jumlahLulusan)}</td>
    <td style="text-align:center">${r.tanggapan}</td>
  </tr>`).join('');

  const rtlCell = (i, val) => editable
    ? `<textarea onchange="window._saveLkpsRtl(${i}, this.value)"
        style="width:100%;min-height:46px;font-size:11px;border:1px dashed var(--g300);border-radius:4px;padding:4px;resize:vertical">${val}</textarea>`
    : `<span style="font-size:11px">${val}</span>`;

  const rows27bB = c27b.partB.map(r => `<tr>
    <td style="text-align:center">${r.no}</td>
    <td>${r.label}</td>
    <td style="text-align:center">${r.pSB}%</td>
    <td style="text-align:center">${r.pB}%</td>
    <td style="text-align:center">${r.pC}%</td>
    <td style="text-align:center">${r.pK}%</td>
    <td style="text-align:center"><strong>${r.pKepuasan}%</strong></td>
    <td>${rtlCell(r.no - 1, r.rtl)}</td>
  </tr>`).join('');

  const rows28b1 = c28b1.rows.map(r => `<tr>
    <td>${r.label} (${r.year})</td>
    <td style="text-align:center">${jumlahLulusanCell(r.key, r.jumlahLulusan)}</td>
    <td style="text-align:center">${r.terlacak}</td>
    <td style="text-align:center">${r.lt6}</td>
    <td style="text-align:center">${r.mid}</td>
    <td style="text-align:center">${r.gt18}</td>
  </tr>`).join('');

  const rows28b2 = c28b2.rows.map(r => `<tr>
    <td>${r.label} (${r.year})</td>
    <td style="text-align:center">${jumlahLulusanCell(r.key, r.jumlahLulusan)}</td>
    <td style="text-align:center">${r.terlacak}</td>
    <td style="text-align:center">${r.lok}</td>
    <td style="text-align:center">${r.nas}</td>
    <td style="text-align:center">${r.multi}</td>
  </tr>`).join('');

  div.innerHTML = `
  <div style="display:flex;justify-content:flex-end;margin-bottom:16px" class="export-only-superadmin">
    <button class="exp-btn" onclick="window._exportLKPSExcel()" style="border-color:var(--green);color:var(--green);font-weight:600">
      📊 Download Excel Tabel LKPS (2.7B · 2.7C · 2.8B1 · 2.8B2)
    </button>
  </div>
  ${editable ? `<div class="info-box" style="margin-bottom:16px;font-size:12px">
      <strong>💡 Catatan:</strong> Isi kolom <em>Jumlah Lulusan</em> (total lulusan per angkatan dari data akademik prodi,
      bukan jumlah responden survei) secara manual — angka tersimpan otomatis di browser ini.
      Kolom <em>Rencana Tindak Lanjut</em> pada Tabel 2.7B dapat diedit langsung.
    </div>` : ''}

  <div class="info-box lam" style="margin-bottom:10px"><strong>📊 Tabel 2.7B — Kepuasan Pengguna Lulusan</strong></div>
  <div class="tw" style="margin-bottom:10px"><table class="dt">
    <thead><tr><th>Tahun Lulus</th><th>Jumlah Lulusan</th><th>Jumlah Tanggapan Kepuasan Pengguna yang Terlacak</th></tr></thead>
    <tbody>${rows27bA}
      <tr style="font-weight:700;background:var(--g100)"><td>Jumlah</td><td style="text-align:center">${c27b.totalLulusan}</td><td style="text-align:center">${c27b.totalTanggapan}</td></tr>
    </tbody>
  </table></div>
  <div class="tw" style="margin-bottom:24px;overflow-x:auto"><table class="dt" style="min-width:760px">
    <thead>
      <tr><th rowspan="2">No</th><th rowspan="2">Jenis Kemampuan</th><th colspan="4">Tingkat Kepuasan Pengguna (%)</th><th rowspan="2">Jumlah Persentase<br>Kepuasan Pengguna (%)</th><th rowspan="2">Rencana Tindak Lanjut oleh UPPS/PS</th></tr>
      <tr><th>Sangat Baik</th><th>Baik</th><th>Cukup</th><th>Kurang</th></tr>
    </thead>
    <tbody>${rows27bB}
      <tr style="font-weight:700;background:var(--g100)">
        <td colspan="2">Jumlah</td>
        <td style="text-align:center">${c27b.jumlahRow.pSB}%</td>
        <td style="text-align:center">${c27b.jumlahRow.pB}%</td>
        <td style="text-align:center">${c27b.jumlahRow.pC}%</td>
        <td style="text-align:center">${c27b.jumlahRow.pK}%</td>
        <td style="text-align:center">${c27b.jumlahRow.pKepuasan}%</td>
        <td></td>
      </tr>
    </tbody>
  </table></div>

  <div class="info-box lam" style="margin-bottom:10px"><strong>📊 Tabel 2.7C — Kepuasan Stakeholder Internal & Eksternal (${_cache.sk?.length || 0} responden)</strong></div>
  <div class="tw" style="margin-bottom:24px">${render27CTable(_cache.sk || [])}</div>

  <div class="info-box lam" style="margin-bottom:10px"><strong>📊 Tabel 2.8B1 — Waktu Tunggu Lulusan</strong></div>
  <div class="tw" style="margin-bottom:8px;overflow-x:auto"><table class="dt" style="min-width:640px">
    <thead>
      <tr><th rowspan="2">Tahun Lulus</th><th rowspan="2">Jumlah Lulusan</th><th rowspan="2">Jumlah Lulusan yang Terlacak</th><th colspan="3">Waktu Tunggu Mendapatkan Pekerjaan</th></tr>
      <tr><th>WT &lt; 6 bulan</th><th>6 ≤ WT ≤ 18 bulan</th><th>WT &gt; 18 bulan</th></tr>
    </thead>
    <tbody>${rows28b1}
      <tr style="font-weight:700;background:var(--g100)"><td>Jumlah</td><td style="text-align:center">${c28b1.totLulusan}</td><td style="text-align:center">${c28b1.totTerlacak}</td><td style="text-align:center">${c28b1.totLt6}</td><td style="text-align:center">${c28b1.totMid}</td><td style="text-align:center">${c28b1.totGt18}</td></tr>
    </tbody>
  </table></div>
  <div class="info-box lam" style="margin-bottom:24px"><strong>WT1 (Persentase lulusan dengan waktu tunggu &lt; 6 bulan) = ${c28b1.pctLt6}%</strong></div>

  <div class="info-box lam" style="margin-bottom:10px"><strong>📊 Tabel 2.8B2 — Tempat Kerja / Berwirausaha</strong></div>
  <div class="tw" style="overflow-x:auto"><table class="dt" style="min-width:700px">
    <thead>
      <tr><th rowspan="2">Tahun Lulus</th><th rowspan="2">Jumlah Lulusan</th><th rowspan="2">Jumlah Lulusan yang Terlacak</th><th colspan="3">Tingkat/Ukuran Tempat Kerja atau Berwirausaha</th></tr>
      <tr><th>Lokal/Wilayah/<br>Wirausaha Tdk Berbadan Hukum</th><th>Nasional/<br>Wirausaha Berbadan Hukum</th><th>Multinasional/<br>Internasional</th></tr>
    </thead>
    <tbody>${rows28b2}
      <tr style="font-weight:700;background:var(--g100)"><td>Jumlah</td><td style="text-align:center">${c28b2.totLulusan}</td><td style="text-align:center">${c28b2.totTerlacak}</td><td style="text-align:center">${c28b2.totLok}</td><td style="text-align:center">${c28b2.totNas}</td><td style="text-align:center">${c28b2.totMulti}</td></tr>
    </tbody>
  </table></div>`;
}

// ════════════════════════════════════════════════════════
//  ANALISIS & PEMBAHASAN
// ════════════════════════════════════════════════════════
async function renderAnalisis() {
  const { al, em, sk } = await getData();
  document.getElementById('cover-date').textContent =
    'Dicetak: ' + new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});

  const bekerja  = al.filter(a => a.status && !a.status.includes('Belum') && !a.status.includes('Studi')).length;
  const pctKerja = al.length ? Math.round(bekerja/al.length*100) : 0;
  document.getElementById('sec-profil').innerHTML = `
    <div class="sg" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
      <div class="sc"><div class="sl">Total Alumni</div><div class="sv">${al.length}</div></div>
      <div class="sc"><div class="sl">Total Instansi</div><div class="sv">${em.length}</div></div>
      <div class="sc"><div class="sl">% Bekerja</div><div class="sv">${pctKerja}<span class="su">%</span></div></div>
    </div>`;

  renderLAM27B(em, al);
  renderLAM27C(sk);
  renderLAM28B1(al);
  renderLAM28B2(al);
  renderRTL(al, em);
}

// Ringkasan Tabel 2.7B untuk laporan cetak — memakai perhitungan resmi (compute27B)
function renderLAM27B(em, al) {
  const el = document.getElementById('sec-27b');
  if (!em.length) { el.innerHTML = '<div class="empty">Belum ada data pengguna lulusan.</div>'; return; }
  const c = compute27B(em, al || []);
  const rows = c.partB.map(r => `<tr><td>${r.no}</td><td>${r.label}</td><td>${r.pKepuasan}%</td></tr>`).join('');
  el.innerHTML = `<div class="tw"><table class="dt">
    <thead><tr><th>No</th><th>Aspek Kompetensi</th><th>Jumlah % Kepuasan (SB+B)</th></tr></thead>
    <tbody>${rows}
      <tr style="font-weight:700"><td colspan="2">Jumlah</td><td>${c.jumlahRow.pKepuasan}%</td></tr>
    </tbody></table></div>`;
}

function renderLAM27C(sk) {
  const el = document.getElementById('sec-27c');
  if (!el) return;
  if (!sk || !sk.length) { el.innerHTML = '<div class="empty">Belum ada data kepuasan stakeholder.</div>'; return; }
  el.innerHTML = `<div class="tw">${render27CTable(sk)}</div>`;
}

function renderLAM28B1(al) {
  const el = document.getElementById('sec-28b1');
  if (!al.length) { el.innerHTML = '<div class="empty">Belum ada data alumni.</div>'; return; }
  const c = compute28B1(al);
  const rows = c.rows.map(r => `<tr><td>${r.label} (${r.year})</td><td>${r.terlacak}</td><td>${r.lt6}</td><td>${r.mid}</td><td>${r.gt18}</td></tr>`).join('');
  el.innerHTML = `<div class="tw"><table class="dt">
    <thead><tr><th>Tahun Lulus</th><th>Terlacak</th><th>WT&lt;6 bln</th><th>6≤WT≤18 bln</th><th>WT&gt;18 bln</th></tr></thead>
    <tbody>${rows}
      <tr style="font-weight:700"><td>Jumlah</td><td>${c.totTerlacak}</td><td>${c.totLt6}</td><td>${c.totMid}</td><td>${c.totGt18}</td></tr>
    </tbody></table></div>
    <p style="font-size:12px;margin-top:8px"><strong>WT1 = ${c.pctLt6}%</strong> (persentase lulusan dengan waktu tunggu &lt; 6 bulan)</p>`;
}

function renderLAM28B2(al) {
  const el = document.getElementById('sec-28b2');
  if (!al.length) { el.innerHTML = '<div class="empty">Belum ada data alumni.</div>'; return; }
  const c = compute28B2(al);
  const rows = c.rows.map(r => `<tr><td>${r.label} (${r.year})</td><td>${r.terlacak}</td><td>${r.lok}</td><td>${r.nas}</td><td>${r.multi}</td></tr>`).join('');
  el.innerHTML = `<div class="tw"><table class="dt">
    <thead><tr><th>Tahun Lulus</th><th>Terlacak</th><th>Lokal</th><th>Nasional</th><th>Multinasional</th></tr></thead>
    <tbody>${rows}
      <tr style="font-weight:700"><td>Jumlah</td><td>${c.totTerlacak}</td><td>${c.totLok}</td><td>${c.totNas}</td><td>${c.totMulti}</td></tr>
    </tbody></table></div>`;
}

function renderRTL(al, em) {
  const c28b1  = compute28B1(al);
  const avg7   = avgRtg(em, ['rtg_er1','rtg_er2','rtg_er3','rtg_er4','rtg_er5','rtg_er6','rtg_er7']);
  document.getElementById('tb-rtl').innerHTML = `
    <tr><td>1</td><td>Kepuasan Pengguna Lulusan</td><td>Rata-rata 7 aspek: ${avg7}/5</td>
        <td>Peningkatan kompetensi bahasa asing & TIK melalui kurikulum</td><td>1 tahun</td><td>Kaprodi</td></tr>
    <tr><td>2</td><td>Waktu Tunggu Kerja</td><td>WT1 (WT &lt; 6 bln): ${c28b1.pctLt6}%</td>
        <td>Perkuat program magang & career fair dengan instansi mitra</td><td>6 bulan</td><td>Kaprodi</td></tr>
    <tr><td>3</td><td>Kesesuaian Bidang Kerja</td><td>Data dari ${al.length} responden</td>
        <td>Penguatan link & match kurikulum dengan kebutuhan industri</td><td>1 tahun</td><td>Kaprodi</td></tr>`;
}

// ════════════════════════════════════════════════════════
//  DATA TABEL
// ════════════════════════════════════════════════════════
async function renderTableAlumni() {
  const { al } = await getData();
  document.getElementById('tb-al').innerHTML = al.length
    ? al.map(a => `<tr>
        <td><strong>${a.nama}</strong></td><td>${a.nim}</td><td>${a.lulus||'–'}</td>
        <td>${a.email}</td><td><span class="bdg bgt">${a.status||'–'}</span></td>
        <td>${a.instansi||'–'}</td><td>${(a.bidang||'–').split('(')[0].trim()}</td>
        <td>${a.level_kerja||'–'}</td><td><span class="bdg bgb">${a.tunggu||'–'}</span></td>
        <td><span class="bdg bgo">${a.kesesuaian||'–'}</span></td>
        <td>${a.gaji||'–'}</td><td>${a.rekomendasi||'–'}</td>
        <td style="font-size:10.5px;white-space:nowrap">${new Date(a.created_at).toLocaleString('id-ID')}</td>
        <td class="delete-only-superadmin">
          <button onclick="window._deleteRow('${TBL_ALUMNI}','${a.id}')"
            style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--red);color:var(--red);background:#fff;cursor:pointer">
            Hapus
          </button>
        </td></tr>`).join('')
    : '<tr><td colspan="14"><div class="empty">Belum ada data alumni.</div></td></tr>';
}

async function renderTableEmployer() {
  const { em } = await getData();
  const editable = isSuperAdmin();
  const alumniCell = e => editable
    ? `<input type="text" value="${(e.alumni_nama||'').replace(/"/g,'&quot;')}" placeholder="Nama alumni"
        onchange="window._updateEmployerField('${e.id}','alumni_nama',this.value)"
        style="width:130px;font-size:12px;border:1px solid var(--g300);border-radius:4px;padding:3px 5px">`
    : `${e.alumni_nama || '–'}`;
  const tahunCell = e => editable
    ? `<input type="number" min="2000" max="2035" value="${e.alumni_lulus_tahun||''}" placeholder="Thn"
        onchange="window._updateEmployerField('${e.id}','alumni_lulus_tahun',this.value?parseInt(this.value):null)"
        style="width:64px;font-size:12px;text-align:center;border:1px solid var(--g300);border-radius:4px;padding:3px">`
    : `${e.alumni_lulus_tahun || '–'}`;

  document.getElementById('tb-em').innerHTML = em.length
    ? em.map(e => `<tr>
        <td><strong>${e.instansi}</strong></td><td>${e.sektor}</td>
        <td>${e.kota}</td><td>${e.pengisi}</td><td>${e.email}</td>
        <td>${alumniCell(e)}</td>
        <td>${tahunCell(e)}</td>
        <td><span class="bdg bgg">${e.kepuasan||'–'}</span></td>
        <td>${e.rekrut||'–'}</td>
        <td style="font-size:10.5px;white-space:nowrap">${new Date(e.created_at).toLocaleString('id-ID')}</td>
        <td class="delete-only-superadmin">
          <button onclick="window._deleteRow('${TBL_EMPLOYER}','${e.id}')"
            style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--red);color:var(--red);background:#fff;cursor:pointer">
            Hapus
          </button>
        </td></tr>`).join('')
    : '<tr><td colspan="11"><div class="empty">Belum ada data pengguna lulusan.</div></td></tr>';
}

// Update satu field pada baris ts_employer (Alumni / Tahun Alumni) — tersimpan ke Supabase
window._updateEmployerField = async function (id, field, value) {
  if (!isSuperAdmin()) return alert('Akses ditolak.');
  const { error } = await db.from(TBL_EMPLOYER).update({ [field]: value }).eq('id', id);
  if (error) { alert('Gagal menyimpan: ' + error.message); return; }
  clearCache();
  await getData();
};

// ════════════════════════════════════════════════════════
//  TABEL 2.7C — KEPUASAN STAKEHOLDER (Format LAM PTIP Lengkap)
// ════════════════════════════════════════════════════════

// Simpan data populasi & instrumen & tindak lanjut di localStorage-like (db tabel ts_sk_config)
const SK_CONFIG_KEY = 'sk_27c_config';

function getSkConfig() {
  try { return JSON.parse(localStorage.getItem(SK_CONFIG_KEY) || '{}'); } catch { return {}; }
}
function saveSkConfig(cfg) {
  localStorage.setItem(SK_CONFIG_KEY, JSON.stringify(cfg));
}

// PENTING: "value" harus SAMA PERSIS dengan value radio button "sk-jenis" di formulir
// (index.html #sk-jenis-grp), karena itulah nilai yang benar-benar tersimpan di kolom
// `jenis` tabel ts_stakeholder. "label" hanya untuk tampilan ringkas di laporan.
const JENIS_LIST = [
  { value: 'Mahasiswa Aktif',              label: 'Mahasiswa' },
  { value: 'Dosen Aktif',                  label: 'Dosen' },
  { value: 'Tenaga Kependidikan Aktif',    label: 'Tenaga Kependidikan' },
  { value: 'Mitra',                        label: 'Mitra' },
  { value: 'Lulusan',                      label: 'Lulusan' },
  { value: 'Pengguna Lulusan',             label: 'Pengguna Lulusan' },
  { value: 'Lainnya',                      label: 'Lainnya' },
];
const TAHUN = { TS: TAHUN_SURVEI.TS, TS1: TAHUN_SURVEI.TS_1, TS2: TAHUN_SURVEI.TS_2 };

function render27CTable(sk) {
  const cfg = getSkConfig();

  const headerRow = `
    <thead>
      <tr style="background:var(--navy);color:#fff;font-size:11px">
        <th rowspan="3" style="text-align:center;vertical-align:middle;width:30px">No</th>
        <th rowspan="3" style="text-align:center;vertical-align:middle;min-width:110px">Stakeholder</th>
        <th colspan="2" style="text-align:center">Instrumen</th>
        <th colspan="3" style="text-align:center">Jumlah Responden</th>
        <th colspan="3" style="text-align:center">% Keterwakilan Responden</th>
        <th colspan="4" style="text-align:center">Jml Responden Menjawab (SB=4, B=3, C=2, K=1)</th>
        <th rowspan="3" style="text-align:center;vertical-align:middle;min-width:60px">Skor</th>
        <th rowspan="3" style="text-align:center;vertical-align:middle;min-width:120px">Tindak Lanjut</th>
      </tr>
      <tr style="background:var(--navy-md);color:#fff;font-size:10px">
        <th style="text-align:center">Ada</th>
        <th style="text-align:center">Tidak Ada</th>
        <th style="text-align:center">TS-2<br>(${TAHUN.TS2})</th>
        <th style="text-align:center">TS-1<br>(${TAHUN.TS1})</th>
        <th style="text-align:center">TS<br>(${TAHUN.TS})</th>
        <th style="text-align:center">TS-2<br>(${TAHUN.TS2})</th>
        <th style="text-align:center">TS-1<br>(${TAHUN.TS1})</th>
        <th style="text-align:center">TS<br>(${TAHUN.TS})</th>
        <th style="text-align:center">SB</th>
        <th style="text-align:center">B</th>
        <th style="text-align:center">C</th>
        <th style="text-align:center">KB</th>
      </tr>
      <tr style="background:var(--g100);font-size:10px;color:var(--g600)">
        <th style="text-align:center">(3)</th><th style="text-align:center">(4)</th>
        <th style="text-align:center">(5)</th><th style="text-align:center">(6)</th><th style="text-align:center">(7)</th>
        <th style="text-align:center">(8)</th><th style="text-align:center">(9)</th><th style="text-align:center">(10)</th>
        <th style="text-align:center">(11)</th><th style="text-align:center">(12)</th>
        <th style="text-align:center">(13)</th><th style="text-align:center">(14)</th>
      </tr>
    </thead>`;

  const rows = JENIS_LIST.map((jObj, idx) => {
    const j     = jObj.value;   // nilai asli di kolom `jenis` (harus cocok persis dengan form)
    const jLbl  = jObj.label;   // label ringkas untuk tampilan
    const no    = idx < 6 ? idx + 1 : '...';
    const jKey  = jLbl.replace(/\s+/g,'_');
    const c     = cfg[jKey] || {};

    // Responden per tahun dari DB
    const rTS2  = sk.filter(x => x.jenis === j && x.tahun_survei === TAHUN.TS2).length;
    const rTS1  = sk.filter(x => x.jenis === j && x.tahun_survei === TAHUN.TS1).length;
    const rTS   = sk.filter(x => x.jenis === j && x.tahun_survei === TAHUN.TS).length;

    // Populasi (input manual admin)
    const popTS2 = parseInt(c.popTS2 || 0);
    const popTS1 = parseInt(c.popTS1 || 0);
    const popTS  = parseInt(c.popTS  || 0);

    const pct = (r, p) => (p > 0 ? Math.round(r / p * 100) + '%' : '–');

    // SB/B/C/KB hanya dari TS (tahun terbaru) — sesuai format LAM PTIP kolom 11-14
    const grpTS = sk.filter(x => x.jenis === j && x.tahun_survei === TAHUN.TS);
    const keys  = ['rtg_sk1','rtg_sk2','rtg_sk3','rtg_sk4','rtg_sk5','rtg_sk6','rtg_sk7'];
    const cnt   = { SB:0, B:0, C:0, K:0 };
    grpTS.forEach(x => {
      const vals = keys.map(k => x[k]).filter(Boolean);
      if (!vals.length) return;
      const avg = vals.reduce((a,b) => a+b, 0) / vals.length;
      if (avg >= 3.5) cnt.SB++; else if (avg >= 2.5) cnt.B++;
      else if (avg >= 1.5) cnt.C++; else cnt.K++;
    });

    // Skor rata-rata dari semua tahun
    const allGrp = sk.filter(x => x.jenis === j);
    let skor = '–';
    if (allGrp.length) {
      const tot = allGrp.reduce((s, x) => {
        const vals = keys.map(k => x[k]).filter(Boolean);
        return s + (vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0);
      }, 0);
      skor = (tot / allGrp.length).toFixed(2);
    }
    const skorBadge = skor !== '–' ? (parseFloat(skor)>=3.5?'bgg':parseFloat(skor)>=2.5?'bgt':parseFloat(skor)>=1.5?'bgo':'') : '';

    // Instrumen & Tindak Lanjut — editable oleh superadmin
    const instrAda    = c.instrAda    === '1';
    const instrTidak  = c.instrAda    === '0';
    const tindakLanjut = c.tindak || '';

    return `<tr>
      <td style="text-align:center;font-weight:600">${no}</td>
      <td style="font-weight:500">${jLbl}${jLbl==='Lulusan'?'<span style="color:var(--g500);font-size:10px"> (*)</span>':''}</td>
      <td style="text-align:center">
        ${isSuperAdmin() ? `<select onchange="window._skCfgSave('${jKey}','instrAda',this.value)"
          style="font-size:11px;padding:2px 4px;border:1px solid var(--g200);border-radius:4px;width:60px">
          <option value="">–</option>
          <option value="1" ${instrAda?'selected':''}>✓ Ada</option>
          <option value="0" ${instrTidak?'selected':''}>✗ Tidak</option>
        </select>` : `<span style="font-size:11px">${instrAda?'✓ Ada':instrTidak?'✗ Tidak':'–'}</span>`}
      </td>
      <td style="text-align:center">
        <span style="font-size:12px">${instrTidak?'✓':'–'}</span>
      </td>
      <td style="text-align:center">
        <input type="number" min="0" value="${rTS2||''}"
          style="width:52px;font-size:11px;text-align:center;border:1px solid var(--g200);border-radius:4px;padding:2px"
          readonly title="Dihitung otomatis dari database (${rTS2} responden tahun ${TAHUN.TS2})">
      </td>
      <td style="text-align:center">
        <input type="number" min="0" value="${rTS1||''}"
          style="width:52px;font-size:11px;text-align:center;border:1px solid var(--g200);border-radius:4px;padding:2px"
          readonly title="Dihitung otomatis dari database (${rTS1} responden tahun ${TAHUN.TS1})">
      </td>
      <td style="text-align:center">
        <input type="number" min="0" value="${rTS||''}"
          style="width:52px;font-size:11px;text-align:center;border:1px solid var(--g200);border-radius:4px;padding:2px"
          readonly title="Dihitung otomatis dari database (${rTS} responden tahun ${TAHUN.TS})">
      </td>
      <td style="text-align:center">
        <span title="Populasi TS-2: ${popTS2 || 'belum diisi'}">${pct(rTS2, popTS2)}</span>
        ${isSuperAdmin()?`<br><input type="number" min="0" value="${popTS2||''}" placeholder="Pop."
          onchange="window._skCfgSave('${jKey}','popTS2',this.value)"
          style="width:52px;font-size:10px;margin-top:2px;border:1px dashed var(--g300);border-radius:4px;padding:1px;text-align:center"
          title="Isi jumlah total populasi ${j} tahun ${TAHUN.TS2}">` : ''}
      </td>
      <td style="text-align:center">
        <span>${pct(rTS1, popTS1)}</span>
        ${isSuperAdmin()?`<br><input type="number" min="0" value="${popTS1||''}" placeholder="Pop."
          onchange="window._skCfgSave('${jKey}','popTS1',this.value)"
          style="width:52px;font-size:10px;margin-top:2px;border:1px dashed var(--g300);border-radius:4px;padding:1px;text-align:center"
          title="Isi jumlah total populasi ${j} tahun ${TAHUN.TS1}">` : ''}
      </td>
      <td style="text-align:center">
        <span>${pct(rTS, popTS)}</span>
        ${isSuperAdmin()?`<br><input type="number" min="0" value="${popTS||''}" placeholder="Pop."
          onchange="window._skCfgSave('${jKey}','popTS',this.value)"
          style="width:52px;font-size:10px;margin-top:2px;border:1px dashed var(--g300);border-radius:4px;padding:1px;text-align:center"
          title="Isi jumlah total populasi ${j} tahun ${TAHUN.TS}">` : ''}
      </td>
      <td style="text-align:center">${cnt.SB||'–'}</td>
      <td style="text-align:center">${cnt.B||'–'}</td>
      <td style="text-align:center">${cnt.C||'–'}</td>
      <td style="text-align:center">${cnt.K||'–'}</td>
      <td style="text-align:center"><span class="bdg ${skorBadge}">${skor}</span></td>
      <td>
        ${isSuperAdmin()?`<textarea onchange="window._skCfgSave('${jKey}','tindak',this.value)"
          style="width:100%;font-size:11px;border:1px dashed var(--g300);border-radius:4px;padding:4px;resize:vertical;min-height:48px"
          placeholder="Isi tindak lanjut...">${tindakLanjut}</textarea>` :
          `<span style="font-size:11px;color:var(--g600)">${tindakLanjut||'–'}</span>`}
      </td>
    </tr>`;
  }).join('');

  const keterangan = `<p style="font-size:11px;color:var(--g500);margin-top:10px;font-style:italic">
    <strong>Keterangan:</strong> Skala penilaian responden: SB (Sangat Baik) = 4, B (Baik) = 3, C (Cukup) = 2, K (Kurang) = 1.
    Skor akhir dikonversi ke skala 1–4 sesuai panduan LAM PTIP IAPS 1.0.<br>
    ${isSuperAdmin()?'<span style="color:var(--teal)">💡 <strong>Superadmin:</strong> Isi kolom populasi (input kecil di bawah %) dan tindak lanjut. Data tersimpan otomatis di browser.</span>':''}
  </p>`;

  return `<div class="tw" style="overflow-x:auto">
    <table class="dt" style="min-width:900px;font-size:12px">
      ${headerRow}
      <tbody>${rows}</tbody>
    </table>
    ${keterangan}
  </div>`;
}

// Save config ke localStorage
window._skCfgSave = function(jKey, field, value) {
  if (!isSuperAdmin()) return;
  const cfg = getSkConfig();
  if (!cfg[jKey]) cfg[jKey] = {};
  cfg[jKey][field] = value;
  saveSkConfig(cfg);
  // Update kolom Tidak Ada secara sinkron
  if (field === 'instrAda') {
    // re-render akan dilakukan saat tab dibuka ulang
  }
};

async function renderTableStakeholder() {
  const { sk } = await getData();
  const el = document.getElementById('tb-sk');
  if (!el) return;

  el.innerHTML = sk.length
    ? sk.map(s => {
        const th = s.tahun_survei;
        const tsLabel = th === TAHUN_SURVEI.TS ? `TS (${th})` : th === TAHUN_SURVEI.TS_1 ? `TS-1 (${th})` : th === TAHUN_SURVEI.TS_2 ? `TS-2 (${th})` : th||'–';
        return `<tr>
        <td><span class="bdg bgt">${s.jenis||'–'}</span></td>
        <td><span class="bdg ${th===TAHUN_SURVEI.TS?'bgg':th===TAHUN_SURVEI.TS_1?'bgt':'bgo'}">${tsLabel}</span></td>
        <td><strong>${s.nama||'–'}</strong></td>
        <td>${s.instansi||'–'}</td>
        <td>${s.email||'–'}</td>
        <td style="text-align:center">${s.rtg_sk1||'–'}</td>
        <td style="text-align:center">${s.rtg_sk2||'–'}</td>
        <td style="text-align:center">${s.rtg_sk3||'–'}</td>
        <td style="text-align:center">${s.rtg_sk4||'–'}</td>
        <td style="text-align:center">${s.rtg_sk5||'–'}</td>
        <td style="text-align:center">${s.rtg_sk6||'–'}</td>
        <td style="text-align:center">${s.rtg_sk7||'–'}</td>
        <td><span class="bdg bgg">${s.kepuasan||'–'}</span></td>
        <td style="font-size:10.5px;white-space:nowrap">${new Date(s.created_at).toLocaleString('id-ID')}</td>
        <td class="delete-only-superadmin">
          <button onclick="window._deleteRow('${TBL_STAKEHOLDER}','${s.id}')"
            style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--red);color:var(--red);background:#fff;cursor:pointer">
            Hapus
          </button>
        </td></tr>`;
      }).join('')
    : '<tr><td colspan="15"><div class="empty">Belum ada data stakeholder.</div></td></tr>';
}

// Patch deleteRow agar support TBL_STAKEHOLDER
window._deleteRow = async function(table, id) {
  if (!isSuperAdmin()) return alert('Akses ditolak.');
  if (!confirm('Yakin hapus data ini?')) return;
  await db.from(table).delete().eq('id', id);
  clearCache();
  if (table === TBL_ALUMNI)       renderTableAlumni();
  else if (table === TBL_EMPLOYER) renderTableEmployer();
  else if (table === TBL_STAKEHOLDER) renderTableStakeholder();
};

// ════════════════════════════════════════════════════════
//  KELOLA ADMIN
// ════════════════════════════════════════════════════════
export async function loadAdmins() {
  if (!isSuperAdmin()) return;
  const { data, error } = await db.from(TBL_ADMINS).select('*').order('created_at');
  if (error) {
    document.getElementById('tb-admins').innerHTML = `<tr><td colspan="6">Error: ${error.message}</td></tr>`;
    return;
  }
  document.getElementById('tb-admins').innerHTML = (data||[]).map(u => `<tr>
    <td><strong>${u.username}</strong></td>
    <td>${u.full_name||'–'}</td>
    <td><span class="bdg ${u.role===ROLE.SUPERADMIN?'bgb':'bgt'}">${u.role}</span></td>
    <td><span class="bdg ${u.is_active?'bgg':''}">${u.is_active?'Aktif':'Nonaktif'}</span></td>
    <td style="font-size:10.5px">${new Date(u.created_at).toLocaleDateString('id-ID')}</td>
    <td>${u.role!==ROLE.SUPERADMIN?`
      <button onclick="window._toggleAdmin(${u.id},${u.is_active})"
        style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--g200);background:#fff;cursor:pointer">
        ${u.is_active?'Nonaktifkan':'Aktifkan'}
      </button>
      <button onclick="window._deleteAdmin(${u.id})"
        style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--red);color:var(--red);background:#fff;cursor:pointer;margin-left:4px">
        Hapus
      </button>`:'–'}
    </td></tr>`).join('');
}

export async function addAdmin() {
  if (!isSuperAdmin()) return;
  const username = document.getElementById('new-username').value.trim();
  const password = document.getElementById('new-password').value.trim();
  const nama     = document.getElementById('new-nama').value.trim();
  const role     = document.getElementById('new-role').value;
  const errBox   = document.getElementById('add-admin-err');
  errBox.style.display = 'none';
  if (!username||!password) {
    errBox.textContent='Username dan password wajib diisi.';
    errBox.style.display='block'; return;
  }
  const { error } = await db.from(TBL_ADMINS).insert({ username, password, full_name:nama, role, is_active:true });
  if (error) { errBox.textContent='Gagal: '+error.message; errBox.style.display='block'; return; }
  ['new-username','new-password','new-nama'].forEach(id=>document.getElementById(id).value='');
  loadAdmins();
}

window._toggleAdmin = async (id, isActive) => {
  if (!isSuperAdmin()) return;
  await db.from(TBL_ADMINS).update({ is_active:!isActive }).eq('id',id);
  loadAdmins();
};
window._deleteAdmin = async (id) => {
  if (!isSuperAdmin()) return;
  if (!confirm('Yakin hapus akun admin ini?')) return;
  await db.from(TBL_ADMINS).delete().eq('id',id);
  loadAdmins();
};
window._addAdmin = addAdmin;

// ════════════════════════════════════════════════════════
//  GENERATE NARASI AI
// ════════════════════════════════════════════════════════
export async function generateAINarasi() {
  const { al, em } = await getData();
  const btn  = document.getElementById('btn-ai');
  const txt  = document.getElementById('btn-ai-txt');
  const load = document.getElementById('narasi-loading');
  const cont = document.getElementById('narasi-content');

  btn.disabled = true; txt.textContent = 'Menganalisis...';
  load.style.display = 'block'; cont.innerHTML = '';

  const bekerja  = al.filter(a=>a.status&&!a.status.includes('Belum')&&!a.status.includes('Studi')).length;
  const pctKerja = al.length?Math.round(bekerja/al.length*100):0;
  const avg7     = avgRtg(em,['rtg_er1','rtg_er2','rtg_er3','rtg_er4','rtg_er5','rtg_er6','rtg_er7']);
  const avgProdi = avgRtg(al,['rtg_ar1','rtg_ar2','rtg_ar3','rtg_ar4','rtg_ar5','rtg_ar6','rtg_ar7']);
  const lt6      = al.filter(a=>a.tunggu&&(a.tunggu.includes('<')||a.tunggu.includes('Kurang dari 6'))).length;
  const pctLt6   = al.length?Math.round(lt6/al.length*100):0;

  const prompt = `Anda adalah analis akademik untuk akreditasi LAM PTIP.
Buatlah narasi pembahasan hasil survei mutu Program Studi Teknologi Hasil Perikanan (THP) FPIK UNSRAT
dalam bahasa Indonesia yang formal dan akademis (±500 kata).

DATA TRACER STUDY:
- Total responden alumni: ${al.length}
- Total responden pengguna lulusan: ${em.length}
- Persentase lulusan yang bekerja: ${pctKerja}%
- Persentase lulusan dengan waktu tunggu <6 bulan: ${pctLt6}%
- Rata-rata kepuasan pengguna lulusan (7 aspek LAM PTIP Tabel 2.7B): ${avg7}/5
- Rata-rata penilaian prodi oleh alumni: ${avgProdi}/5
- 3 bidang kerja terbanyak: ${Object.entries(countBy(al,'bidang')).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]).join(', ')}
- Kepuasan pengguna lulusan: ${JSON.stringify(countBy(em,'kepuasan'))}

Struktur narasi:
1. Pendahuluan singkat
2. Profil dan penyerapan lulusan (Tabel 2.8B1 & 2.8B2)
3. Kepuasan pengguna lulusan (Tabel 2.7B)
4. Penilaian alumni terhadap program studi
5. Kesimpulan dan rekomendasi tindak lanjut`;

  try {
    const res  = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1200, messages:[{role:'user',content:prompt}] })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || 'Gagal mendapatkan respons AI.';
    cont.innerHTML = text.split('\n\n').map(p => `<p style="margin-bottom:12px">${p}</p>`).join('');
  } catch(e) {
    cont.innerHTML = `<p style="color:var(--red)">Gagal terhubung ke API AI: ${e.message}</p>`;
  } finally {
    load.style.display = 'none';
    btn.disabled = false; txt.textContent = 'Generate Narasi AI';
  }
}
window._generateAI = generateAINarasi;

// ════════════════════════════════════════════════════════
//  EXPORT — CSV Alumni & Employer
// ════════════════════════════════════════════════════════
export async function exportCSV(type) {
  if (!isLoggedIn()) return alert('Silakan login terlebih dahulu.');
  const { al, em, sk } = await getData();
  const data = type==='alumni' ? al : type==='stakeholder' ? sk : em;
  if (!data.length) return alert('Belum ada data untuk diekspor.');
  const headers = Object.keys(data[0]);
  const rows    = data.map(d=>headers.map(h=>`"${String(d[h]||'').replace(/"/g,'""')}"`));
  const csv     = [headers.join(','), ...rows.map(r=>r.join(','))].join('\n');
  const a       = document.createElement('a');
  a.href        = 'data:text/csv;charset=utf-8,﻿'+encodeURIComponent(csv);
  a.download    = `survei_thp_${type}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

// ════════════════════════════════════════════════════════
//  HELPER — muat SheetJS & bangun baris data mentah
// ════════════════════════════════════════════════════════
async function ensureXLSX() {
  if (!window.XLSX) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return window.XLSX;
}

function alRawRows(al) {
  return al.map(a => ({
    'Nama'        : a.nama||'',
    'NIM'         : a.nim||'',
    'Thn Masuk'   : a.masuk||'',
    'Thn Lulus'   : a.lulus||'',
    'Email'       : a.email||'',
    'HP'          : a.hp||'',
    'Gender'      : a.gender||'',
    'IPK'         : a.ipk||'',
    'Status'      : a.status||'',
    'Waktu Tunggu': a.tunggu||'',
    'Instansi'    : a.instansi||'',
    'Jabatan'     : a.jabatan||'',
    'Kota'        : a.kota||'',
    'Bidang'      : a.bidang||'',
    'Level Kerja' : a.level_kerja||'',
    'Gaji'        : a.gaji||'',
    'Kesesuaian'  : a.kesesuaian||'',
    'Rekomendasi' : a.rekomendasi||'',
    'Rtg AR1'     : a.rtg_ar1||'',
    'Rtg AR2'     : a.rtg_ar2||'',
    'Rtg AR3'     : a.rtg_ar3||'',
    'Rtg AR4'     : a.rtg_ar4||'',
    'Rtg AR5'     : a.rtg_ar5||'',
    'Rtg AR6'     : a.rtg_ar6||'',
    'Rtg AR7'     : a.rtg_ar7||'',
    'Tgl Isi'     : new Date(a.created_at).toLocaleDateString('id-ID'),
  }));
}

function emRawRows(em) {
  return em.map(e => ({
    'Instansi'    : e.instansi||'',
    'Sektor'      : e.sektor||'',
    'Kota'        : e.kota||'',
    'Pengisi'     : e.pengisi||'',
    'Jabatan'     : e.jab_pengisi||'',
    'Email'       : e.email||'',
    'Telp'        : e.telp||'',
    'Alumni'      : e.alumni_nama||'',
    'Tahun Alumni': e.alumni_lulus_tahun||'',
    'Jab Alumni'  : e.alumni_jab||'',
    'Lama Kerja'  : e.lama||'',
    'Rtg ER1'     : e.rtg_er1||'',
    'Rtg ER2'     : e.rtg_er2||'',
    'Rtg ER3'     : e.rtg_er3||'',
    'Rtg ER4'     : e.rtg_er4||'',
    'Rtg ER5'     : e.rtg_er5||'',
    'Rtg ER6'     : e.rtg_er6||'',
    'Rtg ER7'     : e.rtg_er7||'',
    'Kepuasan'    : e.kepuasan||'',
    'Rekrut'      : e.rekrut||'',
    'Tgl Isi'     : new Date(e.created_at).toLocaleDateString('id-ID'),
  }));
}

function skRawRows(sk) {
  return sk.map(s => ({
    'Jenis'       : s.jenis||'',
    'Tahun Survei': s.tahun_survei||'',
    'Nama'        : s.nama||'',
    'Instansi'    : s.instansi||'',
    'Email'       : s.email||'',
    'Rtg SK1'     : s.rtg_sk1||'',
    'Rtg SK2'     : s.rtg_sk2||'',
    'Rtg SK3'     : s.rtg_sk3||'',
    'Rtg SK4'     : s.rtg_sk4||'',
    'Rtg SK5'     : s.rtg_sk5||'',
    'Rtg SK6'     : s.rtg_sk6||'',
    'Rtg SK7'     : s.rtg_sk7||'',
    'Kepuasan'    : s.kepuasan||'',
    'Tgl Isi'     : new Date(s.created_at).toLocaleDateString('id-ID'),
  }));
}

// Bangun lembar Tabel 2.7C persis format resmi LKPS (dipakai di exportLKPSExcel)
function build27CAOA(sk) {
  const cfg  = getSkConfig();
  const rows = [];
  rows.push(['Tabel 2.7C Kepuasan Stakeholder Internal dan Eksternal']);
  rows.push(['Diisi oleh pengusul dari Program Studi Teknologi Hasil Perikanan (THP) FPIK UNSRAT']);
  rows.push(['No','Stakeholder','Instrumen','','Jumlah Responden','','','Persentase Keterwakilan Responden','','',
              'Jumlah Responden yang menjawab (SB=4, B=3, C=2, K=1)','','','','Skor','Tindak Lanjut']);
  rows.push(['','','Ada','Tidak Ada',
              `TS-2 (${TAHUN_SURVEI.TS_2})`, `TS-1 (${TAHUN_SURVEI.TS_1})`, `TS (${TAHUN_SURVEI.TS})`,
              `TS-2 (${TAHUN_SURVEI.TS_2})`, `TS-1 (${TAHUN_SURVEI.TS_1})`, `TS (${TAHUN_SURVEI.TS})`,
              'SB','B','C','KB','','']);

  JENIS_LIST.forEach((jObj, idx) => {
    const j    = jObj.value;
    const jLbl = jObj.label;
    const jKey = jLbl.replace(/\s+/g,'_');
    const c    = cfg[jKey] || {};
    const rTS2 = sk.filter(x=>x.jenis===j && x.tahun_survei===TAHUN_SURVEI.TS_2).length;
    const rTS1 = sk.filter(x=>x.jenis===j && x.tahun_survei===TAHUN_SURVEI.TS_1).length;
    const rTS  = sk.filter(x=>x.jenis===j && x.tahun_survei===TAHUN_SURVEI.TS).length;
    const popTS2 = parseInt(c.popTS2||0), popTS1 = parseInt(c.popTS1||0), popTS = parseInt(c.popTS||0);
    const pct  = (r,p) => p>0 ? Math.round(r/p*100)+'%' : '-';
    const grpTS = sk.filter(x=>x.jenis===j && x.tahun_survei===TAHUN_SURVEI.TS);
    const keys  = ['rtg_sk1','rtg_sk2','rtg_sk3','rtg_sk4','rtg_sk5','rtg_sk6','rtg_sk7'];
    const cnt   = { SB:0, B:0, C:0, K:0 };
    grpTS.forEach(x => {
      const vals = keys.map(k=>x[k]).filter(Boolean);
      if (!vals.length) return;
      const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
      if (avg>=3.5) cnt.SB++; else if (avg>=2.5) cnt.B++; else if (avg>=1.5) cnt.C++; else cnt.K++;
    });
    const allGrp = sk.filter(x=>x.jenis===j);
    let skor = '-';
    if (allGrp.length) {
      const tot = allGrp.reduce((s,x) => {
        const vals = keys.map(k=>x[k]).filter(Boolean);
        return s + (vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0);
      }, 0);
      skor = (tot/allGrp.length).toFixed(2);
    }
    rows.push([idx+1, jLbl+(jLbl==='Lulusan'?' (*)':''), c.instrAda==='1'?'Ada':'', c.instrAda==='0'?'Tidak Ada':'',
               rTS2, rTS1, rTS, pct(rTS2,popTS2), pct(rTS1,popTS1), pct(rTS,popTS),
               cnt.SB, cnt.B, cnt.C, cnt.K, skor, c.tindak||'']);
  });

  return {
    rows,
    merges: [
      { s:{r:0,c:0}, e:{r:0,c:15} }, { s:{r:1,c:0}, e:{r:1,c:15} },
      { s:{r:2,c:0}, e:{r:3,c:0} },  { s:{r:2,c:1}, e:{r:3,c:1} },
      { s:{r:2,c:2}, e:{r:2,c:3} },  { s:{r:2,c:4}, e:{r:2,c:6} },
      { s:{r:2,c:7}, e:{r:2,c:9} },  { s:{r:2,c:10}, e:{r:2,c:13} },
      { s:{r:2,c:14}, e:{r:3,c:14} },{ s:{r:2,c:15}, e:{r:3,c:15} },
    ],
    cols: [{wch:5},{wch:20},{wch:8},{wch:9},{wch:8},{wch:8},{wch:8},{wch:9},{wch:9},{wch:9},{wch:6},{wch:6},{wch:6},{wch:6},{wch:8},{wch:40}],
  };
}

// ════════════════════════════════════════════════════════
//  EXPORT — Tabel LKPS LAM PTIP (2.7B · 2.7C · 2.8B1 · 2.8B2)
//  Format & susunan kolom mengikuti template resmi LKPS IAPS 1.0
// ════════════════════════════════════════════════════════
export async function exportLKPSExcel() {
  if (!isLoggedIn()) return alert('Silakan login terlebih dahulu.');
  const { al, em, sk } = await getData();
  if (!al.length && !em.length) return alert('Belum ada data.');

  const XLSX  = await ensureXLSX();
  const wb    = XLSX.utils.book_new();
  const c27b  = compute27B(em, al);
  const c28b1 = compute28B1(al);
  const c28b2 = compute28B2(al);

  // ── Sheet Tabel 2.7B ──
  const aoa27b = [];
  aoa27b.push(['Tabel 2.7B Kepuasan Pengguna Lulusan']);
  aoa27b.push(['Diisi oleh pengusul dari Program Studi Teknologi Hasil Perikanan (THP) FPIK UNSRAT']);
  aoa27b.push(['Tahun Lulus','Jumlah Lulusan','Jumlah Tanggapan Kepuasan Pengguna yang Terlacak']);
  c27b.partA.forEach(r => aoa27b.push([r.label, parseInt(r.jumlahLulusan)||0, r.tanggapan]));
  aoa27b.push(['Jumlah', c27b.totalLulusan, c27b.totalTanggapan]);
  aoa27b.push([]);
  const hIdx = aoa27b.length;
  aoa27b.push(['No','Jenis Kemampuan','Tingkat Kepuasan Pengguna (%)','','','','Jumlah Persentase Kepuasan Pengguna (%)','Rencana Tindak Lanjut oleh UPPS/PS']);
  aoa27b.push(['','','Sangat Baik','Baik','Cukup','Kurang','','']);
  c27b.partB.forEach(r => aoa27b.push([r.no, r.label, r.pSB+'%', r.pB+'%', r.pC+'%', r.pK+'%', r.pKepuasan+'%', r.rtl]));
  aoa27b.push(['Jumlah','', c27b.jumlahRow.pSB+'%', c27b.jumlahRow.pB+'%', c27b.jumlahRow.pC+'%', c27b.jumlahRow.pK+'%', c27b.jumlahRow.pKepuasan+'%','']);
  const ws27b = XLSX.utils.aoa_to_sheet(aoa27b);
  ws27b['!merges'] = [
    { s:{r:0,c:0}, e:{r:0,c:7} }, { s:{r:1,c:0}, e:{r:1,c:7} },
    { s:{r:hIdx,c:2}, e:{r:hIdx,c:5} },
    { s:{r:hIdx,c:0}, e:{r:hIdx+1,c:0} }, { s:{r:hIdx,c:1}, e:{r:hIdx+1,c:1} },
    { s:{r:hIdx,c:6}, e:{r:hIdx+1,c:6} }, { s:{r:hIdx,c:7}, e:{r:hIdx+1,c:7} },
  ];
  ws27b['!cols'] = [{wch:6},{wch:38},{wch:12},{wch:10},{wch:10},{wch:10},{wch:16},{wch:50}];
  XLSX.utils.book_append_sheet(wb, ws27b, 'Tabel 2.7B');

  // ── Sheet Tabel 2.7C ──
  const c27c = build27CAOA(sk || []);
  const ws27c = XLSX.utils.aoa_to_sheet(c27c.rows);
  ws27c['!merges'] = c27c.merges;
  ws27c['!cols']   = c27c.cols;
  XLSX.utils.book_append_sheet(wb, ws27c, 'Tabel 2.7C');

  // ── Sheet Tabel 2.8B1 ──
  const aoa28b1 = [];
  aoa28b1.push(['Tabel 2.8B1 Waktu Tunggu Lulusan']);
  aoa28b1.push(['Diisi oleh pengusul dari Program Studi Teknologi Hasil Perikanan (THP) FPIK UNSRAT']);
  aoa28b1.push(['Tahun Lulus','Jumlah Lulusan','Jumlah Lulusan yang Terlacak','Jumlah Lulusan Terlacak dengan Waktu Tunggu Mendapatkan Pekerjaan','','']);
  aoa28b1.push(['','','','WT < 6 bulan','6 ≤ WT ≤ 18 bulan','WT > 18 bulan']);
  c28b1.rows.forEach(r => aoa28b1.push([r.label, parseInt(r.jumlahLulusan)||0, r.terlacak, r.lt6, r.mid, r.gt18]));
  aoa28b1.push(['Jumlah', c28b1.totLulusan, c28b1.totTerlacak, c28b1.totLt6, c28b1.totMid, c28b1.totGt18]);
  const ws28b1 = XLSX.utils.aoa_to_sheet(aoa28b1);
  ws28b1['!merges'] = [
    { s:{r:0,c:0}, e:{r:0,c:5} }, { s:{r:1,c:0}, e:{r:1,c:5} },
    { s:{r:2,c:0}, e:{r:3,c:0} }, { s:{r:2,c:1}, e:{r:3,c:1} }, { s:{r:2,c:2}, e:{r:3,c:2} },
    { s:{r:2,c:3}, e:{r:2,c:5} },
  ];
  ws28b1['!cols'] = [{wch:12},{wch:14},{wch:14},{wch:14},{wch:16},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws28b1, 'Tabel 2.8B1');

  // ── Sheet Tabel 2.8B2 ──
  const aoa28b2 = [];
  aoa28b2.push(['Tabel 2.8B2 Tempat Kerja Lulusan']);
  aoa28b2.push(['Diisi oleh pengusul status Terakreditasi UNGGUL — Program Studi Teknologi Hasil Perikanan (THP) FPIK UNSRAT']);
  aoa28b2.push(['Tahun Lulus','Jumlah Lulusan','Jumlah Lulusan yang Terlacak','Jumlah Lulusan Terlacak yang Bekerja Berdasarkan Tingkat/Ukuran Tempat Kerja/Berwirausaha','','']);
  aoa28b2.push(['','','','Lokal/Wilayah/Berwirausaha tidak Berbadan Hukum','Nasional/Berwirausaha Berbadan Hukum','Multinasional/Internasional']);
  c28b2.rows.forEach(r => aoa28b2.push([r.label, parseInt(r.jumlahLulusan)||0, r.terlacak, r.lok, r.nas, r.multi]));
  aoa28b2.push(['Jumlah', c28b2.totLulusan, c28b2.totTerlacak, c28b2.totLok, c28b2.totNas, c28b2.totMulti]);
  const ws28b2 = XLSX.utils.aoa_to_sheet(aoa28b2);
  ws28b2['!merges'] = [
    { s:{r:0,c:0}, e:{r:0,c:5} }, { s:{r:1,c:0}, e:{r:1,c:5} },
    { s:{r:2,c:0}, e:{r:3,c:0} }, { s:{r:2,c:1}, e:{r:3,c:1} }, { s:{r:2,c:2}, e:{r:3,c:2} },
    { s:{r:2,c:3}, e:{r:2,c:5} },
  ];
  ws28b2['!cols'] = [{wch:12},{wch:14},{wch:14},{wch:22},{wch:20},{wch:18}];
  XLSX.utils.book_append_sheet(wb, ws28b2, 'Tabel 2.8B2');

  // ── Sheet data mentah pendukung ──
  if (al.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alRawRows(al)), 'Data Alumni');
  if (em.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(emRawRows(em)), 'Data Pengguna Lulusan');

  XLSX.writeFile(wb, `Tabel_LKPS_2.7B_2.7C_2.8B1_2.8B2_THP_FPIK_UNSRAT_${new Date().toISOString().slice(0,10)}.xlsx`);
}
window._exportLKPSExcel = exportLKPSExcel;

// ════════════════════════════════════════════════════════
//  EXPORT — Excel per bagian (Ringkasan / Alumni / Pengguna / Stakeholder)
// ════════════════════════════════════════════════════════
export async function exportSectionExcel(section) {
  if (!isLoggedIn()) return alert('Silakan login terlebih dahulu.');
  const { al, em, sk } = await getData();
  const XLSX = await ensureXLSX();
  const wb   = XLSX.utils.book_new();
  let fname  = 'Data';

  if (section === 'alumni') {
    if (!al.length) return alert('Belum ada data alumni.');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alRawRows(al)), 'Data Alumni');
    fname = 'Data_Alumni';
  } else if (section === 'employer') {
    if (!em.length) return alert('Belum ada data pengguna lulusan.');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(emRawRows(em)), 'Pengguna Lulusan');
    fname = 'Data_PenggunaLulusan';
  } else if (section === 'stakeholder') {
    if (!sk.length) return alert('Belum ada data stakeholder.');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(skRawRows(sk)), 'Stakeholder');
    fname = 'Data_Stakeholder';
  } else if (section === 'ringkasan') {
    const bekerja    = al.filter(a=>a.status&&!a.status.includes('Belum')&&!a.status.includes('Studi')).length;
    const pctKerja   = al.length ? Math.round(bekerja/al.length*100) : 0;
    const relevan    = al.filter(a=>['Sangat Erat','Erat'].includes(a.kesesuaian)).length;
    const pctRelevan = bekerja ? Math.round(relevan/bekerja*100) : 0;
    const avg7       = avgRtg(em, ['rtg_er1','rtg_er2','rtg_er3','rtg_er4','rtg_er5','rtg_er6','rtg_er7']);
    const avgProdi   = avgRtg(al, ['rtg_ar1','rtg_ar2','rtg_ar3','rtg_ar4','rtg_ar5','rtg_ar6','rtg_ar7']);
    const summary = [
      { Indikator:'Total Respons Alumni', Nilai: al.length },
      { Indikator:'Total Respons Instansi/Pengguna Lulusan', Nilai: em.length },
      { Indikator:'% Lulusan Bekerja', Nilai: pctKerja+'%' },
      { Indikator:'% Kerja Relevan dengan Bidang Studi', Nilai: pctRelevan+'%' },
      { Indikator:'Rata-rata 7 Aspek Kepuasan Pengguna (Tabel 2.7B)', Nilai: avg7 },
      { Indikator:'Rata-rata Penilaian Prodi oleh Alumni', Nilai: avgProdi },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Ringkasan');
    fname = 'Ringkasan_Statistik';
  } else {
    return;
  }

  XLSX.writeFile(wb, `${fname}_THP_FPIK_UNSRAT_${new Date().toISOString().slice(0,10)}.xlsx`);
}
window._exportSectionExcel = exportSectionExcel;

// ════════════════════════════════════════════════════════
//  EXPORT EXCEL LENGKAP (.xlsx) — semua data & tabel LKPS
// ════════════════════════════════════════════════════════
export async function exportExcel() {
  if (!isLoggedIn()) return alert('Silakan login terlebih dahulu.');
  const { al, em, sk } = await getData();
  if (!al.length && !em.length) return alert('Belum ada data.');

  const XLSX = await ensureXLSX();
  const wb   = XLSX.utils.book_new();

  if (al.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alRawRows(al)), 'Data Alumni');
  if (em.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(emRawRows(em)), 'Pengguna Lulusan');
  if (sk && sk.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(skRawRows(sk)), 'Stakeholder');

  const c27b  = compute27B(em, al);
  const t27b  = c27b.partB.map(r => ({ 'No':r.no, 'Aspek Kompetensi':r.label, 'Sangat Baik(%)':r.pSB, 'Baik(%)':r.pB, 'Cukup(%)':r.pC, 'Kurang(%)':r.pK, 'Jumlah % Kepuasan':r.pKepuasan, 'Rencana Tindak Lanjut':r.rtl }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(t27b), 'Tabel 2.7B LAM');

  const c28b1 = compute28B1(al);
  const t28b1 = c28b1.rows.map(r => ({ 'Tahun Lulus':`${r.label} (${r.year})`, 'Jumlah Lulusan':r.jumlahLulusan||0, 'Terlacak':r.terlacak, 'WT<6 bln':r.lt6, '6≤WT≤18 bln':r.mid, 'WT>18 bln':r.gt18 }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(t28b1), 'Tabel 2.8B1 WT');

  const c28b2 = compute28B2(al);
  const t28b2 = c28b2.rows.map(r => ({ 'Tahun Lulus':`${r.label} (${r.year})`, 'Jumlah Lulusan':r.jumlahLulusan||0, 'Terlacak':r.terlacak, 'Lokal':r.lok, 'Nasional':r.nas, 'Multinasional':r.multi }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(t28b2), 'Tabel 2.8B2 TK');

  XLSX.writeFile(wb, `Laporan_SurveiMutu_THP_FPIK_UNSRAT_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ════════════════════════════════════════════════════════
//  EXPORT WORD (.docx) — menggunakan docx.js CDN
// ════════════════════════════════════════════════════════
export async function exportWord() {
  if (!isLoggedIn()) return alert('Silakan login terlebih dahulu.');
  const { al, em } = await getData();

  // Load docx library
  if (!window.docx) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/docx@8.5.0/build/index.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const { Document, Paragraph, Table, TableRow, TableCell,
          TextRun, HeadingLevel, AlignmentType, WidthType,
          BorderStyle, Packer } = window.docx;

  const tgl   = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const avg7  = avgRtg(em,['rtg_er1','rtg_er2','rtg_er3','rtg_er4','rtg_er5','rtg_er6','rtg_er7']);
  const lt6   = al.filter(a=>a.tunggu&&(a.tunggu.includes('<')||a.tunggu.includes('Kurang dari 6'))).length;
  const pctLt6= al.length?Math.round(lt6/al.length*100):0;

  // Helper buat baris tabel
  const mkRow = (cells, bold=false) => new TableRow({
    children: cells.map(c => new TableCell({
      children: [new Paragraph({ children:[new TextRun({text:String(c),bold,size:20})] })],
      width:{ size: Math.floor(9000/cells.length), type: WidthType.DXA }
    }))
  });

  // Tabel 2.7B rows
  const rows27b = ASPEK_LAM.map((r,i) => {
    const k  = `rtg_er${i+1}`;
    const vs = em.map(e=>e[k]).filter(Boolean);
    const avg= vs.length?(vs.reduce((a,b)=>a+b,0)/vs.length).toFixed(2):'-';
    const cnt={sb:0,b:0,c:0,k:0};
    vs.forEach(v=>{if(v>=4)cnt.sb++;else if(v>=3)cnt.b++;else if(v>=2)cnt.c++;else cnt.k++;});
    return mkRow([i+1, r.lbl, cnt.sb, cnt.b, cnt.c, cnt.k, avg]);
  });

  const doc = new Document({ sections:[{ children:[
    // Kop
    new Paragraph({ text:'LAPORAN TRACER STUDY', heading:HeadingLevel.HEADING_1, alignment:AlignmentType.CENTER }),
    new Paragraph({ text:'Program Studi Teknologi Hasil Perikanan', heading:HeadingLevel.HEADING_2, alignment:AlignmentType.CENTER }),
    new Paragraph({ text:'Fakultas Perikanan dan Ilmu Kelautan · Universitas Sam Ratulangi', alignment:AlignmentType.CENTER, children:[new TextRun({text:'Fakultas Perikanan dan Ilmu Kelautan · Universitas Sam Ratulangi',size:22})] }),
    new Paragraph({ text:`Dicetak: ${tgl}`, alignment:AlignmentType.CENTER, children:[new TextRun({text:`Dicetak: ${tgl}`,size:20,color:'666666'})] }),
    new Paragraph(''),

    // Ringkasan
    new Paragraph({ text:'A. Ringkasan Data', heading:HeadingLevel.HEADING_2 }),
    new Paragraph({ children:[new TextRun({text:`• Total Responden Alumni       : ${al.length} orang`,size:22})] }),
    new Paragraph({ children:[new TextRun({text:`• Total Responden Instansi     : ${em.length} instansi`,size:22})] }),
    new Paragraph({ children:[new TextRun({text:`• Rata-rata 7 Aspek LAM PTIP  : ${avg7} / 5`,size:22})] }),
    new Paragraph({ children:[new TextRun({text:`• Lulusan WT < 6 bulan        : ${pctLt6}%`,size:22})] }),
    new Paragraph(''),

    // Tabel 2.7B
    new Paragraph({ text:'B. Tabel 2.7B — Kepuasan Pengguna Lulusan', heading:HeadingLevel.HEADING_2 }),
    new Table({ rows:[
      mkRow(['No','Aspek Kompetensi','Sangat Baik(4)','Baik(3)','Cukup(2)','Kurang(1)','Rata-rata'], true),
      ...rows27b
    ]}),
    new Paragraph(''),

    // Tabel 2.8B1
    new Paragraph({ text:'C. Tabel 2.8B1 — Waktu Tunggu Lulusan', heading:HeadingLevel.HEADING_2 }),
    new Table({ rows:[
      mkRow(['Kategori Waktu Tunggu','Jumlah','Persentase'], true),
      mkRow(['WT < 6 bulan', lt6, pctLt6+'%']),
      mkRow(['6 ≤ WT ≤ 18 bulan', al.filter(a=>a.tunggu&&a.tunggu.includes('6 –')).length, '-']),
      mkRow(['WT > 18 bulan', al.filter(a=>a.tunggu&&a.tunggu.includes('> 18')).length, '-']),
    ]}),
    new Paragraph(''),

    // Tabel 2.8B2
    new Paragraph({ text:'D. Tabel 2.8B2 — Tingkat Tempat Kerja', heading:HeadingLevel.HEADING_2 }),
    new Table({ rows:[
      mkRow(['Tingkat Tempat Kerja','Jumlah','Persentase'], true),
      mkRow(['Lokal/Wilayah/Wirausaha', al.filter(a=>a.level_kerja&&a.level_kerja.toLowerCase().includes('lokal')).length, '-']),
      mkRow(['Nasional/Berbadan Hukum', al.filter(a=>a.level_kerja&&a.level_kerja.toLowerCase().includes('nasional')).length, '-']),
      mkRow(['Multinasional/Internasional', al.filter(a=>a.level_kerja&&(a.level_kerja.toLowerCase().includes('multinasional')||a.level_kerja.toLowerCase().includes('internasional'))).length, '-']),
    ]}),
  ]}]});

  const blob = await Packer.toBlob(doc);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download=`Laporan_SurveiMutu_THP_FPIK_UNSRAT_${new Date().toISOString().slice(0,10)}.docx`;
  a.click(); URL.revokeObjectURL(url);
}

// ════════════════════════════════════════════════════════
//  EXPORT PDF — via Print dialog (CSS print)
// ════════════════════════════════════════════════════════
export function exportPDF() {
  admTab('analisis');
  setTimeout(() => {
    const style = document.createElement('style');
    style.id = 'pdf-print-style';
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #print-area, #print-area * { visibility: visible; }
        #print-area { position: fixed; top: 0; left: 0; width: 100%; }
        .exp-btn, button, #btn-ai { display: none !important; }
      }`;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      const el = document.getElementById('pdf-print-style');
      if (el) el.remove();
    }, 1500);
  }, 500);
}

// ════════════════════════════════════════════════════════
//  PRINT LAPORAN
// ════════════════════════════════════════════════════════
export function printLaporan() { window.print(); }

// ── Expose semua ke HTML
window._exportCSV    = exportCSV;
window._exportExcel  = exportExcel;
window._exportWord   = exportWord;
window._exportPDF    = exportPDF;
window._printLaporan = printLaporan;

// ════════════════════════════════════════════════════════
//  CHART HELPERS
// ════════════════════════════════════════════════════════
function dChart(id) { if(charts[id]){charts[id].destroy();delete charts[id];} }

function mkChart(id, type, dataMap) {
  dChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return;
  charts[id] = new Chart(ctx, {
    type,
    data:{labels:Object.keys(dataMap),datasets:[{data:Object.values(dataMap),backgroundColor:CHART_COLORS,borderWidth:0,borderRadius:type==='bar'?4:0}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:type==='bar'?'top':'right',labels:{font:{size:10},padding:8,boxWidth:10}}},
      scales:type==='bar'?{y:{beginAtZero:true,ticks:{stepSize:1}},x:{ticks:{font:{size:9}}}}:undefined}
  });
}

function mkHBar(id, labels, data, color) {
  dChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return;
  charts[id] = new Chart(ctx,{
    type:'bar',
    data:{labels,datasets:[{label:'Rata-rata',data,backgroundColor:color,borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',
      plugins:{legend:{display:false}},
      scales:{x:{min:0,max:5,ticks:{stepSize:1}},y:{ticks:{font:{size:9}}}}}
  });
}

function countBy(arr, key) {
  const m={};arr.forEach(a=>{const v=a[key]||'N/A';m[v]=(m[v]||0)+1;});return m;
}
function avgOf(arr, key) {
  const vs=arr.map(a=>a[key]).filter(Boolean);
  return vs.length?+(vs.reduce((a,b)=>a+b,0)/vs.length).toFixed(2):0;
}
function avgRtg(arr, keys) {
  if (!arr||!arr.length) return '–';
  const tot=arr.reduce((s,r)=>s+keys.reduce((ss,k)=>ss+(r[k]||0),0),0);
  return (tot/(arr.length*keys.length)).toFixed(2);
}
