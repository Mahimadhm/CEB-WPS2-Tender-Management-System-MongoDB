const User = require('../models/User');
const Staff = require('../models/Staff');

/**
 * Returns notification recipients:
 * All active Admin and Super Admin users.
 */
async function getNotificationRecipients(record = null) {
  try {
    const adminUsers = await User.find({
      role: { $in: ['Admin', 'Super Admin'] },
      status: 'Active'
    })
      .select('email role name')
      .lean();

    const recipientsMap = new Map();

    adminUsers.forEach(user => {
      if (user.email && user.email.trim()) {
        const cleanEmail = user.email.trim().toLowerCase();

        if (!recipientsMap.has(cleanEmail)) {
          recipientsMap.set(cleanEmail, {
            email: cleanEmail,
            role: user.role || 'Admin',
            name: user.name || 'Administrator'
          });
        }
      }
    });

    return Array.from(recipientsMap.values());
  } catch (err) {
    console.error(
      '[NotificationRecipients] Error fetching admin recipients:',
      err.message
    );
    return [];
  }
}

/**
 * Returns TEC appointment recipients:
 * - Active Admins/Super Admins
 * - TEC members found in Staff
 * - TEC members found in active Users
 */
async function getTecAppointmentRecipients(record = {}) {
  const recipients = await getNotificationRecipients(record);

  const recipientsMap = new Map(
    recipients.map(recipient => [
      recipient.email.toLowerCase(),
      recipient
    ])
  );

  try {
    const memberNames = [
      record.tec_chairman || record.tecChairman,
      record.tec_member1 || record.tecMember1,
      record.tec_member2 || record.tecMember2
    ]
      .filter(Boolean)
      .map(name => String(name).trim())
      .filter(Boolean);

    if (memberNames.length === 0) {
      return Array.from(recipientsMap.values());
    }

    // Check Staff collection
    const staffList = await Staff.find({
      name: { $in: memberNames }
    })
      .select('name email designation')
      .lean();

    staffList.forEach(staff => {
      if (staff.email && staff.email.trim()) {
        const cleanEmail = staff.email.trim().toLowerCase();

        if (!recipientsMap.has(cleanEmail)) {
          recipientsMap.set(cleanEmail, {
            email: cleanEmail,
            role: 'TEC Member',
            name: staff.name
          });
        }
      }
    });

    // Check active Users collection
    const userList = await User.find({
      name: { $in: memberNames },
      status: 'Active'
    })
      .select('name email role')
      .lean();

    userList.forEach(user => {
      if (user.email && user.email.trim()) {
        const cleanEmail = user.email.trim().toLowerCase();

        if (!recipientsMap.has(cleanEmail)) {
          recipientsMap.set(cleanEmail, {
            email: cleanEmail,
            role: user.role || 'TEC Member',
            name: user.name
          });
        }
      }
    });
  } catch (err) {
    console.warn(
      '[NotificationRecipients] Could not resolve TEC member emails:',
      err.message
    );
  }

  return Array.from(recipientsMap.values());
}

module.exports = {
  getNotificationRecipients,
  getTecAppointmentRecipients
};
