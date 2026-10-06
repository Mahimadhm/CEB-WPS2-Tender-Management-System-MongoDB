const NotificationLog = require('../models/NotificationLog');

const {
  getNotificationRecipients,
  getTecAppointmentRecipients
} = require('./notificationRecipients');

const {
  sendAwardNotificationEmail,
  sendTecAppointmentNotificationEmail,
  sendCompletionAlertEmail
} = require('./emailService');

function getRecordId(record) {
  return record?._id || record?.id || null;
}

function getRuntimeConfig(env = {}) {
  return {
    resendApiKey:
      env.RESEND_API_KEY ||
      (typeof process !== 'undefined'
        ? process.env.RESEND_API_KEY
        : undefined),

    frontendUrl:
      env.FRONTEND_URL ||
      (typeof process !== 'undefined'
        ? process.env.FRONTEND_URL
        : undefined) ||
      'http://localhost:5174'
  };
}

async function alreadySent(recordId, notificationType) {
  if (!recordId) return false;

  const existingLog = await NotificationLog.findOne({
    record_id: recordId,
    notification_type: notificationType,
    status: 'sent'
  })
    .select('_id')
    .lean();

  return Boolean(existingLog);
}

async function saveNotificationLog({
  recordId,
  notificationType,
  recipient,
  status,
  errorMessage
}) {
  try {
    return await NotificationLog.create({
      record_id: recordId,
      notification_type: notificationType,
      recipient_email: recipient.email,
      recipient_role: recipient.role || '',
      status,
      error_message: errorMessage || null,
      sent_at: new Date()
    });
  } catch (err) {
    console.error(
      `[NotificationTriggers] Failed to save ${notificationType} log:`,
      err.message
    );
    return null;
  }
}

/**
 * Award notification
 */
async function triggerAwardNotification({
  env = {},
  record
}) {
  const recordId = getRecordId(record);

  if (!recordId) {
    console.warn(
      '[NotificationTriggers] Award notification skipped: record ID missing.'
    );
    return [];
  }

  const { resendApiKey, frontendUrl } = getRuntimeConfig(env);

  console.log(
    `[NotificationTriggers] Triggering award notification for record ${
      record.tender_number || recordId
    }`
  );

  if (await alreadySent(recordId, 'award')) {
    console.log(
      `[NotificationTriggers] Award notification already sent for record ${recordId}, skipping.`
    );
    return [];
  }

  const recipients = await getNotificationRecipients(record);
  const results = [];

  for (const recipient of recipients) {
    if (!recipient?.email?.trim()) continue;

    const sendResult = await sendAwardNotificationEmail({
      resendApiKey,
      frontendUrl,
      toEmail: recipient.email,
      record
    });

    const status = sendResult.success ? 'sent' : 'failed';
    const errorMessage = sendResult.error || null;

    await saveNotificationLog({
      recordId,
      notificationType: 'award',
      recipient,
      status,
      errorMessage
    });

    results.push({
      recipientEmail: recipient.email,
      status,
      resendId: sendResult.resendId,
      error: errorMessage
    });
  }

  return results;
}

/**
 * TEC appointment notification
 */
async function triggerTecAppointmentNotification({
  env = {},
  record
}) {
  const recordId = getRecordId(record);

  if (!recordId) {
    console.warn(
      '[NotificationTriggers] TEC notification skipped: record ID missing.'
    );
    return [];
  }

  const { resendApiKey, frontendUrl } = getRuntimeConfig(env);

  console.log(
    `[NotificationTriggers] Triggering TEC appointment notification for record ${
      record.tender_number || recordId
    }`
  );

  if (await alreadySent(recordId, 'tec_appointment')) {
    console.log(
      `[NotificationTriggers] TEC appointment notification already sent for record ${recordId}, skipping.`
    );
    return [];
  }

  const recipients = await getTecAppointmentRecipients(record);
  const results = [];

  for (const recipient of recipients) {
    if (!recipient?.email?.trim()) continue;

    const sendResult = await sendTecAppointmentNotificationEmail({
      resendApiKey,
      frontendUrl,
      toEmail: recipient.email,
      record
    });

    const status = sendResult.success ? 'sent' : 'failed';
    const errorMessage = sendResult.error || null;

    await saveNotificationLog({
      recordId,
      notificationType: 'tec_appointment',
      recipient,
      status,
      errorMessage
    });

    results.push({
      recipientEmail: recipient.email,
      status,
      resendId: sendResult.resendId,
      error: errorMessage
    });
  }

  return results;
}

