// Lucide icons init helper
function renderIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Global Clinic Info & State
let clinicInfo = {};
let selectedSlotValue = '';
let currentPatientType = 'নতুন রোগী';
let currentPaymentMethod = 'Cash at Clinic';

// Bengali Day Names and Month Names
const banglaDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
const banglaMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

function formatBanglaDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const dayName = banglaDays[d.getDay()];
  const dateNum = d.getDate();
  const monthName = banglaMonths[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${dateNum} ${monthName} ${year}`;
}

// Toast notification helper
let toastTimeout = null;
function showToast(message) {
  const toast = document.getElementById('toastNotification');
  const msg = document.getElementById('toastMessage');
  if (!toast || !msg) return;

  msg.textContent = message;
  toast.classList.remove('translate-y-20', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');
  renderIcons();

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 2800);
}

// 1-Click Clipboard Copy with Toast
function copyNumber(num, msg) {
  const clean = num.replace(/[^0-9]/g, '');
  navigator.clipboard.writeText(clean).then(() => {
    showToast(msg || 'নম্বরটি কপি করা হয়েছে!');
  }).catch(() => {
    showToast(`নম্বর: ${clean}`);
  });
}

// Load Clinic Info from Backend
async function loadClinicInfo() {
  try {
    const res = await fetch('/api/clinic-info');
    const data = await res.json();
    if (data.success) {
      clinicInfo = data.data;
      updateClinicUI(clinicInfo);
    }
  } catch (err) {
    console.error('Failed to load clinic info:', err);
  }
}

// Update UI with dynamic Clinic details
function updateClinicUI(info) {
  if (info.clinicName) {
    const headerEl = document.getElementById('headerClinicName');
    const footerEl = document.getElementById('footerClinicName');
    if (headerEl) headerEl.textContent = info.clinicName;
    if (footerEl) footerEl.textContent = info.clinicName;
    document.title = `${info.clinicName} - অনলাইন সিরিয়াল বুকিং`;
  }
  if (info.doctorName && document.getElementById('headerDoctorName')) {
    document.getElementById('headerDoctorName').textContent = `${info.doctorName} | ${info.doctorDegree || ''}`;
  }
  if (info.visitingHours && document.getElementById('infoVisitingHours')) {
    document.getElementById('infoVisitingHours').textContent = info.visitingHours;
  }
  if (info.phone && document.getElementById('callDoctorBtn') && document.getElementById('headerPhoneText')) {
    document.getElementById('callDoctorBtn').href = `tel:${info.phone}`;
    document.getElementById('headerPhoneText').textContent = info.phone;
  }
  if (info.bkashNumber && document.getElementById('payBkashNum')) {
    document.getElementById('payBkashNum').textContent = info.bkashNumber;
  }
  if (info.nagadNumber && document.getElementById('payNagadNum')) {
    document.getElementById('payNagadNum').textContent = info.nagadNumber;
  }
  if (info.consultationFee && document.getElementById('payFeeNotice')) {
    document.getElementById('payFeeNotice').textContent = info.consultationFee;
  }
}

// Patient Type Switcher
function selectPatientType(type) {
  currentPatientType = type;
  const cardNew = document.getElementById('typeCardNew');
  const cardOld = document.getElementById('typeCardOld');
  const feeDisplay = document.getElementById('feeBadgeDisplay');
  const radios = document.getElementsByName('patientType');

  for (let r of radios) {
    if (r.value === type) r.checked = true;
  }

  if (type === 'নতুন রোগী') {
    cardNew.classList.add('border-emerald-500', 'bg-emerald-50/50');
    cardNew.classList.remove('border-slate-200', 'bg-white');
    cardOld.classList.remove('border-emerald-500', 'bg-emerald-50/50');
    cardOld.classList.add('border-slate-200', 'bg-white');
    if (feeDisplay) feeDisplay.textContent = 'ফি: ৫০০/-';
  } else {
    cardOld.classList.add('border-emerald-500', 'bg-emerald-50/50');
    cardOld.classList.remove('border-slate-200', 'bg-white');
    cardNew.classList.remove('border-emerald-500', 'bg-emerald-50/50');
    cardNew.classList.add('border-slate-200', 'bg-white');
    if (feeDisplay) feeDisplay.textContent = 'ফি: ৩০০/-';
  }
  updateLiveSummary();
}

// Payment method switcher
function handlePaymentChange(method) {
  currentPaymentMethod = method;
  const details = document.getElementById('mobileBankingDetails');
  const labelCash = document.getElementById('labelPayCash');
  const labelMobile = document.getElementById('labelPayMobile');

  if (method === 'bKash / Nagad') {
    details.classList.remove('hidden');
    labelMobile.classList.add('border-emerald-500', 'bg-emerald-50/50');
    labelMobile.classList.remove('border-slate-200', 'bg-white');
    labelCash.classList.remove('border-emerald-500', 'bg-emerald-50/50');
    labelCash.classList.add('border-slate-200', 'bg-white');
    document.getElementById('paymentTrxId').required = true;
    document.getElementById('paymentPhone').required = true;
  } else {
    details.classList.add('hidden');
    labelCash.classList.add('border-emerald-500', 'bg-emerald-50/50');
    labelCash.classList.remove('border-slate-200', 'bg-white');
    labelMobile.classList.remove('border-emerald-500', 'bg-emerald-50/50');
    labelMobile.classList.add('border-slate-200', 'bg-white');
    document.getElementById('paymentTrxId').required = false;
    document.getElementById('paymentPhone').required = false;
  }
  updateLiveSummary();
  renderIcons();
}

// Quick interactive symptom tag toggle
function toggleSymptomTag(tagText, btn) {
  const textarea = document.getElementById('symptoms');
  let currentVal = textarea.value.trim();

  if (currentVal.includes(tagText)) {
    // Remove it
    const regex = new RegExp(`(,\\s*)?${tagText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
    currentVal = currentVal.replace(regex, '').replace(/^,\s*/, '').trim();
    textarea.value = currentVal;
    // De-activate styling
    btn.classList.remove('bg-emerald-600', 'text-white', 'border-emerald-600');
    btn.classList.add('bg-white', 'text-slate-700', 'border-slate-200');
  } else {
    // Add it
    if (!currentVal) {
      textarea.value = tagText;
    } else {
      textarea.value = `${currentVal}, ${tagText}`;
    }
    // Activate styling
    btn.classList.add('bg-emerald-600', 'text-white', 'border-emerald-600');
    btn.classList.remove('bg-white', 'text-slate-700', 'border-slate-200');
  }
  textarea.focus();
}

