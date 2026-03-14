const cron = require('node-cron');
const Chat = require('../models/Chat');
const { notify } = require('./notificationHelper');

// Runs every day at 9:00 AM
// Sends in-app + email reminder to donor & receiver if pickup is tomorrow
const startPickupReminderCron = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('[Pickup Reminder] Running daily check...');
    try {
      const now = new Date();
      const tomorrowStart = new Date(now);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      tomorrowStart.setHours(0, 0, 0, 0);

      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(23, 59, 59, 999);

      // Find chats with pickup scheduled for tomorrow, not yet reminded, not completed
      const chats = await Chat.find({
        'pickupDetails.date':         { $gte: tomorrowStart, $lte: tomorrowEnd },
        'pickupDetails.reminderSent': { $ne: true },
        status:                       { $ne: 'completed' }
      })
        .populate('donor',    'name email')
        .populate('receiver', 'name email')
        .populate('item',     'itemName');

      console.log(`[Pickup Reminder] Found ${chats.length} pickups for tomorrow`);

      for (const chat of chats) {
        const { donor, receiver, item, pickupDetails } = chat;
        if (!donor || !receiver || !item) continue;

        const formattedDate = new Date(pickupDetails.date).toLocaleDateString('en-IN', {
          year: 'numeric', month: 'long', day: 'numeric'
        });

        const reminderMsg = `Pickup for "${item.itemName}" is tomorrow at ${pickupDetails.time}, ${pickupDetails.location}.`;

        // Notify donor — in-app + email (respects their preferences)
        await notify({
          recipientId:   donor._id,
          type:          'pickup_reminder',
          title:         '⏰ Pickup Reminder',
          message:       reminderMsg,
          link:          '/dashboard',
          emailTemplate: 'pickup_reminder',
          emailData:     [donor.name, item.itemName, pickupDetails.location, formattedDate, pickupDetails.time, 'Donor (Giver)']
        });
        console.log(`[Pickup Reminder] Notified donor: ${donor.email}`);

        // Notify receiver — in-app + email (respects their preferences)
        await notify({
          recipientId:   receiver._id,
          type:          'pickup_reminder',
          title:         '⏰ Pickup Reminder',
          message:       reminderMsg,
          link:          '/dashboard',
          emailTemplate: 'pickup_reminder',
          emailData:     [receiver.name, item.itemName, pickupDetails.location, formattedDate, pickupDetails.time, 'Receiver (Recipient)']
        });
        console.log(`[Pickup Reminder] Notified receiver: ${receiver.email}`);

        // Mark as reminded so we don't send again
        chat.pickupDetails.reminderSent = true;
        await chat.save();
      }

      console.log(`[Pickup Reminder] Done. Processed ${chats.length} reminders.`);
    } catch (err) {
      console.error('[Pickup Reminder] Cron error:', err.message);
    }
  });

  console.log('[Pickup Reminder] Cron job scheduled (daily at 9 AM)');
};

module.exports = { startPickupReminderCron };