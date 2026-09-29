// ======================
// STATE
// ======================
const state = {
  view: 'pasien',
  patients: [],
  templates: [],
  currentPatient: null,
  profile: {
    nama: 'Perawat',
    unit: 'IGD',
    rs: 'RS Umum'
  }
};

const $ = id => document.getElementById(id);
const mainEl = () => document.getElementById('main');

// ======================
// TEMPLATE DEFAULT
// ======================
const DEFAULT_TEMPLATE = `Assalamualaikum Dokter.
Izin konsul pasien:

Nama            : [NAMA_PASIEN]
JK / Usia       : [JENIS_KELAMIN] / [USIA]
Keluhan Utama   : [KELUHAN_UTAMA]
Keluhan Tambahan: [KELUHAN_TAMBAHAN]

S (Situation):
[SITUATION]

B (Background):
[BACKGROUND]

A (Assessment):
TTV :
[VITALS]
GCS : [GCS]
Nyeri: [NYERI]
Temuan:
[TEMUAN]

R (Recommendation):
[REKOMENDASI]

Mohon advice Dokter. Terima kasih.`;

// ======================
// TOAST
// ======================
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

// ======================
// INDEXEDDB
// ======================
const DB_NAME = 'ruangperawat';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('patients')) {
        db.createObjectStore('patients', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('templates')) {
        db.createObjectStore('templates', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(store, value) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function dbGetAll(store) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store);
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => rej(req.error);
  });
}

async function dbDelete(store, key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function loadData() {
  state.patients = await dbGetAll('patients');
  state.templates = await dbGetAll('templates');

  const settings = await dbGetAll('settings');
  const profile = settings.find(s => s.key === 'profile');
  if (profile) state.profile = profile.value;

  const defaultTpl = {
    id: 'default',
    name: 'SBAR Standar',
    content: DEFAULT_TEMPLATE
  };
  await dbPut('templates', defaultTpl);
  state.templates = [defaultTpl];
}

// ======================
// HELPER
// ======================
function clean(v) {
  return (v ?? '').toString().trim();
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'pagi';
  if (h < 15) return 'siang';
  if (h < 18) return 'sore';
  return 'malam';
}

function formatVitals(p) {
  const v = p.vitals || {};
  const lines = [];
  if (v.sbp && v.dbp) lines.push(`TD ${v.sbp}/${v.dbp} mmHg`);
  if (v.hr) lines.push(`HR ${v.hr} x/mnt`);
  if (v.rr) lines.push(`RR ${v.rr} x/mnt`);
  if (v.temp) lines.push(`Suhu ${v.temp}°C`);
  if (v.spo2) lines.push(`SpO₂ ${v.spo2}%`);
  return lines.join(' | ') || '-';
}

function generateSBAR(patient) {
  const tpl = state.templates[0]?.content || DEFAULT_TEMPLATE;
  const p = patient;

  const map = {
    '[WAKTU]': greeting(),
    '[NAMA_PERAWAT]': state.profile.nama,
    '[UNIT]': state.profile.unit,
    '[RS]': state.profile.rs,
    '[NAMA_PASIEN]': p.nama || '-',
    '[JENIS_KELAMIN]': p.jk === 'L' ? 'Laki-laki' : p.jk === 'P' ? 'Perempuan' : '-',
    '[USIA]': p.usia ? `${p.usia} tahun` : '-',
    '[KELUHAN_UTAMA]': p.keluhanUtama || '-',
    '[KELUHAN_TAMBAHAN]': p.keluhanTambahan || '-',
    '[SITUATION]': p.situation || '-',
    '[BACKGROUND]': p.background || '-',
    '[VITALS]': formatVitals(p),
    '[GCS]': p.gcs || '-',
    '[NYERI]': p.nyeri != null ? `${p.nyeri}/10` : '-',
    '[TEMUAN]': p.temuan || '-',
    '[REKOMENDASI]': p.rekomendasi || '-'
  };

  let result = tpl;
  for (const [key, val] of Object.entries(map)) {
    result = result.split(key).join(val);
  }
  return result;
}

// ======================
// NAVIGASI
// ======================
function setView(view, data = null) {
  state.view = view;
  if (data !== undefined) state.currentPatient = data;

  document.querySelectorAll('.nav-item').forEach(btn => {
    const isPatientRelated = ['form', 'detail'].includes(view) && btn.dataset.view === 'pasien';
    btn.classList.toggle('active', btn.dataset.view === view || isPatientRelated);
  });

  render();
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => setView(btn.dataset.view));
});