// File select preview helper
function handleFileSelect(event) {
  const file = event.target.files[0];
  const label = document.getElementById('fileUploadName');
  if (file) {
    label.textContent = `নির্বাচিত ফাইল: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    label.classList.add('text-emerald-700', 'font-bold');
    label.classList.remove('text-slate-400');
  } else {
    label.textContent = 'JPG, PNG বা PDF (সর্বোচ্চ ৫ মেগাবাইট)';
    label.classList.remove('text-emerald-700', 'font-bold');
    label.classList.add('text-slate-400');
  }
}

// Quick Date Selection Helper (0 for today, 1 for tomorrow)
function setQuickDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const dateInput = document.getElementById('appointmentDate');
  dateInput.value = dateStr;

  const btnToday = document.getElementById('btnDateToday');
  const btnTomorrow = document.getElementById('btnDateTomorrow');

  if (offsetDays === 0) {
    btnToday.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white shadow-sm transition';
    btnTomorrow.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
  } else if (offsetDays === 1) {
    btnTomorrow.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white shadow-sm transition';
    btnToday.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
  } else {
    btnToday.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
    btnTomorrow.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
  }

  document.getElementById('selectedDateHuman').textContent = formatBanglaDate(dateStr);
  loadSlots(dateStr);
  updateLiveSummary();
}

// Select a visual slot chip
function selectSlotChip(slotText) {
  selectedSlotValue = slotText;
  const nativeSelect = document.getElementById('timeSlot');
  nativeSelect.value = slotText;

  // Toggle visual active state across all chips
  document.querySelectorAll('.slot-chip').forEach(chip => {
    if (chip.getAttribute('data-slot') === slotText) {
      chip.className = 'slot-chip selected p-2.5 rounded-xl border font-bold text-center cursor-pointer flex flex-col items-center justify-center transition shadow-md bg-emerald-700 text-white border-emerald-500';
      const checkIcon = chip.querySelector('.slot-check-icon');
      if (checkIcon) checkIcon.classList.remove('hidden');
    } else {
      chip.className = 'slot-chip p-2.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-400 font-semibold text-center cursor-pointer flex flex-col items-center justify-center transition hover:bg-emerald-50/30 text-slate-800 shadow-sm';
      const checkIcon = chip.querySelector('.slot-check-icon');
      if (checkIcon) checkIcon.classList.add('hidden');
    }
  });

  updateLiveSummary();
  renderIcons();
}

// Render Visual Time Slot Chips into Afternoon & Night groups
function renderVisualSlotChips(slots) {
  const afternoonContainer = document.getElementById('afternoonSlotsContainer');
  const nightContainer = document.getElementById('nightSlotsContainer');

  afternoonContainer.innerHTML = '';
  nightContainer.innerHTML = '';

  let afternoonList = [];
  let nightList = [];

  slots.forEach(item => {
    // Check hour: 04, 05, 06 are afternoon; 07, 08, 09 are night
    const startHour = item.slot.substring(0, 2);
    if (['04', '05', '06'].includes(startHour)) {
      afternoonList.push(item);
    } else {
      nightList.push(item);
    }
  });

  const renderGroup = (container, list) => {
    if (list.length === 0) {
      container.innerHTML = '<div class="col-span-3 text-center text-slate-400 py-2">কোনো স্লট নেই</div>';
      return;
    }
    list.forEach(item => {
      const remaining = item.capacity - item.booked;
      const isAvailable = item.available && remaining > 0;
      const isSelected = selectedSlotValue === item.slot;

      const card = document.createElement('div');
      card.setAttribute('data-slot', item.slot);

      if (!isAvailable) {
        card.className = 'p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-400 text-center cursor-not-allowed flex flex-col items-center justify-center';
        card.innerHTML = `
          <span class="font-semibold text-xs line-through">${item.slot}</span>
          <span class="text-[10px] text-rose-500 font-bold mt-0.5">পূর্ণ (বুকড্)</span>
        `;
      } else {
        card.className = isSelected
          ? 'slot-chip selected p-2.5 rounded-xl border font-bold text-center cursor-pointer flex flex-col items-center justify-center transition shadow-md bg-emerald-700 text-white border-emerald-500'
          : 'slot-chip p-2.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-400 font-semibold text-center cursor-pointer flex flex-col items-center justify-center transition hover:bg-emerald-50/30 text-slate-800 shadow-sm';

        card.innerHTML = `
          <div class="flex items-center gap-1 font-bold text-xs">
            <span>${item.slot}</span>
            <i data-lucide="check" class="slot-check-icon w-3.5 h-3.5 text-white ${isSelected ? '' : 'hidden'}"></i>
          </div>
          <span class="text-[10px] ${isSelected ? 'text-emerald-100' : 'text-emerald-700'} font-semibold mt-0.5">
            🟢 ${remaining}টি আসন খালি
          </span>
        `;
        card.onclick = () => selectSlotChip(item.slot);
      }
      container.appendChild(card);
    });
  };

  renderGroup(afternoonContainer, afternoonList);
  renderGroup(nightContainer, nightList);
  renderIcons();
}

// Fetch Slots for a given date
async function loadSlots(dateStr) {
  const slotSelect = document.getElementById('timeSlot');
  const notice = document.getElementById('slotNotice');
  const afternoonContainer = document.getElementById('afternoonSlotsContainer');
  const nightContainer = document.getElementById('nightSlotsContainer');

  afternoonContainer.innerHTML = '<div class="col-span-3 text-center text-slate-400 py-2">স্লট লোড হচ্ছে...</div>';
  nightContainer.innerHTML = '<div class="col-span-3 text-center text-slate-400 py-2">স্লট লোড হচ্ছে...</div>';

  slotSelect.innerHTML = '<option value="">স্লট লোড হচ্ছে...</option>';
  slotSelect.disabled = true;

  try {
    const res = await fetch(`/api/slots?date=${dateStr}`);
    const data = await res.json();

    slotSelect.innerHTML = '';
    if (data.success && data.slots && data.slots.length > 0) {
      slotSelect.appendChild(new Option('-- সময় স্লট বেছে নিন --', ''));
      let availableCount = 0;
      let firstAvailableSlot = null;

      data.slots.forEach(item => {
        const remaining = item.capacity - item.booked;
        let optText = `${item.slot}`;
        if (remaining <= 0) {
          optText += ` (পূর্ণ / বুকড্)`;
        } else {
          optText += ` (খালি আছে: ${remaining}টি)`;
          availableCount++;
          if (!firstAvailableSlot) firstAvailableSlot = item.slot;
        }

        const opt = new Option(optText, item.slot);
        if (!item.available) {
          opt.disabled = true;
        }
        slotSelect.appendChild(opt);
      });

      slotSelect.disabled = false;

      // Auto-select first available slot if nothing selected or current not available
      const currentStillAvailable = data.slots.some(s => s.slot === selectedSlotValue && s.available);
      if (!currentStillAvailable && firstAvailableSlot) {
        selectedSlotValue = firstAvailableSlot;
        slotSelect.value = firstAvailableSlot;
      }

      renderVisualSlotChips(data.slots);

      if (availableCount > 0) {
        notice.textContent = `✓ ${availableCount}টি সময় স্লট বুকিংয়ের জন্য উন্মুক্ত রয়েছে`;
        notice.className = 'text-xs font-semibold text-emerald-700';
      } else {
        notice.textContent = '⚠️ এই তারিখের সব স্লট বুকড্ হয়েছে। অন্য তারিখ নির্বাচন করুন।';
        notice.className = 'text-xs font-bold text-amber-700';
      }
    } else {
      slotSelect.innerHTML = '<option value="">কোনো স্লট পাওয়া যায়নি</option>';
      notice.textContent = 'কোনো স্লট পাওয়া যায়নি।';
      afternoonContainer.innerHTML = '<div class="col-span-3 text-center text-slate-400 py-2">কোনো স্লট নেই</div>';
      nightContainer.innerHTML = '<div class="col-span-3 text-center text-slate-400 py-2">কোনো স্লট নেই</div>';
    }
  } catch (err) {
    console.error('Error fetching slots:', err);
    slotSelect.innerHTML = '<option value="">স্লট লোড করতে সমস্যা হয়েছে</option>';
  }
  updateLiveSummary();
}

// Initialize Date Picker
function initDatePicker() {
  const dateInput = document.getElementById('appointmentDate');
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const minDate = `${yyyy}-${mm}-${dd}`;

  dateInput.min = minDate;
  dateInput.value = minDate;
  document.getElementById('selectedDateHuman').textContent = formatBanglaDate(minDate);
  loadSlots(minDate);

  dateInput.addEventListener('change', (e) => {
    if (e.target.value) {
      document.getElementById('selectedDateHuman').textContent = formatBanglaDate(e.target.value);
      loadSlots(e.target.value);
    }
  });
}

// Update Real-Time Live Booking Summary Card
function updateLiveSummary() {
  const dateInput = document.getElementById('appointmentDate');
  const nameInput = document.getElementById('patientName');

  const sumDateSlot = document.getElementById('sumDateSlot');
  const sumPatientName = document.getElementById('sumPatientName');
  const sumPatientTypeFee = document.getElementById('sumPatientTypeFee');
  const sumPaymentMode = document.getElementById('sumPaymentMode');

  if (sumDateSlot) {
    const dVal = dateInput ? dateInput.value : '';
    const sVal = selectedSlotValue || 'স্লট বাছুন';
    sumDateSlot.textContent = `${dVal ? dVal : 'তারিখ'} | ${sVal}`;
  }

  if (sumPatientName) {
    const nVal = nameInput ? nameInput.value.trim() : '';
    sumPatientName.textContent = nVal || 'নাম লিখুন...';
  }

  if (sumPatientTypeFee) {
    const feeText = currentPatientType === 'নতুন রোগী' ? '৫০০/-' : '৩০০/-';
    sumPatientTypeFee.textContent = `${currentPatientType} (${feeText})`;
  }

  if (sumPaymentMode) {
    sumPaymentMode.textContent = currentPaymentMethod === 'Cash at Clinic' ? 'ক্লিনিকে নগদ (Cash)' : 'বিকাশ / নগদ (অনলাইন)';
  }
}

// Handle Form Submission
document.getElementById('appointmentForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submitBtn');
  const originalBtnHtml = submitBtn.innerHTML;

  // Validate form
  const form = e.target;
  const formData = new FormData(form);

  // Set loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
    </svg>
    <span>সংরক্ষণ হচ্ছে ও টেলিগ্রামে পাঠানো হচ্ছে...</span>
  `;

  try {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || 'অ্যাপয়েন্টমেন্ট গ্রহণ করতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
      renderIcons();
      return;
    }

    // Success! Show Confirmation Modal
    showSuccessModal(data.appointment);
    form.reset();
    initDatePicker(); // reset date & slots
    document.getElementById('fileUploadName').textContent = 'JPG, PNG বা PDF (সর্বোচ্চ ৫ মেগাবাইট)';

  } catch (err) {
    console.error('Submission error:', err);
    alert('সার্ভারে যোগাযোগ করতে ব্যর্থ হয়েছে। ইন্টারনেট সংযোগ বা সার্ভার চেক করুন।');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
    renderIcons();
  }
});