/**
 * Tender completion notification
 */
async function triggerCompletionNotification({
  env = {},
  record
}) {
  const recordId = getRecordId(record);

  if (!recordId) {
    console.warn(
      '[NotificationTriggers] Completion notification skipped: record ID missing.'
    );
    return [];
  }

  const { resendApiKey, frontendUrl } = getRuntimeConfig(env);

  console.log(
    `[NotificationTriggers] Triggering completion notification for record ${
      record.tender_number || recordId
    }`
  );

  if (await alreadySent(recordId, 'completion')) {
    console.log(
      `[NotificationTriggers] Completion notification already sent for record ${recordId}, skipping.`
    );
    return [];
  }

  const recipients = await getNotificationRecipients(record);
  const results = [];

  for (const recipient of recipients) {
    if (!recipient?.email?.trim()) continue;

    const sendResult = await sendCompletionAlertEmail({
      resendApiKey,
      frontendUrl,
      toEmail: recipient.email,
      record
    });

    const status = sendResult.success ? 'sent' : 'failed';
    const errorMessage = sendResult.error || null;

    await saveNotificationLog({
      recordId,
      notificationType: 'completion',
      recipient,
      status,
      errorMessage
    });

    results.push({
      recipientEmail: recipient.email,
      status,
      resendId: sendResult.resendId,
      error: errorMessage
    });
  }

  return results;
}

/**
 * Check record changes and trigger matching notifications.
 *
 * Legacy callers may pass extra properties; they are ignored during migration.
 */
async function handleRecordTransitions({
  env = {},
  previousRecord,
  updatedRecord
}) {
  if (!updatedRecord) return;

  const prevStatus = (previousRecord?.status || '').trim();
  const newStatus = (updatedRecord.status || '').trim();

  const prevCommittee = (
    previousRecord?.tec_committee_number || ''
  ).trim();

  const newCommittee = (
    updatedRecord.tec_committee_number || ''
  ).trim();

  if (
    newStatus.toLowerCase() === 'awarded' &&
    prevStatus.toLowerCase() !== 'awarded'
  ) {
    await triggerAwardNotification({
      env,
      record: updatedRecord
    }).catch(err => {
      console.error(
        '[NotificationTriggers] Error in triggerAwardNotification:',
        err
      );
    });
  }

  if (
    newCommittee &&
    (!prevCommittee || prevCommittee !== newCommittee)
  ) {
    await triggerTecAppointmentNotification({
      env,
      record: updatedRecord
    }).catch(err => {
      console.error(
        '[NotificationTriggers] Error in triggerTecAppointmentNotification:',
        err
      );
    });
  }

  const isCloseStatus = status =>
    ['close', 'closed', 'completed'].includes(
      (status || '').toLowerCase()
    );

  if (
    isCloseStatus(newStatus) &&
    !isCloseStatus(prevStatus)
  ) {
    await triggerCompletionNotification({
      env,
      record: updatedRecord
    }).catch(err => {
      console.error(
        '[NotificationTriggers] Error in triggerCompletionNotification:',
        err
      );
    });
  }
}

module.exports = {
  triggerAwardNotification,
  triggerTecAppointmentNotification,
  triggerCompletionNotification,
  handleRecordTransitions
};
