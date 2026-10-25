// ==================== STATE ====================
const state = {
  view: 'pasien',
  patients: [],
  currentPatient: null,
  profile: {
    nama: 'Perawat',
    unit: 'IGD',
    rs: 'RS Umum'
  }
};

// ==================== HELPER ====================
const $ = id => document.getElementById(id);
const mainEL = () => document.getElementById('main');

// ==================== LOAD / SAVE ====================
function loadData() {
  const saved = localStorage.getItem('ruangPerawat');
  if (saved) {
    const data = JSON.parse(saved);
    state.patients = data.patients || [];
    state.profile = data.profile || state.profile;
  }
}

function saveData() {
  localStorage.setItem('ruangPerawat', JSON.stringify({
    patients: state.patients,
    profile: state.profile
  }));
}

// ==================== TEMPLATE ====================
const DEFAULT_TEMPLATE = `Assalamualaikum Dokter.
Izin konsul pasien:

Nama              : [NAMA_PASIEN]
JK / Usia         : [JENIS_KELAMIN] / [USIA]
Keluhan Utama     : [KELUHAN_UTAMA]
Keluhan Tambahan  : [KELUHAN_TAMBAHAN]

TTV:
• TD     : [SISTOLE]/[DIASTOLE] mmHg
• Nadi   : [NADI]
• RR     : [RR]
• Suhu   : [SUHU]
• SpO2   : [SPO2]

Terapi:
• IVF     : [IVF]
• Injeksi : [INJEKSI]
• Oral    : [ORAL]

Terima kasih Dokter.`;

// ==================== RENDER ====================
function setView(view) {
  state.view = view;
  document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
  if (view === 'pasien') $('btnPasien').classList.add('active');
  if (view === 'konsul') $('btnKonsul').classList.add('active');
  if (view === 'profil') $('btnProfil').classList.add('active');
  render();
}

function render() {
  $('profileInfo').innerHTML = `
    <strong>${state.profile.nama}</strong><br>
    ${state.profile.unit} • ${state.profile.rs}
  `;

  if (state.view === 'pasien') renderPasien();
  else if (state.view === 'konsul') renderKonsul();
  else if (state.view === 'profil') renderProfil();
}