// Modal Show/Hide
function showSuccessModal(appointment) {
  document.getElementById('modalSerial').textContent = appointment.id;
  document.getElementById('modalPatientName').textContent = appointment.patientName;
  document.getElementById('modalDate').textContent = appointment.appointmentDate;
  document.getElementById('modalSlot').textContent = appointment.timeSlot;
  document.getElementById('modalReceiptLink').href = `/receipt/${appointment.id}`;

  const modal = document.getElementById('successModal');
  modal.classList.remove('hidden');
  renderIcons();
}

function closeSuccessModal() {
  document.getElementById('successModal').classList.add('hidden');
}

// Search Serial Modal Functions
function openSearchModal() {
  const modal = document.getElementById('searchSerialModal');
  if (modal) {
    modal.classList.remove('hidden');
    document.getElementById('searchSerialInput').focus();
    renderIcons();
  }
}

function closeSearchModal() {
  const modal = document.getElementById('searchSerialModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

async function executeSearchSerial() {
  const input = document.getElementById('searchSerialInput');
  const container = document.getElementById('searchResultsContainer');
  const q = (input.value || '').trim();

  if (q.length < 3) {
    container.innerHTML = '<p class="text-xs text-rose-500 text-center py-3">দয়া করে কমপক্ষে ৩টি সংখ্যা বা অক্ষর লিখুন।</p>';
    return;
  }

  container.innerHTML = '<p class="text-xs text-slate-400 text-center py-3">খোঁজা হচ্ছে...</p>';

  try {
    const res = await fetch(`/api/search-appointments?q=${encodeURIComponent(q)}`);
    const data = await res.json();

    if (!data.success || !data.results || data.results.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-500 text-center py-4 bg-slate-50 rounded-xl">কোনো বুকিং রেকর্ড পাওয়া যায়নি। নম্বর সঠিক আছে কিনা যাচাই করুন।</p>';
      return;
    }

    let html = '';
    data.results.forEach(item => {
      html += `
        <div class="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-emerald-950 font-mono text-sm">${item.id}</span>
              <span class="px-2 py-0.2 rounded-full font-bold text-[10px] ${item.status === 'Completed' ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-800'}">${item.status}</span>
            </div>
            <p class="font-bold text-slate-800 mt-0.5">${item.patientName}</p>
            <p class="text-[11px] text-slate-500">তারিখ: ${item.appointmentDate} | ${item.timeSlot}</p>
          </div>
          <div class="flex flex-col gap-1.5 shrink-0">
            <a href="${item.receiptUrl}" target="_blank" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-center shadow-sm">
              টোকেন স্লিপ
            </a>
            ${item.hasPrescription ? `<a href="/prescription/${item.id}" target="_blank" class="px-3 py-1 bg-teal-600 text-white font-semibold rounded-lg text-center text-[11px]">প্রেসক্রিপশন</a>` : ''}
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
    renderIcons();
  } catch (err) {
    console.error('Search error:', err);
    container.innerHTML = '<p class="text-xs text-rose-500 text-center py-3">সার্চ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।</p>';
  }
}

// Doctor Lightbox Popup Functions
function openDoctorLightbox() {
  const modal = document.getElementById('doctorLightboxModal');
  const content = document.getElementById('doctorLightboxContent');
  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      if (content) {
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
      }
    }, 10);
    renderIcons();
  }
}

function closeDoctorLightbox() {
  const modal = document.getElementById('doctorLightboxModal');
  const content = document.getElementById('doctorLightboxContent');
  if (content) {
    content.classList.remove('scale-100');
    content.classList.add('scale-95');
  }
  setTimeout(() => {
    if (modal) {
      modal.classList.add('hidden');
    }
  }, 150);
}

// Global Escape Key Listener
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDoctorLightbox();
    closeSuccessModal();
    closeSearchModal();
  }
});

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
  renderIcons();
  loadClinicInfo();
  initDatePicker();
  updateLiveSummary();
});