// ======================
// RENDER
// ======================
function render() {
  const el = mainEl();

  if (state.view === 'pasien') {
    el.innerHTML = renderPatientList();
  } else if (state.view === 'form') {
    el.innerHTML = renderForm(state.currentPatient);
    bindFormEvents();
  } else if (state.view === 'detail') {
    el.innerHTML = renderDetail(state.currentPatient);
    bindDetailEvents();
  } else if (state.view === 'template') {
    el.innerHTML = renderTemplate();
    bindTemplateEvents();
  } else if (state.view === 'pengaturan') {
    el.innerHTML = renderSettings();
    bindSettingsEvents();
  }
}

function renderPatientList() {
  const list = [...state.patients].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return `
    <div class="page-head">
      <h1>Pasien Aktif</h1>
      <button class="btn btn-primary" id="btn-new">+ Pasien Baru</button>
    </div>
    ${list.length === 0
      ? `<div class="empty"><strong>Belum ada pasien</strong><br>Klik "Pasien Baru" untuk mulai.</div>`
      : list.map(p => `
        <div class="patient-card">
          <h3>${p.nama}</h3>
          <div class="patient-meta">
            ${p.jk === 'L' ? 'Laki-laki' : p.jk === 'P' ? 'Perempuan' : '-'} · ${p.usia || '?'} th · ${p.keluhanUtama || 'Tanpa keluhan utama'}
          </div>
          <div class="patient-actions">
            <button class="btn btn-secondary btn-open" data-id="${p.id}">Buka</button>
            <button class="btn btn-danger btn-del" data-id="${p.id}">Hapus</button>
          </div>
        </div>
      `).join('')
    }
  `;
}

function renderForm(patient = null) {
  const p = patient || {};
  const isEdit = !!patient;

  return `
    <div class="page-head">
      <h1>${isEdit ? 'Edit Pasien' : 'Pasien Baru'}</h1>
      <button class="btn btn-secondary" id="btn-back">← Kembali</button>
    </div>

    <div class="card">
      <div class="two-col">
        <div class="field">
          <label>Nama Pasien *</label>
          <input id="f-nama" value="${p.nama || ''}" placeholder="Nama lengkap" />
        </div>
        <div class="field">
          <label>Jenis Kelamin</label>
          <select id="f-jk">
            <option value="">-</option>
            <option value="L" ${p.jk === 'L' ? 'selected' : ''}>Laki-laki</option>
            <option value="P" ${p.jk === 'P' ? 'selected' : ''}>Perempuan</option>
          </select>
        </div>
      </div>
      <div class="two-col">
        <div class="field">
          <label>Usia (tahun)</label>
          <input id="f-usia" type="number" value="${p.usia || ''}" />
        </div>
        <div class="field">
          <label>Keluhan Utama *</label>
          <input id="f-keluhan-utama" value="${p.keluhanUtama || ''}" placeholder="Contoh: Nyeri dada" />
        </div>
      </div>
      <div class="field">
        <label>Keluhan Tambahan</label>
        <input id="f-keluhan-tambahan" value="${p.keluhanTambahan || ''}" placeholder="Contoh: Sesak napas, mual" />
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:12px;font-size:15px">S — Situation</h3>
      <div class="field">
        <label>Situasi saat ini / kronologi singkat</label>
        <textarea id="f-situation">${p.situation || ''}</textarea>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:12px;font-size:15px">B — Background</h3>
      <div class="field">
        <label>Riwayat singkat / latar belakang</label>
        <textarea id="f-background">${p.background || ''}</textarea>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:12px;font-size:15px">A — Assessment</h3>
      <div class="two-col">
        <div class="field"><label>TD Sistolik</label><input id="f-sbp" type="number" value="${p.vitals?.sbp || ''}" /></div>
        <div class="field"><label>TD Diastolik</label><input id="f-dbp" type="number" value="${p.vitals?.dbp || ''}" /></div>
      </div>
      <div class="two-col">
        <div class="field"><label>HR</label><input id="f-hr" type="number" value="${p.vitals?.hr || ''}" /></div>
        <div class="field"><label>RR</label><input id="f-rr" type="number" value="${p.vitals?.rr || ''}" /></div>
      </div>
      <div class="two-col">
        <div class="field"><label>Suhu (°C)</label><input id="f-temp" type="number" step="0.1" value="${p.vitals?.temp || ''}" /></div>
        <div class="field"><label>SpO₂ (%)</label><input id="f-spo2" type="number" value="${p.vitals?.spo2 || ''}" /></div>
      </div>
      <div class="two-col">
        <div class="field"><label>GCS</label><input id="f-gcs" value="${p.gcs || ''}" placeholder="E4V5M6" /></div>
        <div class="field"><label>Skala Nyeri (0-10)</label><input id="f-nyeri" type="number" min="0" max="10" value="${p.nyeri ?? ''}" /></div>
      </div>
      <div class="field">
        <label>Temuan / Pemeriksaan</label>
        <textarea id="f-temuan">${p.temuan || ''}</textarea>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:12px;font-size:15px">R — Recommendation</h3>
      <div class="field">
        <label>Rekomendasi / Permintaan ke dokter</label>
        <textarea id="f-rekomendasi">${p.rekomendasi || ''}</textarea>
      </div>
    </div>

    <button class="btn btn-primary" id="btn-save" style="width:100%;margin-top:8px">
      ${isEdit ? 'Simpan Perubahan' : 'Simpan Pasien'}
    </button>
  `;
}

