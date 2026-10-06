const NotificationLog = require('../models/NotificationLog');

const {
  runDeadlineReminderCheck
} = require('../jobs/deadlineReminders');

const {
  runDelayReminderCheck
} = require('../jobs/delayReminders');

exports.getNotificationLogs = async (req, res, next) => {
  try {
    const data = await NotificationLog.find({})
      .populate({
        path: 'record_id',
        select: 'tender_number category description bid_closing_date'
      })
      .sort({ sent_at: -1 })
      .limit(500)
      .lean();

    const mapped = data.map(item => {
      const record = item.record_id;
      const recordId =
        record && record._id
          ? record._id.toString()
          : item.record_id
            ? item.record_id.toString()
            : null;

      return {
        id: item._id.toString(),
        recordId,
        notificationType: item.notification_type,
        recipientEmail: item.recipient_email,
        recipientRole: item.recipient_role,
        status: item.status,
        errorMessage: item.error_message,
        sentAt: item.sent_at,
        tenderNumber: record?.tender_number || 'N/A',
        category: record?.category || '-',
        bidClosingDate: record?.bid_closing_date || null
      };
    });

    res.json(mapped);
  } catch (err) {
    next(err);
  }
};

exports.runTestCheck = async (req, res, next) => {
  try {
    const deadlineSummary =
      await runDeadlineReminderCheck(process.env);

    const delaySummary =
      await runDelayReminderCheck(process.env);

    res.json({
      deadlineReminders: deadlineSummary,
      delayReminders: delaySummary
    });
  } catch (err) {
    next(err);
  }
};

exports.runDelayTestCheck = async (req, res, next) => {
  try {
    const summary =
      await runDelayReminderCheck(process.env);

    res.json(summary);
  } catch (err) {
    next(err);
  }
};
