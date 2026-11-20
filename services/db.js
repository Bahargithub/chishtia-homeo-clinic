const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const APPOINTMENTS_FILE = path.join(DATA_DIR, 'appointments.json');
const PRESCRIPTIONS_FILE = path.join(DATA_DIR, 'prescriptions.json');
const CASES_FILE = path.join(DATA_DIR, 'cases.json');
const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json');
const FOLLOWUPS_FILE = path.join(DATA_DIR, 'followups.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_SETTINGS = {
  clinicName: "চিশতিয়া হোমিও ক্লিনিক",
  clinicSubtitle: "সুস্থ দেহ, সুন্দর জীবন | প্রকৃতির ছোঁয়ায় সুস্থতার প্রত্যাশা",
  doctorName: "ডাঃ মোঃ আলাউদ্দিন",
  doctorDegree: "বি.এইচ.এম.এস, ডি.এইচ.এম.এস. (হোমিওপ্যাথিক চিকিৎসক)",
  doctorRegNo: "হোমিওপ্যাথিক চিকিৎসক",
  phone: "01719-158085",
  phoneSecondary: "01619-158085",
  whatsapp: "01719-158085",
  email: "chishtiahomeoclinic@gmail.com",
  address: "চিশতিয়া হোমিও ক্লিনিক",
  visitingHours: "প্রতিদিন বিকাল ৪:০০ টা থেকে রাত ১০:০০ টা",
  consultationFee: "নতুন রোগী: ৫০০/- টাকা | পুরাতন রোগী: ৩০০/- টাকা",
  consultationFeeNew: "৫০০",
  consultationFeeOld: "৩০০",
  bkashNumber: "01719-158085",
  nagadNumber: "01719-158085",
  autoWhatsAppEnabled: true,
  smsApiKey: "",
  smsSenderId: "Chishtia",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
  telegramEnabled: true,
  maxPerSlot: 5,
  slots: [
    "04:00 PM - 05:00 PM",
    "05:00 PM - 06:00 PM",
    "06:00 PM - 07:00 PM",
    "07:00 PM - 08:00 PM",
    "08:00 PM - 09:00 PM",
    "09:00 PM - 10:00 PM"
  ],
  adminPassword: process.env.ADMIN_PASSWORD || "admin123"
};