// ---------- VIEW PASIEN ----------
function renderPasien() {
  let html = `
    <div class="card">
      <h2>Daftar Pasien</h2>
      <button class="btn" onclick="showFormPasien()">+ Tambah Pasien</button>
    </div>
  `;

  if (state.patients.length === 0) {
    html += `<div class="empty">Belum ada pasien. Klik tombol di atas untuk menambah.</div>`;
  } else {
    html += `<div class="patient-list">`;
    state.patients.forEach((p, i) => {
      html += `
        <div class="patient-item">
          <div class="patient-info" onclick="selectPatient(${i})">
            <h3>${p.nama}</h3>
            <p>${p.jk} • ${p.usia} thn • ${p.keluhanUtama || '-'}</p>
          </div>
          <div class="actions">
            <button class="btn btn-secondary" onclick="editPatient(${i})">Edit</button>
            <button class="btn btn-danger" onclick="deletePatient(${i})">Hapus</button>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  mainEL().innerHTML = html;
}

function showFormPasien(index = null) {
  const p = index !== null ? state.patients[index] : {};
  const isEdit = index !== null;

  mainEL().innerHTML = `
    <div class="card">
      <h2>${isEdit ? 'Edit Pasien' : 'Tambah Pasien Baru'}</h2>
      
      <label>Nama Pasien</label>
      <input type="text" id="nama" value="${p.nama || ''}" placeholder="Nama lengkap">

      <label>Jenis Kelamin</label>
      <select id="jk">
        <option value="Laki-laki" ${p.jk === 'Laki-laki' ? 'selected' : ''}>Laki-laki</option>
        <option value="Perempuan" ${p.jk === 'Perempuan' ? 'selected' : ''}>Perempuan</option>
      </select>

      <label>Usia</label>
      <input type="number" id="usia" value="${p.usia || ''}" placeholder="Contoh: 45">

      <label>Keluhan Utama</label>
      <input type="text" id="keluhanUtama" value="${p.keluhanUtama || ''}" placeholder="Keluhan utama">

      <label>Keluhan Tambahan</label>
      <textarea id="keluhanTambahan">${p.keluhanTambahan || ''}</textarea>

      <label>Tekanan Darah - Sistole</label>
      <input type="text" id="sistole" value="${p.sistole || ''}" placeholder="Contoh: 120">

      <label>Tekanan Darah - Diastole</label>
      <input type="text" id="diastole" value="${p.diastole || ''}" placeholder="Contoh: 80">

      <label>Nadi</label>
      <input type="text" id="nadi" value="${p.nadi || ''}" placeholder="Contoh: 88 x/menit">

      <label>Respirasi (RR)</label>
      <input type="text" id="rr" value="${p.rr || ''}" placeholder="Contoh: 20 x/menit">

      <label>Suhu</label>
      <input type="text" id="suhu" value="${p.suhu || ''}" placeholder="Contoh: 36.8 °C">

      <label>SpO2</label>
      <input type="text" id="spo2" value="${p.spo2 || ''}" placeholder="Contoh: 98%">

      <label>Terapi IVF (jenis infus & kebutuhannya)</label>
      <textarea id="ivf" placeholder="Contoh: RL 20 tpm, kebutuhan 2000 ml/24 jam">${p.ivf || ''}</textarea>

      <label>Injeksi</label>
      <textarea id="injeksi" placeholder="Contoh: Ceftriaxone 1 gr IV /12 jam">${p.injeksi || ''}</textarea>

      <label>Oral</label>
      <textarea id="oral" placeholder="Contoh: Paracetamol 500 mg 3x1">${p.oral || ''}</textarea>

      <button class="btn" onclick="savePatient(${index})">${isEdit ? 'Simpan Perubahan' : 'Simpan Pasien'}</button>
      <button class="btn btn-secondary" onclick="setView('pasien')">Batal</button>
    </div>
  `;
}

function savePatient(index) {
  const data = {
    nama: $('nama').value.trim(),
    jk: $('jk').value,
    usia: $('usia').value,
    keluhanUtama: $('keluhanUtama').value.trim(),
    keluhanTambahan: $('keluhanTambahan').value.trim(),
    sistole: $('sistole').value.trim(),
    diastole: $('diastole').value.trim(),
    nadi: $('nadi').value.trim(),
    rr: $('rr').value.trim(),
    suhu: $('suhu').value.trim(),
    spo2: $('spo2').value.trim(),
    ivf: $('ivf').value.trim(),
    injeksi: $('injeksi').value.trim(),
    oral: $('oral').value.trim()
  };

  if (!data.nama) {
    alert('Nama pasien wajib diisi!');
    return;
  }

  if (index === null || index === 'null') {
    state.patients.push(data);
  } else {
    state.patients[index] = data;
  }

  saveData();
  setView('pasien');
}

function editPatient(index) {
  showFormPasien(index);
}

function deletePatient(index) {
  if (confirm('Yakin hapus pasien ini?')) {
    state.patients.splice(index, 1);
    saveData();
    render();
  }
}

function selectPatient(index) {
  state.currentPatient = index;
  setView('konsul');
}

// ---------- VIEW KONSUL ----------
function renderKonsul() {
  if (state.patients.length === 0) {
    mainEL().innerHTML = `<div class="empty">Belum ada pasien. Tambah pasien dulu di menu Pasien.</div>`;
    return;
  }

  let options = state.patients.map((p, i) => 
    `<option value="${i}" ${state.currentPatient == i ? 'selected' : ''}>${p.nama}</option>`
  ).join('');

  const p = state.patients[state.currentPatient || 0] || state.patients[0];

  let text = DEFAULT_TEMPLATE
    .replace('[NAMA_PASIEN]', p.nama || '')
    .replace('[JENIS_KELAMIN]', p.jk || '')
    .replace('[USIA]', p.usia || '')
    .replace('[KELUHAN_UTAMA]', p.keluhanUtama || '-')
    .replace('[KELUHAN_TAMBAHAN]', p.keluhanTambahan || '-')
    .replace('[SISTOLE]', p.sistole || '-')
    .replace('[DIASTOLE]', p.diastole || '-')
    .replace('[NADI]', p.nadi || '-')
    .replace('[RR]', p.rr || '-')
    .replace('[SUHU]', p.suhu || '-')
    .replace('[SPO2]', p.spo2 || '-')
    .replace('[IVF]', p.ivf || '-')
    .replace('[INJEKSI]', p.injeksi || '-')
    .replace('[ORAL]', p.oral || '-');

  mainEL().innerHTML = `
    <div class="card">
      <h2>Generate Konsul</h2>
      
      <label>Pilih Pasien</label>
      <select id="pilihPasien" onchange="state.currentPatient = this.value; renderKonsul()">
        ${options}
      </select>

      <label>Preview Pesan</label>
      <div class="sbar-preview" id="previewText">${text}</div>

      <button class="btn" onclick="copySBAR()">📋 Salin ke Clipboard</button>
      <button class="btn btn-secondary" onclick="editPatient(state.currentPatient || 0)">Edit Data Pasien</button>
    </div>
  `;
}

function copySBAR() {
  const text = $('previewText').innerText;
  navigator.clipboard.writeText(text).then(() => {
    alert('Pesan berhasil disalin!');
  }).catch(() => {
    alert('Gagal menyalin. Silakan salin manual.');
  });
}

// ---------- VIEW PROFIL ----------
function renderProfil() {
  mainEL().innerHTML = `
    <div class="card">
      <h2>Profil Perawat</h2>
      
      <label>Nama Perawat</label>
      <input type="text" id="profNama" value="${state.profile.nama}">

      <label>Unit / Ruangan</label>
      <input type="text" id="profUnit" value="${state.profile.unit}">

      <label>Rumah Sakit</label>
      <input type="text" id="profRs" value="${state.profile.rs}">

      <button class="btn" onclick="saveProfil()">Simpan Profil</button>
    </div>
  `;
}

function saveProfil() {
  state.profile.nama = $('profNama').value.trim() || 'Perawat';
  state.profile.unit = $('profUnit').value.trim() || 'IGD';
  state.profile.rs = $('profRs').value.trim() || 'RS Umum';
  saveData();
  alert('Profil berhasil disimpan!');
  render();
}

// ==================== INIT ====================
loadData();
setView('pasien');