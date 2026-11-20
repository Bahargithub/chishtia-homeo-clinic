// Doctor Dashboard Logic - Chishtia Homeo Clinic
let currentToken = localStorage.getItem('homeo_admin_token') || '';
let appointmentsCache = [];
let inventoryCache = [];

function renderIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Authentication Check
function checkAuth() {
  if (currentToken) {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    initDashboard();
  } else {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('dashboardSection').classList.add('hidden');
  }
  renderIcons();
}

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('adminPasswordInput').value;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      currentToken = data.token;
      localStorage.setItem('homeo_admin_token', currentToken);
      checkAuth();
    } else {
      alert(data.message || 'ভুল পাসওয়ার্ড!');
    }
  } catch (err) {
    alert('সার্ভারে যোগাযোগ করতে সমস্যা হয়েছে।');
  }
});

// Logout
function logout() {
  currentToken = '';
  localStorage.removeItem('homeo_admin_token');
  checkAuth();
}

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${currentToken}`
  };
}

// Tab Switching
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('tab-active');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });

  const activeBtn = document.getElementById(`tabBtn-${tabName}`);
  const activeContent = document.getElementById(`tabContent-${tabName}`);
  if (activeBtn) activeBtn.classList.add('tab-active');
  if (activeContent) activeContent.classList.remove('hidden');

  if (tabName === 'appointments') loadAppointments();
  if (tabName === 'prescriptions') loadPrescriptions();
  if (tabName === 'cases') loadCases();
  if (tabName === 'inventory') loadInventory();
  if (tabName === 'followups') loadFollowups();

  renderIcons();
}

// Init Dashboard
async function initDashboard() {
  await loadClinicSettings();
  setDateToday();
  loadAppointments();
  loadInventoryAlerts();
}

// Load Settings
async function loadClinicSettings() {
  try {
    const res = await fetch('/api/admin/settings', { headers: getAuthHeaders() });
    if (res.status === 401) return logout();
    const data = await res.json();
    if (data.success && data.settings) {
      const s = data.settings;
      document.getElementById('dashClinicName').textContent = s.clinicName;
      document.getElementById('dashDoctorName').textContent = `${s.doctorName} (${s.doctorDegree || 'হোমিওপ্যাথিক চিকিৎসক'})`;

      // Settings Modal Fields
      document.getElementById('settingClinicName').value = s.clinicName || '';
      document.getElementById('settingDoctorName').value = s.doctorName || '';
      document.getElementById('settingDoctorDegree').value = s.doctorDegree || '';
      document.getElementById('settingPhone').value = s.phone || '';
      document.getElementById('settingPhoneSecondary').value = s.phoneSecondary || '';
      document.getElementById('settingVisitingHours').value = s.visitingHours || '';
      document.getElementById('settingBkash').value = s.bkashNumber || '';
      document.getElementById('settingNagad').value = s.nagadNumber || '';
      document.getElementById('settingFeeNew').value = s.consultationFeeNew || '৫০০';
      document.getElementById('settingFeeOld').value = s.consultationFeeOld || '৩০০';
      document.getElementById('telegramBotToken').value = s.telegramBotToken || '';
      document.getElementById('telegramChatId').value = s.telegramChatId || '';
      document.getElementById('telegramEnabled').checked = s.telegramEnabled !== false;
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

// Quick Date Filters
function setDateToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  document.getElementById('filterDate').value = `${yyyy}-${mm}-${dd}`;
  loadAppointments();
}

function setDateTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  document.getElementById('filterDate').value = `${yyyy}-${mm}-${dd}`;
  loadAppointments();
}

function clearDateFilter() {
  document.getElementById('filterDate').value = '';
  loadAppointments();
}

// ================= 1. APPOINTMENTS LOGIC =================
async function loadAppointments() {
  const date = document.getElementById('filterDate').value;
  const status = document.getElementById('filterStatus').value;
  const search = document.getElementById('searchInput').value.trim();

  let url = `/api/admin/appointments?`;
  if (date) url += `date=${encodeURIComponent(date)}&`;
  if (status) url += `status=${encodeURIComponent(status)}&`;
  if (search) url += `search=${encodeURIComponent(search)}&`;

  try {
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (res.status === 401) return logout();
    const data = await res.json();

    if (data.success) {
      appointmentsCache = data.appointments;
      renderAppointmentsTable(data.appointments);
      updateKPIs(data.appointments);
    }
  } catch (err) {
    console.error('Failed to load appointments:', err);
  }
}

function updateKPIs(list) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayItems = list.filter(a => a.appointmentDate === todayStr);

  document.getElementById('statTodayTotal').textContent = todayItems.length;
  document.getElementById('statPending').textContent = list.filter(a => a.status === 'Pending').length;
  document.getElementById('statConfirmed').textContent = list.filter(a => a.status === 'Confirmed').length;
  document.getElementById('statCompleted').textContent = list.filter(a => a.status === 'Completed').length;
  document.getElementById('appointmentCountBadge').textContent = `${list.length} জন`;
}

function renderAppointmentsTable(list) {
  const tbody = document.getElementById('appointmentTableBody');
  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-slate-400">কোনো অ্যাপয়েন্টমেন্ট পাওয়া যায়নি</td></tr>`;
    renderIcons();
    return;
  }

  tbody.innerHTML = list.map(item => {
    const isPaid = item.paymentStatus === 'Paid';
    const payBadge = item.paymentMethod === 'bKash / Nagad' 
      ? `<div class="mt-1 flex items-center gap-1 text-[10px]">
           <span class="px-1.5 py-0.5 rounded font-bold ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-pink-100 text-pink-800'}">
             ${item.paymentMethod}
           </span>
           <span class="font-mono text-slate-500">${item.paymentTrxId ? `Trx: ${item.paymentTrxId}` : ''}</span>
         </div>`
      : `<div class="text-[10px] text-slate-400 mt-0.5">ক্লিনিকে ক্যাশ (${item.paymentStatus || 'বাকি'})</div>`;

    return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        <td class="px-4 py-3 font-mono font-bold text-slate-800">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full ${item.status === 'Confirmed' ? 'bg-emerald-500' : (item.status === 'Completed' ? 'bg-purple-500' : (item.status === 'Cancelled' ? 'bg-red-400' : 'bg-amber-400'))}"></span>
            <span>${item.id}</span>
          </div>
          <span class="text-[10px] text-slate-400 font-normal">সিরিয়াল #${item.serialNumber}</span>
        </td>

        <td class="px-4 py-3">
          <div class="font-bold text-slate-800">${item.patientName}</div>
          <div class="text-[11px] text-slate-500">${item.age} বছর | ${item.gender} | <span class="text-emerald-700 font-medium">${item.patientType || 'নতুন'}</span></div>
          ${item.address ? `<div class="text-[10px] text-slate-400 truncate max-w-xs">${item.address}</div>` : ''}
        </td>

        <td class="px-4 py-3 whitespace-nowrap">
          <a href="tel:${item.phone}" class="font-mono text-emerald-700 font-bold hover:underline flex items-center gap-1">
            <i data-lucide="phone" class="w-3 h-3"></i>
            <span>${item.phone}</span>
          </a>
          <button onclick="sendWhatsAppConfirmation('${item.id}')" class="text-[11px] text-emerald-600 hover:text-emerald-800 flex items-center gap-1 mt-0.5 font-semibold">
            <i data-lucide="message-circle" class="w-3 h-3"></i> WhatsApp কনফার্ম
          </button>
        </td>

        <td class="px-4 py-3 whitespace-nowrap">
          <div class="font-semibold text-slate-700">${item.appointmentDate}</div>
          <div class="text-xs text-emerald-700 font-medium">${item.timeSlot}</div>
        </td>

        <td class="px-4 py-3 max-w-xs">
          <p class="truncate font-medium text-slate-800" title="${item.symptoms}">${item.symptoms}</p>
          ${payBadge}
          <div class="mt-1">
            <button onclick="togglePaymentStatus('${item.id}', '${isPaid ? 'Unpaid' : 'Paid'}')" class="text-[10px] underline font-bold ${isPaid ? 'text-slate-400' : 'text-emerald-700'}">
              ${isPaid ? 'পেমেন্ট স্ট্যাটাস: পরিশোধিত ✓' : 'Mark as Paid (পরিশোধ চিহ্নিত করুন)'}
            </button>
          </div>
        </td>

        <td class="px-4 py-3 whitespace-nowrap">
          <select onchange="updateStatus('${item.id}', this.value)" class="text-[11px] font-bold px-2 py-1 rounded-lg border border-slate-200 bg-white">
            <option value="Pending" ${item.status === 'Pending' ? 'selected' : ''}>অপেক্ষমান (Pending)</option>
            <option value="Confirmed" ${item.status === 'Confirmed' ? 'selected' : ''}>নিশ্চিত (Confirmed)</option>
            <option value="Completed" ${item.status === 'Completed' ? 'selected' : ''}>সম্পন্ন (Completed)</option>
            <option value="Cancelled" ${item.status === 'Cancelled' ? 'selected' : ''}>বাতিল (Cancelled)</option>
          </select>
        </td>

        <td class="px-4 py-3 text-right whitespace-nowrap">
          <div class="flex items-center justify-end gap-1.5">
            <!-- Write Rx button -->
            <button onclick="openPrescriptionForAppointment('${item.id}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1" title="ডিজিটাল প্রেসক্রিপশন তৈরি">
              <span>℞ লিখুন</span>
            </button>

            <!-- Case Taking button -->
            <button onclick="openCaseForPatient('${item.phone}', '${item.patientName}', '${item.age}', '${item.gender}')" class="p-1.5 text-sky-700 hover:bg-sky-50 rounded-lg" title="কেস টেকিং শিট">
              <i data-lucide="clipboard" class="w-4 h-4"></i>
            </button>

            <!-- Print Slip -->
            <a href="/receipt/${item.id}" target="_blank" class="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg" title="টোকেন স্লিপ">
              <i data-lucide="printer" class="w-4 h-4"></i>
            </a>

            <!-- Delete -->
            <button onclick="deleteAppointment('${item.id}')" class="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="মুছে ফেলুন">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  renderIcons();
}

async function updateStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/admin/appointment/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) loadAppointments();
  } catch (err) {
    console.error(err);
  }
}