function readJsonFile(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

const db = {
  // Settings
  getSettings() {
    const settings = readJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
    if (!settings.telegramBotToken && process.env.TELEGRAM_BOT_TOKEN) {
      settings.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    }
    if (!settings.telegramChatId && process.env.TELEGRAM_CHAT_ID) {
      settings.telegramChatId = process.env.TELEGRAM_CHAT_ID;
    }
    return settings;
  },

  updateSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    writeJsonFile(SETTINGS_FILE, updated);
    return updated;
  },

  // Appointments
  getAppointments() {
    return readJsonFile(APPOINTMENTS_FILE, []);
  },

  saveAppointments(appointments) {
    return writeJsonFile(APPOINTMENTS_FILE, appointments);
  },

  addAppointment(appointmentData) {
    const appointments = this.getAppointments();
    const dateStr = appointmentData.appointmentDate;
    const countForDay = appointments.filter(a => a.appointmentDate === dateStr).length + 1;
    const cleanDate = dateStr.replace(/-/g, '');
    const serialCode = `HC-${cleanDate}-${String(countForDay).padStart(3, '0')}`;

    const newAppointment = {
      id: serialCode,
      serialNumber: countForDay,
      createdAt: new Date().toISOString(),
      status: "Pending", // Pending, Confirmed, Completed, Cancelled
      paymentStatus: appointmentData.paymentMethod === 'Cash' ? 'Unpaid' : 'Pending Verification',
      ...appointmentData
    };

    appointments.unshift(newAppointment);
    this.saveAppointments(appointments);
    return newAppointment;
  },

  getAppointmentById(id) {
    const appointments = this.getAppointments();
    return appointments.find(a => a.id === id);
  },

  updateAppointmentStatus(id, status, notes = "", paymentStatus = "") {
    const appointments = this.getAppointments();
    const item = appointments.find(a => a.id === id);
    if (!item) return null;
    item.status = status;
    if (notes) item.doctorNotes = notes;
    if (paymentStatus) item.paymentStatus = paymentStatus;
    item.updatedAt = new Date().toISOString();
    this.saveAppointments(appointments);
    return item;
  },

  deleteAppointment(id) {
    let appointments = this.getAppointments();
    const initialLen = appointments.length;
    appointments = appointments.filter(a => a.id !== id);
    if (appointments.length !== initialLen) {
      this.saveAppointments(appointments);
      return true;
    }
    return false;
  },

  getSlotAvailability(dateStr) {
    const settings = this.getSettings();
    const appointments = this.getAppointments();
    const maxPerSlot = settings.maxPerSlot || 5;

    const dayAppointments = appointments.filter(
      a => a.appointmentDate === dateStr && a.status !== "Cancelled"
    );

    const slotCounts = {};
    settings.slots.forEach(slot => {
      slotCounts[slot] = 0;
    });

    dayAppointments.forEach(a => {
      if (slotCounts[a.timeSlot] !== undefined) {
        slotCounts[a.timeSlot]++;
      }
    });

    return settings.slots.map(slot => ({
      slot,
      booked: slotCounts[slot] || 0,
      capacity: maxPerSlot,
      available: (slotCounts[slot] || 0) < maxPerSlot
    }));
  },

  // ================= Digital Prescriptions =================
  getPrescriptions() {
    return readJsonFile(PRESCRIPTIONS_FILE, []);
  },

  getPrescriptionById(id) {
    const list = this.getPrescriptions();
    return list.find(p => p.id === id);
  },

  getPrescriptionByAppointmentId(appointmentId) {
    const list = this.getPrescriptions();
    return list.find(p => p.appointmentId === appointmentId);
  },

  savePrescription(data) {
    const list = this.getPrescriptions();
    const id = data.id || `RX-${Date.now().toString(36).toUpperCase()}`;
    const existingIndex = list.findIndex(p => p.id === id);

    const prescriptionRecord = {
      id,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };

    if (existingIndex >= 0) {
      list[existingIndex] = prescriptionRecord;
    } else {
      list.unshift(prescriptionRecord);
    }

    writeJsonFile(PRESCRIPTIONS_FILE, list);

    // If followup date is set, automatically schedule a follow-up
    if (data.followupDays && parseInt(data.followupDays, 10) > 0) {
      const days = parseInt(data.followupDays, 10);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      this.scheduleFollowup({
        patientName: data.patientName,
        phone: data.phone,
        prescriptionId: id,
        appointmentId: data.appointmentId,
        daysDuration: days,
        dueDate: dueDateStr,
        symptoms: data.chiefComplaints || data.diagnosis || ''
      });
    }

    // Mark appointment as Completed if linked
    if (data.appointmentId) {
      this.updateAppointmentStatus(data.appointmentId, "Completed");
    }

    return prescriptionRecord;
  },

  deletePrescription(id) {
    let list = this.getPrescriptions();
    const initLen = list.length;
    list = list.filter(p => p.id !== id);
    if (list.length !== initLen) {
      writeJsonFile(PRESCRIPTIONS_FILE, list);
      return true;
    }
    return false;
  },

  // ================= Constitutional Case Sheets =================
  getAllCases() {
    return readJsonFile(CASES_FILE, []);
  },

  getCaseByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const cases = this.getAllCases();
    return cases.find(c => c.phone && c.phone.replace(/[^0-9]/g, '') === cleanPhone);
  },

  saveCase(caseData) {
    const cases = this.getAllCases();
    const cleanPhone = caseData.phone ? caseData.phone.replace(/[^0-9]/g, '') : '';
    const existingIndex = cases.findIndex(c => c.phone && c.phone.replace(/[^0-9]/g, '') === cleanPhone);

    const record = {
      phone: caseData.phone,
      patientName: caseData.patientName,
      age: caseData.age,
      gender: caseData.gender,
      miasm: caseData.miasm || [], // Psora, Sycosis, Syphilis, Tubercular
      thermal: caseData.thermal || 'গরমকাতর', // গরমকাতর / শীতকাতর / উভকাতর
      thirst: caseData.thirst || '',
      appetite: caseData.appetite || '',
      tongue: caseData.tongue || '',
      desires: caseData.desires || '', // মিষ্টি, নোনতা, টক, গরম খাদ্য
      aversions: caseData.aversions || '',
      mind: caseData.mind || '', // রাগ, উদ্বেগ, কান্নাশীল, স্মৃতিশক্তি
      sleep: caseData.sleep || '',
      dreams: caseData.dreams || '',
      sweat: caseData.sweat || '',
      bowel: caseData.bowel || '',
      urine: caseData.urine || '',
      pastIllness: caseData.pastIllness || '',
      familyHistory: caseData.familyHistory || '',
      generalNotes: caseData.generalNotes || '',
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      cases[existingIndex] = { ...cases[existingIndex], ...record };
    } else {
      record.createdAt = new Date().toISOString();
      cases.unshift(record);
    }

    writeJsonFile(CASES_FILE, cases);
    return record;
  },

  // ================= Medicine Inventory =================
  getInventory() {
    return readJsonFile(INVENTORY_FILE, []);
  },

  addMedicine(item) {
    const inventory = this.getInventory();
    const newId = `MED-${String(inventory.length + 1).padStart(3, '0')}`;
    const newMed = {
      id: newId,
      name: item.name.trim(),
      potency: item.potency || '30C',
      type: item.type || 'Dilution',
      stock: parseFloat(item.stock) || 0,
      unit: item.unit || 'ml',
      minAlert: parseFloat(item.minAlert) || 15,
      lastUpdated: new Date().toISOString()
    };
    inventory.push(newMed);
    writeJsonFile(INVENTORY_FILE, inventory);
    return newMed;
  },

  updateMedicine(id, updates) {
    const inventory = this.getInventory();
    const item = inventory.find(m => m.id === id);
    if (!item) return null;

    if (updates.name !== undefined) item.name = updates.name.trim();
    if (updates.potency !== undefined) item.potency = updates.potency;
    if (updates.type !== undefined) item.type = updates.type;
    if (updates.stock !== undefined) item.stock = parseFloat(updates.stock);
    if (updates.unit !== undefined) item.unit = updates.unit;
    if (updates.minAlert !== undefined) item.minAlert = parseFloat(updates.minAlert);
    item.lastUpdated = new Date().toISOString();

    writeJsonFile(INVENTORY_FILE, inventory);
    return item;
  },

  deleteMedicine(id) {
    let inventory = this.getInventory();
    const initLen = inventory.length;
    inventory = inventory.filter(m => m.id !== id);
    if (inventory.length !== initLen) {
      writeJsonFile(INVENTORY_FILE, inventory);
      return true;
    }
    return false;
  },

  getLowStockAlerts() {
    const inventory = this.getInventory();
    return inventory.filter(m => m.stock <= (m.minAlert || 15));
  },

  // ================= Follow-up Reminders =================
  getFollowups() {
    return readJsonFile(FOLLOWUPS_FILE, []);
  },

  scheduleFollowup(data) {
    const list = this.getFollowups();
    const newId = `FOL-${Date.now().toString(36).toUpperCase()}`;
    const newFollowup = {
      id: newId,
      patientName: data.patientName,
      phone: data.phone,
      prescriptionId: data.prescriptionId,
      appointmentId: data.appointmentId,
      daysDuration: data.daysDuration || 15,
      dueDate: data.dueDate, // YYYY-MM-DD
      symptoms: data.symptoms || '',
      reminderSent: false,
      createdAt: new Date().toISOString()
    };
    list.unshift(newFollowup);
    writeJsonFile(FOLLOWUPS_FILE, list);
    return newFollowup;
  },

  markFollowupSent(id) {
    const list = this.getFollowups();
    const item = list.find(f => f.id === id);
    if (!item) return null;
    item.reminderSent = true;
    item.reminderSentAt = new Date().toISOString();
    writeJsonFile(FOLLOWUPS_FILE, list);
    return item;
  },

  deleteFollowup(id) {
    let list = this.getFollowups();
    const initLen = list.length;
    list = list.filter(f => f.id !== id);
    if (list.length !== initLen) {
      writeJsonFile(FOLLOWUPS_FILE, list);
      return true;
    }
    return false;
  }
};

module.exports = db;