function renderDetail(p) {
  if (!p) return '<div class="empty">Pasien tidak ditemukan</div>';
  const sbar = generateSBAR(p);

  return `
    <div class="page-head">
      <h1>${p.nama}</h1>
      <button class="btn btn-secondary" id="btn-back">← Kembali</button>
    </div>

    <div class="card">
      <div class="patient-meta" style="margin-bottom:8px">
        ${p.jk === 'L' ? 'Laki-laki' : p.jk === 'P' ? 'Perempuan' : '-'} · ${p.usia || '?'} tahun
      </div>
      <div><strong>Keluhan Utama:</strong> ${p.keluhanUtama || '-'}</div>
      ${p.keluhanTambahan ? `<div style="margin-top:4px"><strong>Keluhan Tambahan:</strong> ${p.keluhanTambahan}</div>` : ''}
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
        <h3 style="font-size:15px">Hasil SBAR</h3>
        <button class="btn btn-secondary" id="btn-edit">Edit Data</button>
      </div>
      <div class="output-box" id="sbar-output">${sbar}</div>
      <div class="copy-row">
        <button class="btn btn-primary" id="btn-copy">📋 Copy SBAR</button>
      </div>
    </div>
  `;
}

function renderTemplate() {
  const tpl = state.templates[0]?.content || DEFAULT_TEMPLATE;
  return `
    <div class="page-head"><h1>Template SBAR</h1></div>
    <div class="card">
      <p style="font-size:13px;color:var(--muted);margin-bottom:12px">
        Placeholder: [NAMA_PASIEN], [JENIS_KELAMIN], [USIA], [KELUHAN_UTAMA], [KELUHAN_TAMBAHAN], [SITUATION], [BACKGROUND], [VITALS], [GCS], [NYERI], [TEMUAN], [REKOMENDASI]
      </p>
      <div class="field">
        <textarea id="tpl-content" style="min-height:320px;font-family:monospace;font-size:13px">${tpl}</textarea>
      </div>
      <button class="btn btn-primary" id="btn-save-tpl">Simpan Template</button>
    </div>
  `;
}

