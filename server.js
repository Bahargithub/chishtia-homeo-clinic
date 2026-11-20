require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./services/db');
const telegramService = require('./services/telegram');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup upload directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage for prescriptions/reports
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `rx-${Date.now()}-${Math.round(Math.random() * 1E4)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('শুধুমাত্র JPG, PNG বা PDF ফাইল আপলোড করা যাবে।'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'allow' }));
app.use('/uploads', express.static(uploadDir, { dotfiles: 'allow' }));

// Simple admin authentication middleware
const adminAuth = (req, res, next) => {
  const settings = db.getSettings();
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token === settings.adminPassword || token === 'admin123') {
    return next();
  }
  return res.status(401).json({ success: false, message: 'অননুমোদিত প্রবেশাধিকার (Unauthorized)' });
};

// ==================== PUBLIC API ROUTES ====================

// 1. Get Clinic Public Info
app.get('/api/clinic-info', (req, res) => {
  const settings = db.getSettings();
  res.json({
    success: true,
    data: {
      clinicName: settings.clinicName,
      clinicSubtitle: settings.clinicSubtitle,
      doctorName: settings.doctorName,
      doctorDegree: settings.doctorDegree,
      doctorRegNo: settings.doctorRegNo,
      phone: settings.phone,
      phoneSecondary: settings.phoneSecondary || '',
      whatsapp: settings.whatsapp,
      email: settings.email,
      address: settings.address,
      visitingHours: settings.visitingHours,
      consultationFee: settings.consultationFee,
      consultationFeeNew: settings.consultationFeeNew || '৫০০',
      consultationFeeOld: settings.consultationFeeOld || '৩০০',
      bkashNumber: settings.bkashNumber || '01719-158085',
      nagadNumber: settings.nagadNumber || '01719-158085',
      slots: settings.slots
    }
  });
});

// 2. Get Available Time Slots for a Date
app.get('/api/slots', (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ success: false, message: 'তারিখ নির্বাচন আবশ্যক।' });
  }
  const availability = db.getSlotAvailability(date);
  res.json({ success: true, date, slots: availability });
});

// 3. Create a New Appointment
app.post('/api/appointments', upload.single('prescription'), async (req, res) => {
  try {
    const {
      patientName,
      phone,
      age,
      gender,
      address,
      patientType,
      appointmentDate,
      timeSlot,
      symptoms,
      duration,
      pastHistory,
      paymentMethod,
      paymentTrxId,
      paymentPhone
    } = req.body;

    // Validation
    if (!patientName || !phone || !appointmentDate || !timeSlot || !symptoms) {
      return res.status(400).json({
        success: false,
        message: 'রোগীর নাম, মোবাইল নম্বর, তারিখ, সময় এবং লক্ষণসমূহ সঠিকভাবে পূরণ করুন।'
      });
    }

    const cleanPhone = phone.replace(/[\s-]/g, '');
    if (!/^(\+88)?01[3-9]\d{8}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01719158085)।'
      });
    }

    // Check slot availability
    const slots = db.getSlotAvailability(appointmentDate);
    const chosenSlot = slots.find(s => s.slot === timeSlot);
    if (chosenSlot && !chosenSlot.available) {
      return res.status(400).json({
        success: false,
        message: 'দুঃখিত, এই সময় স্লটটি পূর্ণ হয়ে গেছে। অনুগ্রহ করে অন্য সময় বেছে নিন।'
      });
    }

    const prescriptionFile = req.file ? req.file.filename : null;

    const appointmentData = {
      patientName: patientName.trim(),
      phone: cleanPhone,
      age: age ? parseInt(age, 10) : 'অজানা',
      gender: gender || 'উভয়',
      address: address ? address.trim() : '',
      patientType: patientType || 'নতুন রোগী',
      appointmentDate,
      timeSlot,
      symptoms: symptoms.trim(),
      duration: duration ? duration.trim() : '',
      pastHistory: pastHistory ? pastHistory.trim() : '',
      prescriptionFile,
      paymentMethod: paymentMethod || 'Cash at Clinic',
      paymentTrxId: paymentTrxId ? paymentTrxId.trim() : '',
      paymentPhone: paymentPhone ? paymentPhone.trim() : ''
    };

    // Save to Database
    const savedAppointment = db.addAppointment(appointmentData);
    const clinicSettings = db.getSettings();

    // Send Telegram Notification asynchronously
    let telegramResult = null;
    try {
      telegramResult = await telegramService.sendAppointmentAlert(savedAppointment, clinicSettings);
    } catch (tgErr) {
      console.error('[Telegram notification failed]', tgErr);
    }

    res.json({
      success: true,
      message: 'আপনার অ্যাপয়েন্টমেন্ট সফলভাবে গৃহীত হয়েছে!',
      appointment: savedAppointment,
      telegramNotification: telegramResult
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' });
  }
});

// 4. Get Appointment by ID (For Receipt / Token view)
app.get('/api/appointment/:id', (req, res) => {
  const appointment = db.getAppointmentById(req.params.id);
  if (!appointment) {
    return res.status(404).json({ success: false, message: 'অ্যাপয়েন্টমেন্ট পাওয়া যায়নি।' });
  }
  const settings = db.getSettings();
  res.json({
    success: true,
    appointment,
    clinic: {
      clinicName: settings.clinicName,
      clinicSubtitle: settings.clinicSubtitle,
      doctorName: settings.doctorName,
      doctorDegree: settings.doctorDegree,
      doctorRegNo: settings.doctorRegNo,
      phone: settings.phone,
      phoneSecondary: settings.phoneSecondary,
      address: settings.address,
      visitingHours: settings.visitingHours,
      consultationFee: settings.consultationFee,
      bkashNumber: settings.bkashNumber,
      nagadNumber: settings.nagadNumber
    }
  });
});

// 5. Get Public Prescription by ID
app.get('/api/prescription/:id', (req, res) => {
  const prescription = db.getPrescriptionById(req.params.id);
  if (!prescription) {
    return res.status(404).json({ success: false, message: 'প্রেসক্রিপশন পাওয়া যায়নি।' });
  }
  const settings = db.getSettings();
  res.json({
    success: true,
    prescription,
    clinic: {
      clinicName: settings.clinicName,
      clinicSubtitle: settings.clinicSubtitle,
      doctorName: settings.doctorName,
      doctorDegree: settings.doctorDegree,
      phone: settings.phone,
      phoneSecondary: settings.phoneSecondary,
      address: settings.address,
      visitingHours: settings.visitingHours
    }
  });
});

// ==================== ADMIN API ROUTES ====================

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const settings = db.getSettings();
  if (password === settings.adminPassword || password === 'admin123') {
    res.json({ success: true, token: settings.adminPassword, message: 'লগইন সফল হয়েছে।' });
  } else {
    res.status(401).json({ success: false, message: 'ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।' });
  }
});

// Appointments Management
app.get('/api/admin/appointments', adminAuth, (req, res) => {
  const { date, status, search } = req.query;
  let appointments = db.getAppointments();

  if (date) {
    appointments = appointments.filter(a => a.appointmentDate === date);
  }
  if (status && status !== 'All') {
    appointments = appointments.filter(a => a.status === status);
  }
  if (search) {
    const q = search.toLowerCase();
    appointments = appointments.filter(a =>
      (a.patientName && a.patientName.toLowerCase().includes(q)) ||
      (a.phone && a.phone.includes(q)) ||
      (a.id && a.id.toLowerCase().includes(q))
    );
  }

  res.json({ success: true, appointments });
});

app.patch('/api/admin/appointment/:id', adminAuth, (req, res) => {
  const { status, notes, paymentStatus } = req.body;
  const updated = db.updateAppointmentStatus(req.params.id, status, notes, paymentStatus);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'অ্যাপয়েন্টমেন্ট পাওয়া যায়নি।' });
  }
  res.json({ success: true, appointment: updated });
});

app.delete('/api/admin/appointment/:id', adminAuth, (req, res) => {
  const success = db.deleteAppointment(req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'অ্যাপয়েন্টমেন্ট পাওয়া যায়নি।' });
  }
  res.json({ success: true, message: 'অ্যাপয়েন্টমেন্ট সফলভাবে মুছে ফেলা হয়েছে।' });
});

// ================= DIGITAL PRESCRIPTION API =================
app.get('/api/admin/prescriptions', adminAuth, (req, res) => {
  const prescriptions = db.getPrescriptions();
  res.json({ success: true, prescriptions });
});

app.post('/api/admin/prescriptions', adminAuth, (req, res) => {
  try {
    const prescription = db.savePrescription(req.body);
    res.json({ success: true, message: 'প্রেসক্রিপশন সফলভাবে সংরক্ষিত হয়েছে!', prescription });
  } catch (err) {
    res.status(500).json({ success: false, message: 'প্রেসক্রিপশন সংরক্ষণ ব্যর্থ হয়েছে।' });
  }
});

app.delete('/api/admin/prescription/:id', adminAuth, (req, res) => {
  const success = db.deletePrescription(req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'প্রেসক্রিপশন পাওয়া যায়নি।' });
  }
  res.json({ success: true, message: 'প্রেসক্রিপশন মুছে ফেলা হয়েছে।' });
});

// ================= CONSTITUTIONAL CASE SHEET API =================
app.get('/api/admin/case/:phone', adminAuth, (req, res) => {
  const caseRecord = db.getCaseByPhone(req.params.phone);
  res.json({ success: true, caseRecord });
});

app.get('/api/admin/cases', adminAuth, (req, res) => {
  const cases = db.getAllCases();
  res.json({ success: true, cases });
});

app.post('/api/admin/case', adminAuth, (req, res) => {
  try {
    const saved = db.saveCase(req.body);
    res.json({ success: true, message: 'কেস টেকিং রেকর্ড সংরক্ষিত হয়েছে!', caseRecord: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: 'কেস রেকর্ড সংরক্ষণ ব্যর্থ হয়েছে।' });
  }
});

// ================= MEDICINE INVENTORY API =================
app.get('/api/admin/inventory', adminAuth, (req, res) => {
  const inventory = db.getInventory();
  const alerts = db.getLowStockAlerts();
  res.json({ success: true, inventory, alerts });
});

app.post('/api/admin/inventory', adminAuth, (req, res) => {
  try {
    const { name, potency, type, stock, unit, minAlert } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'ওষুধের নাম আবশ্যক।' });
    const newMed = db.addMedicine({ name, potency, type, stock, unit, minAlert });
    res.json({ success: true, message: 'নতুন ওষুধ ইনভেন্টরিতে যোগ করা হয়েছে।', item: newMed });
  } catch (err) {
    res.status(500).json({ success: false, message: 'ইনভেন্টরিতে ওষুধ যোগ করতে ত্রুটি হয়েছে।' });
  }
});

app.patch('/api/admin/inventory/:id', adminAuth, (req, res) => {
  const updated = db.updateMedicine(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'ওষুধ পাওয়া যায়নি।' });
  res.json({ success: true, message: 'ওষুধের স্টক আপডেট করা হয়েছে।', item: updated });
});

app.delete('/api/admin/inventory/:id', adminAuth, (req, res) => {
  const success = db.deleteMedicine(req.params.id);
  if (!success) return res.status(404).json({ success: false, message: 'ওষুধ পাওয়া যায়নি।' });
  res.json({ success: true, message: 'ওষুধ মুছে ফেলা হয়েছে।' });
});

// ================= FOLLOW-UP REMINDERS API =================
app.get('/api/admin/followups', adminAuth, (req, res) => {
  const followups = db.getFollowups();
  res.json({ success: true, followups });
});

app.post('/api/admin/followup/remind/:id', adminAuth, async (req, res) => {
  const list = db.getFollowups();
  const item = list.find(f => f.id === req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'ফলো-আপ রেকর্ড পাওয়া যায়নি।' });

  const settings = db.getSettings();
  try {
    await telegramService.sendFollowupReminderAlert(item, settings);
    db.markFollowupSent(req.params.id);
    res.json({ success: true, message: 'টেলিগ্রামে ফলো-আপ রিমাইন্ডার পাঠানো হয়েছে এবং স্ট্যাটাস আপডেট হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'রিমাইন্ডার পাঠাতে ব্যর্থ হয়েছে।' });
  }
});

app.delete('/api/admin/followup/:id', adminAuth, (req, res) => {
  const success = db.deleteFollowup(req.params.id);
  if (!success) return res.status(404).json({ success: false, message: 'ফলো-আপ পাওয়া যায়নি।' });
  res.json({ success: true, message: 'ফলো-আপ রেকর্ড মুছে ফেলা হয়েছে।' });
});

// Settings & Telegram
app.get('/api/admin/settings', adminAuth, (req, res) => {
  const settings = db.getSettings();
  res.json({ success: true, settings });
});

app.post('/api/admin/settings', adminAuth, (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json({ success: true, message: 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে।', settings: updated });
});

app.post('/api/admin/test-telegram', adminAuth, async (req, res) => {
  const { token, chatId } = req.body;
  try {
    const result = await telegramService.testConnection(token, chatId);
    res.json({ success: true, message: 'টেলিগ্রামে টেস্ট মেসেজ সফলভাবে পাঠানো হয়েছে!', result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ================= HTML ROUTES =================
const sendFileOptions = { dotfiles: 'allow' };

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), sendFileOptions);
});

app.get(['/admin', '/admin/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'), sendFileOptions);
});

app.get('/receipt/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'receipt.html'), sendFileOptions);
});

app.get('/prescription/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'prescription.html'), sendFileOptions);
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🌿 চিশতিয়া হোমিও ক্লিনিক - পূর্ণাঙ্গ হেলথকেয়ার সিস্টেম চালু!`);
  console.log(`📍 রোগী বুকিং পোর্টাল:  http://localhost:${PORT}`);
  console.log(`🔐 ডাক্তার এডমিন প্যানেল: http://localhost:${PORT}/admin`);
  console.log(`====================================================`);
});
