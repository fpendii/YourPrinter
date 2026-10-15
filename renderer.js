const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
let settings = { bwPrice: 500, colorPrice: 2000, paperSize: 'A4' };
let selectedPdf = null;
let detectedPages = 0;
let detectedBwPages = 0;
let detectedColorPages = 0;

const $ = (id) => document.getElementById(id);
const numericValue = (id) => Math.max(0, Number($(id).value) || 0);
const formatCurrency = (value) => currency.format(value);

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  window.setTimeout(() => toast.classList.add('hidden'), 3000);
}

function updatePriceLabels() {
  $('bw-price-label').textContent = `${formatCurrency(settings.bwPrice)} / halaman`;
  $('color-price-label').textContent = `${formatCurrency(settings.colorPrice)} / halaman`;
}

function getPrintMode() {
  const checked = document.querySelector('input[name="print-mode"]:checked');
  return checked ? checked.value : 'color';
}

function setPrintMode(mode) {
  const radio = document.querySelector(`input[name="print-mode"][value="${mode}"]`);
  if (radio) {
    radio.checked = true;
    syncModeUI();
  }
}

function syncModeUI() {
  const mode = getPrintMode();
  const isBw = mode === 'bw';

  document.querySelectorAll('.mode-card').forEach((card) => {
    const radio = card.querySelector('input[type="radio"]');
    card.classList.toggle('active', radio && radio.checked);
  });

  const colorInput = $('color-pages');
  const colorBox = $('color-box');
  const colorLabel = $('color-price-label');

  if (isBw) {
    colorInput.value = 0;
    colorInput.disabled = true;
    if (colorBox) colorBox.classList.add('disabled-box');
    if (colorLabel) colorLabel.textContent = 'Tidak dihitung (Mode tidak berwarna)';

    if (detectedPages > 0) {
      $('bw-pages').value = detectedPages;
    }
  } else {
    colorInput.disabled = false;
    if (colorBox) colorBox.classList.remove('disabled-box');
    if (colorLabel) colorLabel.textContent = `${formatCurrency(settings.colorPrice)} / halaman`;

    if (detectedPages > 0) {
      $('bw-pages').value = detectedBwPages;
      colorInput.value = detectedColorPages;
    }
  }
}

function updateTotal() {
  const mode = getPrintMode();
  const copies = Math.max(1, numericValue('copies'));
  let bwPages = numericValue('bw-pages');
  let colorPages = numericValue('color-pages');
  let total = 0;
  const validation = $('page-validation');

  if (mode === 'bw') {
    // Mode Tidak Berwarna: Totalkan semua halaman dengan biaya tidak berwarna
    colorPages = 0;
    const effectivePages = detectedPages > 0 ? bwPages : bwPages;
    total = effectivePages * settings.bwPrice * copies;
    $('total-price').textContent = formatCurrency(total);

    if (detectedPages && effectivePages !== detectedPages) {
      validation.textContent = `PDF berisi ${detectedPages} halaman, tetapi jumlah halaman yang dimasukkan ${effectivePages}.`;
      validation.classList.add('warning');
    } else if (detectedPages) {
      validation.textContent = `Mode Tidak Berwarna: Semua ${detectedPages} halaman dihitung tarif hitam-putih (${formatCurrency(settings.bwPrice)} / halaman).`;
      validation.classList.remove('warning');
    } else {
      validation.textContent = `Semua halaman dihitung dengan tarif tidak berwarna (${formatCurrency(settings.bwPrice)} / halaman).`;
      validation.classList.remove('warning');
    }

    return { copies, bwPages: effectivePages, colorPages: 0, total, enteredPages: effectivePages, mode };
  } else {
    // Mode Berwarna: Totalkan semua kertas berwarna dan tidak berwarna
    total = (bwPages * settings.bwPrice + colorPages * settings.colorPrice) * copies;
    $('total-price').textContent = formatCurrency(total);

    const enteredPages = bwPages + colorPages;
    if (detectedPages && enteredPages !== detectedPages) {
      validation.textContent = `PDF berisi ${detectedPages} halaman, tetapi pembagian saat ini ${enteredPages} halaman.`;
      validation.classList.add('warning');
    } else if (detectedPages) {
      validation.textContent = `Mode Berwarna: ${bwPages} halaman hitam-putih (${formatCurrency(settings.bwPrice)}) + ${colorPages} halaman warna (${formatCurrency(settings.colorPrice)}).`;
      validation.classList.remove('warning');
    } else {
      validation.textContent = 'Pilih PDF untuk menghitung dan memisahkan halaman warna secara otomatis.';
      validation.classList.remove('warning');
    }

    return { copies, bwPages, colorPages, total, enteredPages, mode };
  }
}