async function togglePaymentStatus(id, newPaymentStatus) {
  try {
    const res = await fetch(`/api/admin/appointment/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ paymentStatus: newPaymentStatus })
    });
    const data = await res.json();
    if (data.success) loadAppointments();
  } catch (err) {
    console.error(err);
  }
}

async function deleteAppointment(id) {
  if (!confirm(`আপনি কি নিশ্চিত যে #${id} মুছে ফেলতে চান?`)) return;
  try {
    const res = await fetch(`/api/admin/appointment/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success) loadAppointments();
  } catch (err) {
    console.error(err);
  }
}

// WhatsApp Confirmation Sender
function sendWhatsAppConfirmation(appointmentId) {
  const item = appointmentsCache.find(a => a.id === appointmentId);
  if (!item) return;

  const msg = `আসসালামু আলাইকুম ${item.patientName},\nচিশতিয়া হোমিও ক্লিনিক (ডাঃ মোঃ আলাউদ্দিন) থেকে আপনার অ্যাপয়েন্টমেন্ট নিশ্চিত হয়েছে।\nসিরিয়াল নং: #${item.id}\nতারিখ: ${item.appointmentDate}\nসময় স্লট: ${item.timeSlot}\nচেম্বার: চিশতিয়া হোমিও ক্লিনিক (বিকাল ৪:০০ - রাত ১০:০০)\nঅনুরোধ: নির্ধারিত সময়ের ১০ মিনিট পূর্বে চেম্বারে উপস্থিত থাকবেন। ধন্যবাদ।`;
  const cleanPhone = item.phone.replace(/[^0-9]/g, '');
  window.open(`https://wa.me/88${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ================= 2. DIGITAL PRESCRIPTIONS LOGIC =================
let medicineRowCount = 0;

function addMedicineRow(medData = null) {
  medicineRowCount++;
  const container = document.getElementById('medicinesContainer');
  const div = document.createElement('div');
  div.id = `medRow-${medicineRowCount}`;
  div.className = 'grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs';

  div.innerHTML = `
    <div class="col-span-4">
      <input type="text" list="inventoryRemedies" placeholder="ওষুধের নাম (যেমন: Nux Vomica)" value="${medData ? medData.name : ''}" class="med-name w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-emerald-950">
    </div>
    <div class="col-span-2">
      <select class="med-potency w-full px-1.5 py-1.5 border border-slate-300 rounded-lg font-semibold text-emerald-800">
        <option value="30C" ${medData && medData.potency === '30C' ? 'selected' : ''}>30C</option>
        <option value="200C" ${medData && medData.potency === '200C' ? 'selected' : ''}>200C</option>
        <option value="1M" ${medData && medData.potency === '1M' ? 'selected' : ''}>1M</option>
        <option value="10M" ${medData && medData.potency === '10M' ? 'selected' : ''}>10M</option>
        <option value="Q (Mother Tincture)" ${medData && medData.potency.includes('Q') ? 'selected' : ''}>Q (Tincture)</option>
        <option value="6X" ${medData && medData.potency === '6X' ? 'selected' : ''}>6X (Biochemic)</option>
        <option value="12X" ${medData && medData.potency === '12X' ? 'selected' : ''}>12X</option>
        <option value="CM" ${medData && medData.potency === 'CM' ? 'selected' : ''}>CM</option>
      </select>
    </div>
    <div class="col-span-4">
      <input type="text" placeholder="সেবনবিধি (যেমন: ৪ ফোঁটা দিনে ২ বার খাওয়ার আগে)" value="${medData ? medData.dosage : '৪ ফোঁটা দিনে ২ বার আধা কাপ পানিতে খাওয়ার আগে'}" class="med-dosage w-full px-2.5 py-1.5 border border-slate-300 rounded-lg">
    </div>
    <div class="col-span-1">
      <input type="number" placeholder="দিন" value="${medData ? medData.days : 15}" class="med-days w-full px-1 py-1.5 border border-slate-300 rounded-lg text-center font-bold">
    </div>
    <div class="col-span-1 text-center">
      <button type="button" onclick="document.getElementById('medRow-${medicineRowCount}').remove()" class="p-1.5 text-red-500 hover:bg-red-50 rounded">
        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
      </button>
    </div>
  `;

  container.appendChild(div);
  renderIcons();
}

function openPrescriptionForAppointment(appointmentId) {
  const item = appointmentsCache.find(a => a.id === appointmentId);
  if (!item) return;

  document.getElementById('rxModalAppointmentId').value = item.id;
  document.getElementById('rxModalPatientName').value = item.patientName;
  document.getElementById('rxModalPhone').value = item.phone;
  document.getElementById('rxModalAge').value = item.age || '';
  document.getElementById('rxModalGender').value = item.gender || 'পুরুষ';
  document.getElementById('rxModalDiagnosis').value = item.symptoms || '';

  // Reset & Add first row
  document.getElementById('medicinesContainer').innerHTML = '';
  addMedicineRow();

  // Try to pre-fill constitutional info if available
  fetch(`/api/admin/case/${item.phone}`, { headers: getAuthHeaders() })
    .then(r => r.json())
    .then(data => {
      if (data.success && data.caseRecord) {
        const c = data.caseRecord;
        document.getElementById('rxModalDiagnosis').value += ` [${c.thermal || ''} • ${Array.isArray(c.miasm) ? c.miasm.join('/') : ''}]`;
      }
    }).catch(() => {});

  document.getElementById('prescriptionModal').classList.remove('hidden');
  renderIcons();
}

function openNewPrescriptionModal() {
  document.getElementById('rxModalAppointmentId').value = '';
  document.getElementById('rxModalPatientName').value = '';
  document.getElementById('rxModalPhone').value = '';
  document.getElementById('rxModalAge').value = '';
  document.getElementById('rxModalDiagnosis').value = '';
  document.getElementById('medicinesContainer').innerHTML = '';
  addMedicineRow();
  document.getElementById('prescriptionModal').classList.remove('hidden');
  renderIcons();
}

function closePrescriptionModal() {
  document.getElementById('prescriptionModal').classList.add('hidden');
}

// Prescription Form Submit
document.getElementById('prescriptionForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const medRows = document.querySelectorAll('#medicinesContainer > div');
  const medicines = [];
  medRows.forEach(row => {
    const name = row.querySelector('.med-name').value.trim();
    const potency = row.querySelector('.med-potency').value;
    const dosage = row.querySelector('.med-dosage').value.trim();
    const days = row.querySelector('.med-days').value;
    if (name) {
      medicines.push({ name, potency, dosage, days: parseInt(days, 10) || 15 });
    }
  });

  if (medicines.length === 0) {
    alert('কমপক্ষে একটি হোমিওপ্যাথিক ওষুধ যোগ করুন!');
    return;
  }

  const payload = {
    appointmentId: document.getElementById('rxModalAppointmentId').value,
    patientName: document.getElementById('rxModalPatientName').value.trim(),
    phone: document.getElementById('rxModalPhone').value.trim(),
    age: document.getElementById('rxModalAge').value,
    gender: document.getElementById('rxModalGender').value,
    diagnosis: document.getElementById('rxModalDiagnosis').value.trim(),
    advice: document.getElementById('rxModalAdvice').value.trim(),
    followupDays: parseInt(document.getElementById('rxModalFollowupDays').value, 10) || 15,
    medicines
  };

  try {
    const res = await fetch('/api/admin/prescriptions', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success && data.prescription) {
      closePrescriptionModal();
      window.open(`/prescription/${data.prescription.id}`, '_blank');
      loadPrescriptions();
      loadAppointments();
    } else {
      alert('প্রেসক্রিপশন তৈরি ব্যর্থ হয়েছে!');
    }
  } catch (err) {
    console.error(err);
  }
});

async function loadPrescriptions() {
  try {
    const res = await fetch('/api/admin/prescriptions', { headers: getAuthHeaders() });
    const data = await res.json();
    const tbody = document.getElementById('prescriptionsTableBody');

    if (!data.success || !data.prescriptions || data.prescriptions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400">কোনো প্রেসক্রিপশন পাওয়া যায়নি</td></tr>`;
      renderIcons();
      return;
    }

    tbody.innerHTML = data.prescriptions.map(rx => `
      <tr class="hover:bg-slate-50 border-b border-slate-100">
        <td class="px-4 py-3 font-mono font-bold text-emerald-900">#${rx.id}</td>
        <td class="px-4 py-3">
          <div class="font-bold text-slate-800">${rx.patientName}</div>
          <div class="font-mono text-slate-500 text-[11px]">${rx.phone}</div>
        </td>
        <td class="px-4 py-3 font-medium text-slate-800">${rx.diagnosis || '--'}</td>
        <td class="px-4 py-3">
          <div class="space-y-0.5 text-[11px]">
            ${(rx.medicines || []).map(m => `<span class="inline-block bg-emerald-50 text-emerald-900 border border-emerald-200 px-1.5 py-0.5 rounded font-bold mr-1">${m.name} (${m.potency})</span>`).join('')}
          </div>
        </td>
        <td class="px-4 py-3 text-slate-600 text-xs">
          ${rx.followupDays ? `${rx.followupDays} দিন মেয়াদ` : '--'}
          <div class="text-[10px] text-slate-400">${new Date(rx.createdAt).toLocaleDateString('bn-BD')}</div>
        </td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          <a href="/prescription/${rx.id}" target="_blank" class="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg font-bold text-xs inline-flex items-center gap-1">
            <i data-lucide="eye" class="w-3.5 h-3.5"></i>
            <span>ভিউ ও প্রিন্ট</span>
          </a>
          <button onclick="shareRxWhatsApp('${rx.id}', '${rx.patientName}', '${rx.phone}')" class="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="WhatsApp এ পাঠান">
            <i data-lucide="message-circle" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `).join('');

    renderIcons();
  } catch (err) {
    console.error(err);
  }
}

function shareRxWhatsApp(rxId, name, phone) {
  const url = `${window.location.origin}/prescription/${rxId}`;
  const msg = `আসসালামু আলাইকুম ${name},\nচিশতিয়া হোমিও ক্লিনিক (ডাঃ মোঃ আলাউদ্দিন) থেকে আপনার ডিজিটাল প্রেসক্রিপশন দেখতে নিচের লিংকে প্রবেশ করুন:\n${url}\nসুস্থ থাকুন, ধন্যবাদ।`;
  window.open(`https://wa.me/88${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ================= 3. CONSTITUTIONAL CASE SHEETS LOGIC =================
function openCaseForPatient(phone, name = '', age = '', gender = '') {
  document.getElementById('casePhone').value = phone;
  document.getElementById('casePatientName').value = name;
  document.getElementById('caseModal').classList.remove('hidden');

  fetch(`/api/admin/case/${phone}`, { headers: getAuthHeaders() })
    .then(r => r.json())
    .then(data => {
      if (data.success && data.caseRecord) {
        const c = data.caseRecord;
        document.getElementById('casePatientName').value = c.patientName || name;
        document.getElementById('caseThermal').value = c.thermal || 'গরমকাতর (Hot Patient)';
        document.getElementById('caseThirst').value = c.thirst || '';
        document.getElementById('caseDesires').value = c.desires || '';
        document.getElementById('caseAversions').value = c.aversions || '';
        document.getElementById('caseMind').value = c.mind || '';
        document.getElementById('caseSleep').value = c.sleep || '';
        document.getElementById('casePastIllness').value = c.pastIllness || '';
        document.getElementById('caseGeneralNotes').value = c.generalNotes || '';
      }
    });

  renderIcons();
}

function openNewCaseModal() {
  document.getElementById('caseForm').reset();
  document.getElementById('caseModal').classList.remove('hidden');
  renderIcons();
}

function closeCaseModal() {
  document.getElementById('caseModal').classList.add('hidden');
}

document.getElementById('caseForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const miasmSelect = document.getElementById('caseMiasm');
  const selectedMiasms = Array.from(miasmSelect.selectedOptions).map(o => o.value);

  const payload = {
    patientName: document.getElementById('casePatientName').value.trim(),
    phone: document.getElementById('casePhone').value.trim(),
    miasm: selectedMiasms,
    thermal: document.getElementById('caseThermal').value,
    thirst: document.getElementById('caseThirst').value.trim(),
    desires: document.getElementById('caseDesires').value.trim(),
    aversions: document.getElementById('caseAversions').value.trim(),
    mind: document.getElementById('caseMind').value.trim(),
    sleep: document.getElementById('caseSleep').value.trim(),
    pastIllness: document.getElementById('casePastIllness').value.trim(),
    generalNotes: document.getElementById('caseGeneralNotes').value.trim()
  };

  try {
    const res = await fetch('/api/admin/case', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('হোমিওপ্যাথিক কেস-টেকিং সফলভাবে সংরক্ষিত হয়েছে!');
      closeCaseModal();
      loadCases();
    }
  } catch (err) {
    console.error(err);
  }
});

async function loadCases() {
  try {
    const res = await fetch('/api/admin/cases', { headers: getAuthHeaders() });
    const data = await res.json();
    const tbody = document.getElementById('casesTableBody');

    if (!data.success || !data.cases || data.cases.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">কোনো কেস টেকিং শিট পাওয়া যায়নি</td></tr>`;
      renderIcons();
      return;
    }

    tbody.innerHTML = data.cases.map(c => `
      <tr class="hover:bg-slate-50 border-b border-slate-100">
        <td class="px-4 py-3 font-bold text-slate-800">${c.patientName}</td>
        <td class="px-4 py-3 font-mono text-slate-600">${c.phone}</td>
        <td class="px-4 py-3">
          <span class="bg-purple-100 text-purple-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
            ${Array.isArray(c.miasm) ? c.miasm.join(', ') : c.miasm}
          </span>
        </td>
        <td class="px-4 py-3 font-semibold text-emerald-800">${c.thermal || '--'}</td>
        <td class="px-4 py-3 max-w-xs truncate" title="পছন্দ: ${c.desires}">${c.desires || '--'}</td>
        <td class="px-4 py-3 max-w-xs truncate" title="${c.mind}">${c.mind || '--'}</td>
        <td class="px-4 py-3 text-right">
          <button onclick="openCaseForPatient('${c.phone}', '${c.patientName}')" class="px-2.5 py-1 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded-lg font-bold text-xs">
            সম্পাদনা
          </button>
        </td>
      </tr>
    `).join('');

    renderIcons();
  } catch (err) {
    console.error(err);
  }
}

function searchCaseByPhone() {
  const phone = document.getElementById('caseSearchInput').value.trim();
  if (!phone) return alert('মোবাইল নম্বর লিখুন!');
  openCaseForPatient(phone);
}

// ================= 4. INVENTORY LOGIC =================
async function loadInventory() {
  try {
    const res = await fetch('/api/admin/inventory', { headers: getAuthHeaders() });
    const data = await res.json();
    inventoryCache = data.inventory || [];
    renderInventoryTable(data.inventory);
    renderLowStockAlert(data.alerts);
  } catch (err) {
    console.error(err);
  }
}

async function loadInventoryAlerts() {
  try {
    const res = await fetch('/api/admin/inventory', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.alerts && data.alerts.length > 0) {
      document.getElementById('lowStockBadge').textContent = data.alerts.length;
      document.getElementById('lowStockBadge').classList.remove('hidden');
    }
  } catch (err) {}
}

function renderLowStockAlert(alerts) {
  const box = document.getElementById('lowStockAlertBox');
  const text = document.getElementById('lowStockAlertText');
  if (alerts && alerts.length > 0) {
    box.classList.remove('hidden');
    text.innerHTML = `⚠️ মোট <b>${alerts.length}টি</b> ওষুধের স্টক ন্যূনতম লিমিটের নিচে রয়েছে: ` +
      alerts.map(a => `<span class="bg-red-200 text-red-950 px-1.5 py-0.5 rounded font-bold mx-0.5">${a.name} ${a.potency} (${a.stock} ${a.unit})</span>`).join(', ');
  } else {
    box.classList.add('hidden');
  }
}

function renderInventoryTable(list) {
  const tbody = document.getElementById('inventoryTableBody');
  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">কোনো ওষুধ পাওয়া যায়নি</td></tr>`;
    renderIcons();
    return;
  }

  tbody.innerHTML = list.map(m => {
    const isLow = m.stock <= (m.minAlert || 15);
    return `
      <tr class="hover:bg-slate-50 border-b border-slate-100 ${isLow ? 'bg-red-50/40' : ''}">
        <td class="px-4 py-3 font-mono text-slate-400 font-bold">${m.id}</td>
        <td class="px-4 py-3 font-bold text-emerald-950 text-sm">${m.name}</td>
        <td class="px-4 py-3 font-semibold text-emerald-800">${m.potency}</td>
        <td class="px-4 py-3 text-slate-500">${m.type}</td>
        <td class="px-4 py-3 font-bold font-mono text-sm ${isLow ? 'text-red-600' : 'text-slate-800'}">
          ${m.stock} ${m.unit}
        </td>
        <td class="px-4 py-3">
          ${isLow 
            ? `<span class="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-max">
                 <i data-lucide="alert-circle" class="w-3 h-3"></i> স্টক কম!
               </span>`
            : `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">পর্যাপ্ত স্টক</span>`
          }
        </td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          <div class="flex items-center justify-end gap-1">
            <button onclick="quickStockChange('${m.id}', -5)" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold" title="৫ কমান">-৫</button>
            <button onclick="quickStockChange('${m.id}', 10)" class="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded font-bold" title="১০ বাড়ান">+১০</button>
            <button onclick="deleteMedicine('${m.id}')" class="p-1.5 text-red-500 hover:bg-red-50 rounded ml-1" title="মুছে ফেলুন">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  renderIcons();
}

async function quickStockChange(id, delta) {
  const item = inventoryCache.find(m => m.id === id);
  if (!item) return;
  const newStock = Math.max(0, item.stock + delta);

  try {
    const res = await fetch(`/api/admin/inventory/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ stock: newStock })
    });
    const data = await res.json();
    if (data.success) loadInventory();
  } catch (err) {
    console.error(err);
  }
}

function openAddMedicineModal() {
  document.getElementById('medicineForm').reset();
  document.getElementById('medicineModal').classList.remove('hidden');
  renderIcons();
}

function closeMedicineModal() {
  document.getElementById('medicineModal').classList.add('hidden');
}

document.getElementById('medicineForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    name: document.getElementById('medName').value.trim(),
    potency: document.getElementById('medPotency').value.trim() || '30C',
    type: document.getElementById('medType').value,
    stock: parseFloat(document.getElementById('medStock').value) || 0,
    unit: document.getElementById('medUnit').value.trim() || 'ml',
    minAlert: parseFloat(document.getElementById('medMinAlert').value) || 15
  };

  try {
    const res = await fetch('/api/admin/inventory', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      closeMedicineModal();
      loadInventory();
    }
  } catch (err) {
    console.error(err);
  }
});

async function deleteMedicine(id) {
  if (!confirm('আপনি কি নিশ্চিত যে এই ওষুধটি ইনভেন্টরি থেকে মুছে ফেলতে চান?')) return;
  try {
    const res = await fetch(`/api/admin/inventory/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success) loadInventory();
  } catch (err) {
    console.error(err);
  }
}

// ================= 5. FOLLOW-UPS LOGIC =================
async function loadFollowups() {
  try {
    const res = await fetch('/api/admin/followups', { headers: getAuthHeaders() });
    const data = await res.json();
    const tbody = document.getElementById('followupsTableBody');

    if (!data.success || !data.followups || data.followups.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400">কোনো ফলো-আপ শিডিউল পাওয়া যায়নি</td></tr>`;
      renderIcons();
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    tbody.innerHTML = data.followups.map(f => {
      const isDue = f.dueDate <= today;
      return `
        <tr class="hover:bg-slate-50 border-b border-slate-100 ${isDue ? 'bg-amber-50/50' : ''}">
          <td class="px-4 py-3 font-bold text-slate-800">${f.patientName}</td>
          <td class="px-4 py-3 font-mono font-semibold text-emerald-800">${f.phone}</td>
          <td class="px-4 py-3 text-slate-600">${f.daysDuration} দিনের ওষুধ</td>
          <td class="px-4 py-3 font-bold ${isDue ? 'text-amber-800 font-bold' : 'text-slate-700'}">
            ${f.dueDate} ${isDue ? '⚠️ (আজ বা মেয়াদ উত্তীর্ণ)' : ''}
          </td>
          <td class="px-4 py-3">
            ${f.reminderSent 
              ? `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">রিমাইন্ডার পাঠানো হয়েছে ✓</span>`
              : `<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">অপেক্ষমান</span>`
            }
          </td>
          <td class="px-4 py-3 text-right whitespace-nowrap">
            <div class="flex items-center justify-end gap-1.5">
              <button onclick="sendFollowupWhatsApp('${f.id}', '${f.patientName}', '${f.phone}', ${f.daysDuration})" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1">
                <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                <span>WhatsApp রিমাইন্ডার</span>
              </button>
              <button onclick="sendFollowupTelegram('${f.id}')" class="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold" title="টেলিগ্রামে সতর্কতা পাঠান">
                <i data-lucide="send" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    renderIcons();
  } catch (err) {
    console.error(err);
  }
}

function sendFollowupWhatsApp(id, name, phone, days) {
  const msg = `আসসালামু আলাইকুম ${name},\nচিশতিয়া হোমিও ক্লিনিক থেকে ডাঃ মোঃ আলাউদ্দিন। আপনার ${days} দিনের ওষুধ প্রায় শেষ হতে চলেছে। শারীরিক অবস্থা পর্যালোচনা ও পরবর্তী সিরিয়ালের জন্য অনুগ্রহ করে যোগাযোগ করুন।\nচেম্বার: প্রতিদিন বিকাল ৪:০০ টা থেকে রাত ১০:০০ টা।\nঅনলাইন সিরিয়াল: ${window.location.origin}\nধন্যবাদ।`;
  window.open(`https://wa.me/88${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  
  // Also mark reminder sent
  fetch(`/api/admin/followup/remind/${id}`, { method: 'POST', headers: getAuthHeaders() })
    .then(() => loadFollowups())
    .catch(() => {});
}

async function sendFollowupTelegram(id) {
  try {
    const res = await fetch(`/api/admin/followup/remind/${id}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    alert(data.message || 'টেলিগ্রামে ফলো-আপ রিমাইন্ডার পাঠানো হয়েছে!');
    loadFollowups();
  } catch (err) {
    console.error(err);
  }
}

// ================= SETTINGS & TELEGRAM =================
function openSettingsModal() {
  document.getElementById('settingsModal').classList.remove('hidden');
  renderIcons();
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.add('hidden');
  document.getElementById('telegramTestFeedback').textContent = '';
}

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  const payload = {
    clinicName: formData.get('clinicName'),
    doctorName: formData.get('doctorName'),
    doctorDegree: formData.get('doctorDegree'),
    phone: formData.get('phone'),
    phoneSecondary: formData.get('phoneSecondary'),
    visitingHours: formData.get('visitingHours'),
    bkashNumber: formData.get('bkashNumber'),
    nagadNumber: formData.get('nagadNumber'),
    consultationFeeNew: formData.get('consultationFeeNew'),
    consultationFeeOld: formData.get('consultationFeeOld'),
    telegramBotToken: formData.get('telegramBotToken'),
    telegramChatId: formData.get('telegramChatId'),
    telegramEnabled: document.getElementById('telegramEnabled').checked
  };

  const newPass = formData.get('adminPassword');
  if (newPass && newPass.trim()) payload.adminPassword = newPass.trim();

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
      closeSettingsModal();
      loadClinicSettings();
    }
  } catch (err) {
    alert('সার্ভার যোগাযোগে ত্রুটি!');
  }
});

