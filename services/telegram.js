const fs = require('fs');
const path = require('path');

/**
 * Service to handle Telegram Bot Notifications
 */
class TelegramService {
  constructor() {}

  /**
   * Escape HTML special characters for Telegram HTML parse mode
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Format Bengali Date
   */
  formatDate(dateString) {
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
      const date = new Date(dateString);
      return date.toLocaleDateString('bn-BD', options);
    } catch {
      return dateString;
    }
  }

  /**
   * Format Appointment message for Telegram
   */
  formatAppointmentMessage(appointment, clinicSettings) {
    const esc = this.escapeHtml;
    const formattedDate = this.formatDate(appointment.appointmentDate);
    const clinicName = clinicSettings.clinicName || 'চিশতিয়া হোমিও ক্লিনিক';

    return `
🌿 <b>নতুন রোগীর অ্যাপয়েন্টমেন্ট শিডিউল!</b> 🌿
🏥 <b>${esc(clinicName)}</b>
━━━━━━━━━━━━━━━━━━━━━━━━
🔢 <b>সিরিয়াল নং:</b> <code>${esc(appointment.id)}</code> (আজকের সিরিয়াল: ${appointment.serialNumber})
👤 <b>রোগীর নাম:</b> <b>${esc(appointment.patientName)}</b>
📞 <b>মোবাইল নম্বর:</b> <code>${esc(appointment.phone)}</code>
🎂 <b>বয়স ও লিঙ্গ:</b> ${esc(appointment.age)} বছর | ${esc(appointment.gender)}
📍 <b>ঠিকানা/এলাকা:</b> ${esc(appointment.address || 'উল্লেখ নেই')}
🏷️ <b>রোগীর ধরন:</b> <b>${esc(appointment.patientType || 'নতুন রোগী')}</b>

📅 <b>তারিখ:</b> ${esc(formattedDate)} (${esc(appointment.appointmentDate)})
⏰ <b>সময় স্লট:</b> <b>${esc(appointment.timeSlot)}</b>

🩺 <b>প্রধান শারীরিক সমস্যা ও লক্ষণ:</b>
<i>"${esc(appointment.symptoms)}"</i>
${appointment.duration ? `⏱️ <b>সমস্যার স্থায়িত্ব:</b> ${esc(appointment.duration)}` : ''}
${appointment.pastHistory ? `📋 <b>পূর্বের ওষুধ/চিকিৎসার বিবরণ:</b> ${esc(appointment.pastHistory)}` : ''}
${appointment.paymentMethod ? `
💳 <b>ফি পেমেন্ট:</b> ${esc(appointment.paymentMethod)} (${esc(appointment.paymentStatus || 'যাচাই অপেক্ষমান')})
${appointment.paymentTrxId ? `💸 <b>TrxID:</b> <code>${esc(appointment.paymentTrxId)}</code>` : ''}
${appointment.paymentPhone ? `📲 <b>প্রেরক বিকাশ/নগদ:</b> <code>${esc(appointment.paymentPhone)}</code>` : ''}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━
🕒 <b>বুকিং সময়:</b> ${new Date().toLocaleString('bn-BD')}
📱 <b>সরাসরি কল করুন:</b> <a href="tel:${esc(appointment.phone)}">${esc(appointment.phone)}</a>
💬 <b>হোয়াটসঅ্যাপে মেসেজ:</b> <a href="https://wa.me/88${esc(appointment.phone.replace(/[^0-9]/g, ''))}">WhatsApp চ্যাট</a>
`.trim();
  }

  /**
   * Send notification for a new appointment
   */
  async sendAppointmentAlert(appointment, clinicSettings) {
    const token = clinicSettings.telegramBotToken;
    const chatId = clinicSettings.telegramChatId;

    if (!token || !chatId) {
      console.warn('[Telegram] Bot token or chat ID is not configured. Notification skipped.');
      return { success: false, reason: 'Telegram bot token or Chat ID not configured.' };
    }

    if (clinicSettings.telegramEnabled === false) {
      console.info('[Telegram] Telegram alerts are disabled in settings.');
      return { success: false, reason: 'Telegram alerts are disabled.' };
    }

    const messageText = this.formatAppointmentMessage(appointment, clinicSettings);

    try {
      if (appointment.prescriptionFile) {
        const filePath = path.join(__dirname, '..', 'uploads', appointment.prescriptionFile);
        if (fs.existsSync(filePath)) {
          return await this.sendPhoto(token, chatId, filePath, messageText);
        }
      }

      return await this.sendMessage(token, chatId, messageText);
    } catch (error) {
      console.error('[Telegram] Failed to send appointment alert:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send follow-up reminder alert
   */
  async sendFollowupReminderAlert(followup, clinicSettings) {
    const token = clinicSettings.telegramBotToken;
    const chatId = clinicSettings.telegramChatId;
    if (!token || !chatId || !clinicSettings.telegramEnabled) return null;

    const esc = this.escapeHtml;
    const text = `
⏰ <b>হোমিওপ্যাথিক ফলো-আপ রিমাইন্ডার অ্যালার্ট!</b>
🏥 <b>${esc(clinicSettings.clinicName)}</b>
━━━━━━━━━━━━━━━━━━━━━━━━
👤 <b>রোগীর নাম:</b> <b>${esc(followup.patientName)}</b>
📞 <b>মোবাইল নম্বর:</b> <code>${esc(followup.phone)}</code>
💊 <b>ওষুধের মেয়াদ:</b> ${esc(followup.daysDuration)} দিন
📅 <b>ফলো-আপ নির্ধারিত তারিখ:</b> ${esc(followup.dueDate)}

💡 এই রোগীর ওষুধ শেষ হতে চলেছে। রোগীকে ফলো-আপের জন্য কল বা WhatsApp মেসেজ পাঠান:
💬 <a href="https://wa.me/88${esc(followup.phone.replace(/[^0-9]/g, ''))}?text=${encodeURIComponent(`আসসালামু আলাইকুম ${followup.patientName}, চিশতিয়া হোমিও ক্লিনিক থেকে ডাঃ মোঃ আলাউদ্দিন। আপনার ${followup.daysDuration} দিনের ওষুধ শেষ হতে চলেছে। শারীরিক অবস্থা পর্যালোচনা ও পরবর্তী সিরিয়ালের জন্য যোগাযোগ করুন।`)}">WhatsApp এ মেসেজ পাঠান</a>
`.trim();

    return await this.sendMessage(token, chatId, text);
  }

  /**
   * Send text message via Telegram Bot API
   */
  async sendMessage(token, chatId, text) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!data.ok) {
      console.error('[Telegram API Error]', data);
      throw new Error(data.description || 'Failed to send Telegram message');
    }

    return { success: true, messageId: data.result.message_id };
  }

  /**
   * Send photo with caption via Telegram Bot API
   */
  async sendPhoto(token, chatId, filePath, caption) {
    const url = `https://api.telegram.org/bot${token}/sendPhoto`;
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
    
    const blob = new Blob([fileBuffer]);
    formData.append('photo', blob, fileName);

    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (!data.ok) {
      console.error('[Telegram sendPhoto Error]', data);
      return await this.sendMessage(token, chatId, caption);
    }

    return { success: true, messageId: data.result.message_id };
  }

  /**
   * Send Test Notification
   */
  async testConnection(token, chatId) {
    if (!token || !chatId) {
      throw new Error('টোকেন এবং চ্যাট আইডি উভয়ই প্রদান করুন।');
    }

    const testMessage = `
🌿 <b>চিশতিয়া হোমিও ক্লিনিক - টেলিগ্রাম টেস্ট সফল!</b> 🌿
━━━━━━━━━━━━━━━━━━━━━━━━
অভিনন্দন! আপনার হোমিওপ্যাথিক ক্লিনিক সিস্টেমের সাথে টেলিগ্রাম সফলভাবে সংযুক্ত হয়েছে।

✅ এখন থেকে কোনো রোগী অ্যাপয়েন্টমেন্ট বুকিং করলে তার সিরিয়াল, লক্ষণ ও পেমেন্ট তথ্য সরাসরি এখানে চলে আসবে।
⏱️ সময়: ${new Date().toLocaleString('bn-BD')}
`.trim();

    return await this.sendMessage(token, chatId, testMessage);
  }
}

module.exports = new TelegramService();