function showLoading(fileName) {
  $('file-error').classList.add('hidden');
  $('choose-file').classList.add('hidden');
  $('file-result').classList.add('hidden');
  $('loading-title').textContent = fileName ? `Menganalisis: ${fileName}` : 'Menganalisis dokumen...';
  $('loading-status').textContent = 'Menyiapkan pembacaan dokumen...';
  $('progress-bar').style.width = '0%';
  $('file-loading').classList.remove('hidden');
}

function updateProgress(progress) {
  if (!progress || !progress.total) return;
  const percent = Math.min(100, Math.max(0, Math.round((progress.current / progress.total) * 100)));
  $('loading-status').textContent = `Menganalisis halaman ${progress.current} dari ${progress.total} (${percent}%)...`;
  $('progress-bar').style.width = `${percent}%`;
}

function hideLoading() {
  $('file-loading').classList.add('hidden');
}

async function selectPdf() {
  if (!window.printKasir) {
    $('file-error').textContent = 'Buka aplikasi melalui "Jalankan PrintKasir.cmd", bukan dengan membuka index.html di browser.';
    $('file-error').classList.remove('hidden');
    return;
  }
  $('file-error').classList.add('hidden');
  const filePath = await window.printKasir.selectPdf();
  if (!filePath) return;

  const fileName = filePath.split(/[/\\]/).pop() || 'Dokumen PDF';
  showLoading(fileName);

  try {
    const result = await window.printKasir.inspectPdf(filePath);
    selectedPdf = result;
    detectedPages = result.totalPages;
    detectedBwPages = result.bwPages;
    detectedColorPages = result.colorPages;

    $('file-name').textContent = result.fileName;
    $('page-result').textContent = `${result.totalPages} halaman: ${result.bwPages} hitam-putih · ${result.colorPages} warna`;
    $('file-result').classList.remove('hidden');
    $('page-breakdown').classList.remove('hidden');
    $('page-validation').classList.remove('hidden');

    syncModeUI();
    updateTotal();
  } catch (error) {
    $('file-error').textContent = `PDF tidak dapat dibaca: ${error.message}`;
    $('file-error').classList.remove('hidden');
    $('choose-file').classList.remove('hidden');
  } finally {
    hideLoading();
  }
}

function clearPdf() {
  selectedPdf = null;
  detectedPages = 0;
  detectedBwPages = 0;
  detectedColorPages = 0;
  hideLoading();
  $('file-result').classList.add('hidden');
  $('choose-file').classList.remove('hidden');
  $('page-breakdown').classList.add('hidden');
  $('page-validation').classList.add('hidden');
  syncModeUI();
  updateTotal();
}

async function saveOrder(event) {
  event.preventDefault();
  const { copies, bwPages, colorPages, total, enteredPages, mode } = updateTotal();
  if (!selectedPdf) return showToast('Pilih file PDF terlebih dahulu.');
  if (enteredPages !== detectedPages) {
    return showToast(mode === 'bw' 
      ? 'Jumlah halaman harus sama dengan jumlah halaman PDF.' 
      : 'Pembagian halaman harus sama dengan jumlah halaman PDF.');
  }

  const transaction = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    customer: $('customer').value.trim() || 'Pelanggan umum',
    fileName: selectedPdf.fileName,
    totalPages: detectedPages,
    printMode: mode,
    bwPages: mode === 'bw' ? detectedPages : bwPages,
    colorPages: mode === 'bw' ? 0 : colorPages,
    copies,
    paperSize: $('paper-size').value,
    total
  };

  await window.printKasir.addTransaction(transaction);
  showToast('Pesanan tersimpan ke rekap.');
  $('order-form').reset();
  setPrintMode('color');
  $('copies').value = 1;
  $('bw-pages').value = 0;
  $('color-pages').value = 0;
  clearPdf();
  loadReport();
}