async function testTelegramAlert() {
  const token = document.getElementById('telegramBotToken').value.trim();
  const chatId = document.getElementById('telegramChatId').value.trim();
  const feedback = document.getElementById('telegramTestFeedback');
  const btn = document.getElementById('testTelegramBtn');

  if (!token || !chatId) return alert('টোকেন ও চ্যাট আইডি উভয়ই দিন!');

  btn.disabled = true;
  feedback.className = 'text-xs text-sky-700 mt-1';
  feedback.textContent = 'টেস্ট পাঠানো হচ্ছে...';

  try {
    const res = await fetch('/api/admin/test-telegram', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ token, chatId })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      feedback.className = 'text-xs text-emerald-700 font-bold mt-1';
      feedback.textContent = '✅ টেলিগ্রামে সফলভাবে টেস্ট মেসেজ পৌঁছেছে!';
    } else {
      feedback.className = 'text-xs text-red-600 font-bold mt-1';
      feedback.textContent = `❌ ত্রুটি: ${data.message}`;
    }
  } catch (err) {
    feedback.className = 'text-xs text-red-600 font-bold mt-1';
    feedback.textContent = 'সার্ভারে সংযোগ ব্যর্থ হয়েছে।';
  } finally {
    btn.disabled = false;
  }
}

// Export CSV
function exportToCSV() {
  if (!appointmentsCache || appointmentsCache.length === 0) return alert('কোনো ডাটা নেই!');
  let csv = '\uFEFF';
  csv += "সিরিয়াল আইডি,রোগীর নাম,বয়স,লিঙ্গ,মোবাইল,তারিখ,সময়,পেমেন্ট পদ্ধতি,পেমেন্ট স্ট্যাটাস,প্রধান লক্ষণ,স্ট্যাটাস\n";

  appointmentsCache.forEach(a => {
    const row = [
      `"${a.id || ''}"`,
      `"${a.patientName || ''}"`,
      `"${a.age || ''}"`,
      `"${a.gender || ''}"`,
      `"${a.phone || ''}"`,
      `"${a.appointmentDate || ''}"`,
      `"${a.timeSlot || ''}"`,
      `"${a.paymentMethod || 'Cash'}"`,
      `"${a.paymentStatus || 'Unpaid'}"`,
      `"${(a.symptoms || '').replace(/"/g, '""')}"`,
      `"${a.status || ''}"`
    ];
    csv += row.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Chishtia_Homeo_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Filter listeners
document.getElementById('filterDate').addEventListener('change', loadAppointments);
document.getElementById('filterStatus').addEventListener('change', loadAppointments);
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(window.searchDebounce);
  window.searchDebounce = setTimeout(loadAppointments, 300);
});

// Run check on load
document.addEventListener('DOMContentLoaded', () => {
  renderIcons();
  checkAuth();
});
