// Lucide icons init helper
function renderIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Global Clinic Info
let clinicInfo = {};

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
    document.getElementById('headerClinicName').textContent = info.clinicName;
    document.getElementById('footerClinicName').textContent = info.clinicName;
    document.title = `${info.clinicName} - অনলাইন সিরিয়াল বুকিং`;
  }
  if (info.doctorName) {
    document.getElementById('headerDoctorName').textContent = `${info.doctorName} | ${info.doctorDegree || ''}`;
  }
  if (info.visitingHours) {
    document.getElementById('infoVisitingHours').textContent = info.visitingHours;
  }
  if (info.address) {
    document.getElementById('infoAddress').textContent = info.address;
  }
  if (info.phone) {
    document.getElementById('callDoctorBtn').href = `tel:${info.phone}`;
    document.getElementById('headerPhoneText').textContent = info.phone;
  }
  if (info.phoneSecondary && document.getElementById('secondaryPhoneBtn')) {
    document.getElementById('secondaryPhoneBtn').href = `tel:${info.phoneSecondary}`;
    document.getElementById('secondaryPhoneText').textContent = info.phoneSecondary;
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

// Payment method switcher
function handlePaymentChange(method) {
  const details = document.getElementById('mobileBankingDetails');
  const labelCash = document.getElementById('labelPayCash');
  const labelMobile = document.getElementById('labelPayMobile');

  if (method === 'bKash / Nagad') {
    details.classList.remove('hidden');
    labelMobile.classList.add('border-emerald-500', 'bg-emerald-50/40');
    labelMobile.classList.remove('border-slate-200');
    labelCash.classList.remove('border-emerald-500', 'bg-emerald-50/40');
    labelCash.classList.add('border-slate-200');
    document.getElementById('paymentTrxId').required = true;
    document.getElementById('paymentPhone').required = true;
  } else {
    details.classList.add('hidden');
    labelCash.classList.add('border-emerald-500', 'bg-emerald-50/40');
    labelCash.classList.remove('border-slate-200');
    labelMobile.classList.remove('border-emerald-500', 'bg-emerald-50/40');
    labelMobile.classList.add('border-slate-200');
    document.getElementById('paymentTrxId').required = false;
    document.getElementById('paymentPhone').required = false;
  }
  renderIcons();
}

// Quick symptom tag appender
function addSymptomTag(tagText) {
  const textarea = document.getElementById('symptoms');
  if (!textarea.value.trim()) {
    textarea.value = tagText;
  } else {
    // If not already included
    if (!textarea.value.includes(tagText)) {
      textarea.value += `, ${tagText}`;
    }
  }
  textarea.focus();
}

// File select preview helper
function handleFileSelect(event) {
  const file = event.target.files[0];
  const label = document.getElementById('fileUploadName');
  if (file) {
    label.textContent = `নির্বাচিত ফাইল: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    label.classList.add('text-emerald-600', 'font-semibold');
    label.classList.remove('text-slate-400');
  } else {
    label.textContent = 'JPG, PNG বা PDF (সর্বোচ্চ ৫ মেগাবাইট)';
    label.classList.remove('text-emerald-600', 'font-semibold');
    label.classList.add('text-slate-400');
  }
}

// Fetch Slots for a given date
async function loadSlots(dateStr) {
  const slotSelect = document.getElementById('timeSlot');
  const notice = document.getElementById('slotNotice');
  slotSelect.innerHTML = '<option value="">স্লট লোড হচ্ছে...</option>';
  slotSelect.disabled = true;

  try {
    const res = await fetch(`/api/slots?date=${dateStr}`);
    const data = await res.json();

    slotSelect.innerHTML = '';
    if (data.success && data.slots && data.slots.length > 0) {
      slotSelect.appendChild(new Option('-- সময় স্লট বেছে নিন --', ''));
      let availableCount = 0;

      data.slots.forEach(item => {
        const remaining = item.capacity - item.booked;
        let optText = `${item.slot}`;
        if (remaining <= 0) {
          optText += ` (পূর্ণ / বুকড্)`;
        } else {
          optText += ` (খালি আছে: ${remaining}টি)`;
          availableCount++;
        }

        const opt = new Option(optText, item.slot);
        if (!item.available) {
          opt.disabled = true;
        }
        slotSelect.appendChild(opt);
      });

      slotSelect.disabled = false;
      if (availableCount > 0) {
        notice.textContent = `✓ এই তারিখে ${availableCount}টি সময় স্লট বুকিংয়ের জন্য উন্মুক্ত রয়েছে।`;
        notice.className = 'text-[11px] text-emerald-700 mt-1';
      } else {
        notice.textContent = '⚠️ এই তারিখের সকল স্লট বুকড্ হয়ে গেছে। দয়া করে অন্য তারিখ বাছুন।';
        notice.className = 'text-[11px] text-amber-700 mt-1';
      }
    } else {
      slotSelect.innerHTML = '<option value="">কোনো স্লট পাওয়া যায়নি</option>';
      notice.textContent = 'কোনো স্লট পাওয়া যায়নি।';
    }
  } catch (err) {
    console.error('Error fetching slots:', err);
    slotSelect.innerHTML = '<option value="">স্লট লোড করতে ত্রুটি হয়েছে</option>';
  }
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
  dateInput.value = minDate; // default to today
  loadSlots(minDate);

  dateInput.addEventListener('change', (e) => {
    if (e.target.value) {
      loadSlots(e.target.value);
    }
  });
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

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
  renderIcons();
  loadClinicInfo();
  initDatePicker();
});