async function loadReport() {
  const transactions = await window.printKasir.readTransactions();
  const today = new Date().toLocaleDateString('en-CA');
  const todayTransactions = transactions.filter((item) => new Date(item.createdAt).toLocaleDateString('en-CA') === today);
  const sum = (list, selector) => list.reduce((total, item) => total + selector(item), 0);

  $('today-income').textContent = formatCurrency(sum(todayTransactions, (item) => item.total));
  $('today-orders').textContent = todayTransactions.length;
  $('total-bw').textContent = sum(transactions, (item) => (item.bwPages || 0) * (item.copies || 1)).toLocaleString('id-ID');
  $('total-color').textContent = sum(transactions, (item) => (item.colorPages || 0) * (item.copies || 1)).toLocaleString('id-ID');

  const list = $('transaction-list');
  list.replaceChildren();
  transactions.slice(0, 20).forEach((item) => {
    const row = document.createElement('tr');
    const date = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt));
    const modeBadge = item.printMode === 'bw'
      ? `<span class="badge badge-bw">Tidak Berwarna</span> ${item.totalPages || item.bwPages} BW`
      : `<span class="badge badge-color">Berwarna</span> ${item.bwPages} BW · ${item.colorPages} warna`;

    row.innerHTML = `<td>${date}</td><td>${escapeHtml(item.customer)}</td><td>${escapeHtml(item.fileName)}</td><td>${modeBadge} × ${item.copies}</td><td><strong>${formatCurrency(item.total)}</strong></td>`;
    list.append(row);
  });
  $('empty-transactions').classList.toggle('hidden', transactions.length !== 0);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[character]);
}

async function saveSettings(event) {
  event.preventDefault();
  settings = { bwPrice: numericValue('bw-price'), colorPrice: numericValue('color-price'), paperSize: 'A4' };
  await window.printKasir.saveSettings(settings);
  updatePriceLabels();
  syncModeUI();
  updateTotal();
  $('settings-message').classList.remove('hidden');
  window.setTimeout(() => $('settings-message').classList.add('hidden'), 2500);
}

function switchView(viewName) {
  document.querySelectorAll('.view').forEach((element) => element.classList.toggle('active', element.id === `${viewName}-view`));
  document.querySelectorAll('.nav-item').forEach((element) => element.classList.toggle('active', element.dataset.view === viewName));
  if (viewName === 'report') loadReport();
}

async function initialize() {
  if (!window.printKasir) {
    $('file-error').textContent = 'Tampilan ini dibuka di browser. Untuk memilih file PDF, jalankan aplikasi lewat "Jalankan PrintKasir.cmd".';
    $('file-error').classList.remove('hidden');
    return;
  }
  settings = await window.printKasir.readSettings();
  $('bw-price').value = settings.bwPrice;
  $('color-price').value = settings.colorPrice;
  $('paper-size').value = settings.paperSize || 'A4';
  updatePriceLabels();
  syncModeUI();
  updateTotal();
  loadReport();

  $('choose-file').addEventListener('click', selectPdf);
  $('remove-file').addEventListener('click', clearPdf);
  $('order-form').addEventListener('submit', saveOrder);
  $('settings-form').addEventListener('submit', saveSettings);
  $('refresh-report').addEventListener('click', loadReport);

  if (typeof window.printKasir.onPdfProgress === 'function') {
    window.printKasir.onPdfProgress(updateProgress);
  }

  document.querySelectorAll('input[name="print-mode"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      syncModeUI();
      updateTotal();
    });
  });

  ['copies', 'bw-pages', 'color-pages'].forEach((id) => $(id).addEventListener('input', updateTotal));
  document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
}

initialize();