function renderSettings() {
  const p = state.profile;
  return `
    <div class="page-head"><h1>Pengaturan</h1></div>
    <div class="card">
      <div class="field">
        <label>Nama Perawat</label>
        <input id="s-nama" value="${p.nama || ''}" />
      </div>
      <div class="field">
        <label>Unit / Ruangan</label>
        <input id="s-unit" value="${p.unit || ''}" />
      </div>
      <div class="field">
        <label>Nama RS / Klinik</label>
        <input id="s-rs" value="${p.rs || ''}" />
      </div>
      <button class="btn btn-primary" id="btn-save-settings">Simpan Profil</button>
    </div>
  `;
}

// ======================
// EVENT BINDING
// ======================
function bindFormEvents() {
  $('btn-back')?.addEventListener('click', () => setView('pasien'));

  $('btn-save')?.addEventListener('click', async () => {
    const data = {
      id: state.currentPatient?.id || crypto.randomUUID(),
      nama: clean($('f-nama').value),
      jk: $('f-jk').value,
      usia: Number($('f-usia').value) || null,
      keluhanUtama: clean($('f-keluhan-utama').value),
      keluhanTambahan: clean($('f-keluhan-tambahan').value),
      situation: clean($('f-situation').value),
      background: clean($('f-background').value),
      vitals: {
        sbp: Number($('f-sbp').value) || null,
        dbp: Number($('f-dbp').value) || null,
        hr: Number($('f-hr').value) || null,
        rr: Number($('f-rr').value) || null,
        temp: Number($('f-temp').value) || null,
        spo2: Number($('f-spo2').value) || null
      },
      gcs: clean($('f-gcs').value),
      nyeri: $('f-nyeri').value !== '' ? Number($('f-nyeri').value) : null,
      temuan: clean($('f-temuan').value),
      rekomendasi: clean($('f-rekomendasi').value),
      updatedAt: new Date().toISOString(),
      createdAt: state.currentPatient?.createdAt || new Date().toISOString()
    };

    if (!data.nama) {
      toast('Nama pasien wajib diisi');
      return;
    }

    await dbPut('patients', data);

    const idx = state.patients.findIndex(x => x.id === data.id);
    if (idx >= 0) state.patients[idx] = data;
    else state.patients.push(data);

    toast('Pasien disimpan');
    setView('detail', data);
  });
}

function bindDetailEvents() {
  $('btn-back')?.addEventListener('click', () => setView('pasien'));
  $('btn-edit')?.addEventListener('click', () => setView('form', state.currentPatient));

  $('btn-copy')?.addEventListener('click', async () => {
    const text = $('sbar-output').textContent;
    try {
      await navigator.clipboard.writeText(text);
      toast('SBAR berhasil disalin');
    } catch {
      toast('Gagal menyalin');
    }
  });
}

function bindTemplateEvents() {
  $('btn-save-tpl')?.addEventListener('click', async () => {
    const content = $('tpl-content').value;
    const tpl = { id: 'default', name: 'SBAR Standar', content };
    await dbPut('templates', tpl);
    state.templates = [tpl];
    toast('Template disimpan');
  });
}

function bindSettingsEvents() {
  $('btn-save-settings')?.addEventListener('click', async () => {
    state.profile = {
      nama: clean($('s-nama').value) || 'Perawat',
      unit: clean($('s-unit').value) || 'Unit',
      rs: clean($('s-rs').value) || 'RS'
    };
    await dbPut('settings', { key: 'profile', value: state.profile });
    toast('Profil disimpan');
  });
}

// Event untuk list pasien
document.addEventListener('click', async (e) => {
  if (e.target.id === 'btn-new') {
    setView('form', null);
  }
  if (e.target.classList.contains('btn-open')) {
    const p = state.patients.find(x => x.id === e.target.dataset.id);
    if (p) setView('detail', p);
  }
  if (e.target.classList.contains('btn-del')) {
    if (!confirm('Hapus pasien ini?')) return;
    await dbDelete('patients', e.target.dataset.id);
    state.patients = state.patients.filter(x => x.id !== e.target.dataset.id);
    toast('Pasien dihapus');
    render();
  }
});

// ======================
// START
// ======================
async function init() {
  await loadData();
  render();
}

init();