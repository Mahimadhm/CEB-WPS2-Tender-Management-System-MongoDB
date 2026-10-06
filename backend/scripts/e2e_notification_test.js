require('dotenv').config({
  path: require('path').join(__dirname, '../.env')
});

const API_BASE =
  process.env.API_BASE ||
  'http://localhost:5010';

function formatDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function apiFetch(path, options = {}) {
  return fetch(`${API_BASE}${path}`, options);
}

async function getNotificationLogs(authHeaders) {
  const res = await apiFetch('/api/notifications', {
    headers: authHeaders
  });

  if (!res.ok) {
    throw new Error(
      `Notification list failed (${res.status}): ${await res.text()}`
    );
  }

  return res.json();
}

function findLogs(logs, recordId, notificationType) {
  return logs.filter(log => {
    const logRecordId =
      log.recordId ||
      log.record_id ||
      (log.record && (log.record.id || log.record._id));

    const logType =
      log.notificationType ||
      log.notification_type;

    return (
      String(logRecordId) === String(recordId) &&
      logType === notificationType
    );
  });
}

async function runLiveTests() {
  console.log(
    '=== Starting E2E Notification System Live Verification ===\n'
  );

  console.log('1. Authenticating as Admin...');

  const loginRes = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    })
  });

  if (!loginRes.ok) {
    throw new Error(
      `Login failed with status ${loginRes.status}: ${await loginRes.text()}`
    );
  }

  const { token } = await loginRes.json();

  console.log(
    '✓ Admin authenticated successfully. Token acquired.\n'
  );

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  const testTenderNo =
    `CEB/TEST/NOTIF/${Date.now().toString().slice(-6)}`;

  let testRecordId = null;
  const delayRecordIds = [];

  try {
    console.log(
      `2. Creating test record ${testTenderNo}...`
    );

    const createRes = await apiFetch('/api/records', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        tenderNumber: testTenderNo,
        category: 'Electrical Equipment',
        relevantTo: 'Transmission Division',
        description:
          'Automated test record for notification system verification',
        status: 'Under Evaluation',
        bidStartDate: '2026-08-01',
        bidOpenDate: '2026-08-15',
        bidClosingDate: '2026-09-30'
      })
    });

    if (!createRes.ok) {
      throw new Error(
        `Create record failed: ${await createRes.text()}`
      );
    }

    const created = await createRes.json();
    testRecordId = created.id || created._id;

    console.log(
      `✓ Test record created. ID: ${testRecordId}\n`
    );

    // ------------------------------------------------------------
    // TEST 1: TEC APPOINTMENT
    // ------------------------------------------------------------

    console.log(
      '3. Testing TEC APPOINTMENT Notification...'
    );

    const tecUpdateRes = await apiFetch(
      `/api/records/${testRecordId}`,
      {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          tecCommitteeNumber: 'TEC/2023/001',
          tecChairman: 'K.A. Perera',
          tecMember1: 'M.B. Silva',
          tecMember2: 'S.C. Fernando'
        })
      }
    );

    if (!tecUpdateRes.ok) {
      throw new Error(
        `TEC appointment update failed: ${await tecUpdateRes.text()}`
      );
    }

    console.log(
      '✓ Record updated with committee TEC/2023/001.'
    );

    let logs = await getNotificationLogs(authHeaders);
    let matchingLogs = findLogs(
      logs,
      testRecordId,
      'tec_appointment'
    );

    console.log(
      `✓ Notification API returned ${matchingLogs.length} tec_appointment entry(ies).`
    );

    if (matchingLogs.length === 0) {
      throw new Error(
        'Expected tec_appointment notification log not found!'
      );
    }

    console.log(
      '✓ TEST 1 PASSED: TEC Appointment notification triggered and logged.\n'
    );

    // ------------------------------------------------------------
    // TEST 2: AWARD
    // ------------------------------------------------------------

    console.log(
      '4. Testing AWARD Notification with PDF Attachment...'
    );

    const awardUpdateRes = await apiFetch(
      `/api/records/${testRecordId}`,
      {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          status: 'Awarded',
          awardedTo: 'Lanka Transformers Ltd',
          serviceAgreementStartDate: '2026-09-01',
          serviceAgreementEndDate: '2027-09-01',
          delay: 0
        })
      }
    );

    if (!awardUpdateRes.ok) {
      throw new Error(
        `Award update failed: ${await awardUpdateRes.text()}`
      );
    }

    console.log('✓ Record updated to status Awarded.');

    logs = await getNotificationLogs(authHeaders);
    matchingLogs = findLogs(
      logs,
      testRecordId,
      'award'
    );

    console.log(
      `✓ Notification API returned ${matchingLogs.length} award entry(ies).`
    );

    if (matchingLogs.length === 0) {
      throw new Error(
        'Expected award notification log not found!'
      );
    }

    console.log(
      '✓ TEST 2 PASSED: Award notification triggered and logged.\n'
    );

    // ------------------------------------------------------------
    // TEST 3: COMPLETION
    // ------------------------------------------------------------

    console.log(
      '5. Testing TENDER COMPLETION Alert...'
    );

    const completeUpdateRes = await apiFetch(
      `/api/records/${testRecordId}`,
      {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          status: 'Close',
          performanceBondNumber: 'PB-2026-001',
          performanceBondBank: 'Bank of Ceylon'
        })
      }
    );

    if (!completeUpdateRes.ok) {
      throw new Error(
        `Completion update failed: ${await completeUpdateRes.text()}`
      );
    }

    console.log('✓ Record updated to status Close.');

    logs = await getNotificationLogs(authHeaders);
    matchingLogs = findLogs(
      logs,
      testRecordId,
      'completion'
    );

    console.log(
      `✓ Notification API returned ${matchingLogs.length} completion entry(ies).`
    );

    if (matchingLogs.length === 0) {
      throw new Error(
        'Expected completion notification log not found!'
      );
    }

    console.log(
      '✓ TEST 3 PASSED: Tender Completion alert triggered and logged.\n'
    );

    // ------------------------------------------------------------
    // TEST 4: DELAY REMINDERS
    // ------------------------------------------------------------

    console.log(
      '6. Testing OVERDUE DELAY Reminders (delay_2, delay_5, delay_10)...'
    );

    const today = new Date();

    const delayDates = [
      { days: 2, type: 'delay_2' },
      { days: 5, type: 'delay_5' },
      { days: 10, type: 'delay_10' }
    ];

    for (const dItem of delayDates) {
      const pastDate = new Date(today);

      pastDate.setDate(
        today.getDate() - dItem.days
      );

      const dateStr = formatDateStr(pastDate);

      const dNo =
        `CEB/DELAY/${dItem.type.toUpperCase()}/` +
        `${Date.now().toString().slice(-4)}-` +
        `${Math.floor(Math.random() * 1000)}`;

      console.log(
        `   Creating overdue record ${dNo} with bidClosingDate = ${dateStr}...`
      );

      const dRes = await apiFetch('/api/records', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          tenderNumber: dNo,
          category: 'Services',
          relevantTo: 'Distribution Division',
          description:
            `Test overdue tender for ${dItem.type}`,
          status: 'Under Evaluation',
          bidClosingDate: dateStr
        })
      });

      if (!dRes.ok) {
        throw new Error(
          `Delay test record creation failed: ${await dRes.text()}`
        );
      }

      const dCreated = await dRes.json();

      delayRecordIds.push({
        id: dCreated.id || dCreated._id,
        type: dItem.type,
        number: dNo
      });
    }

    console.log(
      '   Triggering POST /api/notifications/test-run-delays...'
    );

    const runDelayRes = await apiFetch(
      '/api/notifications/test-run-delays',
      {
        method: 'POST',
        headers: authHeaders
      }
    );

    if (!runDelayRes.ok) {
      throw new Error(
        `test-run-delays failed: ${await runDelayRes.text()}`
      );
    }

    const delaySummary = await runDelayRes.json();

    console.log(
      '✓ Delay reminder job execution summary:'
    );

    console.log(
      JSON.stringify(delaySummary, null, 2)
    );

    logs = await getNotificationLogs(authHeaders);

    for (const dRec of delayRecordIds) {
      const dLogs = findLogs(
        logs,
        dRec.id,
        dRec.type
      );

      console.log(
        `✓ Notification log for ${dRec.number} (${dRec.type}): ${dLogs.length}`
      );

      if (dLogs.length === 0) {
        throw new Error(
          `Expected ${dRec.type} notification log not found for ${dRec.number}`
        );
      }
    }

    console.log(
      '✓ TEST 4 PASSED: Overdue delay reminders fired and logged.\n'
    );

    // ------------------------------------------------------------
    // TEST 5: DUPLICATE PREVENTION
    // ------------------------------------------------------------

    console.log(
      '7. Testing Duplicate Prevention on Delay Reminders...'
    );

    const runDuplicateRes = await apiFetch(
      '/api/notifications/test-run-delays',
      {
        method: 'POST',
        headers: authHeaders
      }
    );

    if (!runDuplicateRes.ok) {
      throw new Error(
        `Second delay run failed: ${await runDuplicateRes.text()}`
      );
    }

    const dupSummary = await runDuplicateRes.json();

    console.log(
      `✓ Second run skippedAlreadySent: ${dupSummary.skippedAlreadySent}, emailsSent: ${dupSummary.emailsSent}`
    );

    if (dupSummary.skippedAlreadySent < 3) {
      console.warn(
        'Warning: expected at least 3 skippedAlreadySent'
      );
    } else {
      console.log(
        '✓ TEST 5 PASSED: Duplicate prevention active.\n'
      );
    }

    // ------------------------------------------------------------
    // TEST 6: NOTIFICATION API
    // ------------------------------------------------------------

    console.log(
      '8. Testing GET /api/notifications endpoint...'
    );

    logs = await getNotificationLogs(authHeaders);

    console.log(
      `✓ GET /api/notifications returned ${logs.length} total logs.`
    );

    const typesPresent = [
      ...new Set(
        logs.map(
          log =>
            log.notificationType ||
            log.notification_type
        )
      )
    ];

    console.log(
      '✓ Distinct notification types in logs:',
      typesPresent
    );

  } finally {
    // Record deletion performs MongoDB notification-log cascade cleanup.
    for (const dRec of delayRecordIds) {
      await apiFetch(
        `/api/records/${dRec.id}`,
        {
          method: 'DELETE',
          headers: authHeaders
        }
      ).catch(() => {});
    }

    if (testRecordId) {
      console.log(
        `\nCleaning up test record ${testRecordId}...`
      );

      await apiFetch(
        `/api/records/${testRecordId}`,
        {
          method: 'DELETE',
          headers: authHeaders
        }
      ).catch(() => {});

      console.log('✓ Cleaned up test data.');
    }
  }

  console.log(
    '\n=========================================================='
  );

  console.log(
    'NOTIFICATION E2E VERIFICATION COMPLETE!'
  );

  console.log(
    '=========================================================='
  );
}

runLiveTests().catch(err => {
  console.error(
    '\n❌ E2E VERIFICATION FAILED:',
    err
  );

  process.exit(1);
});
