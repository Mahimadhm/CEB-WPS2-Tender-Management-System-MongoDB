const Record = require('../models/Record');
const NotificationLog = require('../models/NotificationLog');

const {
  getNotificationRecipients
} = require('../utils/notificationRecipients');

const {
  sendDeadlineReminderEmail
} = require('../utils/emailService');

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function dateKey(date) {
  const d = new Date(date);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Runs the daily tender deadline reminder check.
 */
async function runDeadlineReminderCheck(env = {}) {
  const resendApiKey =
    env.RESEND_API_KEY ||
    (typeof process !== 'undefined'
      ? process.env.RESEND_API_KEY
      : undefined);

  const frontendUrl =
    env.FRONTEND_URL ||
    (typeof process !== 'undefined'
      ? process.env.FRONTEND_URL
      : undefined) ||
    'http://localhost:5174';

  const today = new Date();

  const intervals = [
    { days: 15, type: 'deadline_15' },
    { days: 10, type: 'deadline_10' },
    { days: 5, type: 'deadline_5' },
    { days: 1, type: 'deadline_1' }
  ];

  const targetDatesMap = new Map();

  for (const item of intervals) {
    const targetDate = new Date(today);

    targetDate.setDate(
      targetDate.getDate() + item.days
    );

    targetDatesMap.set(
      dateKey(targetDate),
      item
    );
  }

  const targetDateStrings =
    Array.from(targetDatesMap.keys());

  console.log(
    `[DeadlineReminderJob] Target dates checked: ${targetDateStrings.join(', ')}`
  );

  let recordsChecked = 0;
  let emailsSent = 0;
  let emailsFailed = 0;
  let skippedAlreadySent = 0;

  const details = [];

  try {
    /*
     * Query one overall range covering all target dates,
     * then match exact reminder dates below.
     */
    const targetDateObjects = targetDateStrings.map(
      value => new Date(`${value}T00:00:00`)
    );

    const earliest = new Date(
      Math.min(...targetDateObjects.map(d => d.getTime()))
    );

    const latest = new Date(
      Math.max(...targetDateObjects.map(d => d.getTime()))
    );

    const matchingRecords = await Record.find({
      bid_closing_date: {
        $gte: startOfDay(earliest),
        $lte: endOfDay(latest)
      }
    }).lean();

    /*
     * The range also contains days such as +2, +3 etc.
     * Keep only the exact configured reminder days.
     */
    const exactRecords = matchingRecords.filter(record =>
      record.bid_closing_date &&
      targetDatesMap.has(dateKey(record.bid_closing_date))
    );

    recordsChecked = exactRecords.length;

    for (const record of exactRecords) {
      const closingDateStr =
        dateKey(record.bid_closing_date);

      const intervalInfo =
        targetDatesMap.get(closingDateStr);

      if (!intervalInfo) continue;

      const {
        days: daysRemaining,
        type: notificationType
      } = intervalInfo;

      const recordId = record._id;

      /*
       * Prevent duplicate successful notifications.
       */
      const existingLog =
        await NotificationLog.findOne({
          record_id: recordId,
          notification_type: notificationType,
          status: 'sent'
        })
          .select('_id')
          .lean();

      if (existingLog) {
        console.log(
          `[DeadlineReminderJob] Skipping record ${
            record.tender_number || recordId
          } (${notificationType}) - already sent.`
        );

        skippedAlreadySent++;

        details.push({
          recordId: recordId.toString(),
          tenderNumber: record.tender_number,
          notificationType,
          status: 'skipped',
          reason: 'already_sent'
        });

        continue;
      }

      const recipients =
        await getNotificationRecipients(record);

      if (recipients.length === 0) {
        console.warn(
          `[DeadlineReminderJob] No recipients found for record ${
            record.tender_number || recordId
          }`
        );

        continue;
      }

      for (const recipient of recipients) {
        if (!recipient?.email?.trim()) {
          continue;
        }

        const sendResult =
          await sendDeadlineReminderEmail({
            resendApiKey,
            frontendUrl,
            toEmail: recipient.email,
            record,
            daysRemaining
          });

        const status =
          sendResult.success
            ? 'sent'
            : 'failed';

        const errorMessage =
          sendResult.error || null;

        if (sendResult.success) {
          emailsSent++;
        } else {
          emailsFailed++;
        }

        try {
          await NotificationLog.create({
            record_id: recordId,
            notification_type: notificationType,
            recipient_email: recipient.email,
            recipient_role: recipient.role || '',
            status,
            error_message: errorMessage,
            sent_at: new Date()
          });
        } catch (logError) {
          console.error(
            `[DeadlineReminderJob] Failed to save notification log for ${recipient.email}:`,
            logError.message
          );
        }

        details.push({
          recordId: recordId.toString(),
          tenderNumber: record.tender_number,
          notificationType,
          recipientEmail: recipient.email,
          status,
          resendId: sendResult.resendId,
          error: errorMessage
        });
      }
    }
  } catch (err) {
    console.error(
      '[DeadlineReminderJob] Critical error running deadline reminder check:',
      err
    );
  }

  const summary = {
    timestamp: new Date().toISOString(),
    recordsChecked,
    skippedAlreadySent,
    emailsSent,
    emailsFailed,
    details
  };

  console.log(
    '[DeadlineReminderJob] Completed check summary:',
    summary
  );

  return summary;
}

module.exports = {
  runDeadlineReminderCheck
};
