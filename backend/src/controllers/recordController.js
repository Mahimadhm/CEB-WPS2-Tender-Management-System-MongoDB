const path = require('path');
const fs = require('fs/promises');
const XLSX = require('xlsx');

const mongoose = require('mongoose');
const Record = require('../models/Record');
const RecordDocument = require('../models/RecordDocument');
const NotificationLog = require('../models/NotificationLog');

const AuditLog = require('../utils/auditLogger');
const {
  handleRecordTransitions
} = require('../utils/recordNotificationTriggers');

const UPLOAD_ROOT = path.join(
  __dirname,
  '../../uploads/tender-documents'
);

/* =========================================================
   FORMAT RECORD DOCUMENT
========================================================= */

const formatRecordDocument = (doc) => {
  if (!doc) return null;

  const id = doc._id
    ? doc._id.toString()
    : String(doc.id);

  return {
    _id: id,
    id,

    filename: doc.file_name || '',
    originalName: doc.file_name || '',
    filePath: doc.file_path || '',
    mimeType: doc.mime_type || '',
    size: Number(doc.file_size || 0),

    uploadedBy: '',
    uploadedByName: 'Staff Member',
    uploadedByEmail: '',

    uploadedAt: doc.uploaded_at
  };
};

/* =========================================================
   FORMAT DATE
========================================================= */

const formatDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return value
      .toISOString()
      .slice(0, 10);
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date
      .toISOString()
      .slice(0, 10);
  }

  return value;
};

/* =========================================================
   FORMAT RECORD
========================================================= */

const formatRecord = (
  row,
  documents = []
) => {
  if (!row) return null;

  const id = row._id
    ? row._id.toString()
    : String(row.id);

  return {
    _id: id,
    id,

    tenderNumber:
      row.tender_number || '',

    relevantTo:
      row.relevant_to || '',

    category:
      row.category || '',

    description:
      row.description || '',

    other:
      row.other || '',

    bidStartDate:
      formatDate(
        row.bid_start_date
      ),

    bidOpenDate:
      formatDate(
        row.bid_open_date
      ),

    bidClosingDate:
      formatDate(
        row.bid_closing_date
      ),

    approvedDate:
      formatDate(
        row.approved_date
      ),

    fileSentToTecDate:
      formatDate(
        row.file_sent_to_tec_date
      ),

    fileSentToTecSecondTime:
      formatDate(
        row.file_sent_to_tec_second_time
      ),

    bidBondNumber:
      row.bid_bond_number || '',

    bidBondBank:
      row.bid_bond_bank || '',

    bidValidityPeriod:
      formatDate(
        row.bid_validity_period
      ),

    remark:
      row.remark || '',

    status:
      row.status ||
      'Under Evaluation',

    tecCommitteeNumber:
      row.tec_committee_number || '',

    tecChairman:
      row.tec_chairman || '',

    tecMember1:
      row.tec_member1 || '',

    tecMember2:
      row.tec_member2 || '',

    awardedTo:
      row.awarded_to || '',

    serviceAgreementStartDate:
      formatDate(
        row.service_agreement_start_date
      ),

    serviceAgreementEndDate:
      formatDate(
        row.service_agreement_end_date
      ),

    performanceBondNumber:
      row.performance_bond_number || '',

    performanceBondBank:
      row.performance_bond_bank || '',

    performanceBondRemark:
      row.performance_bond_remark || '',

    delay:
      row.delay !== null &&
      row.delay !== undefined
        ? Number(row.delay)
        : 0,

    documents:
      documents.map(
        formatRecordDocument
      ),

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at
  };
};

/* =========================================================
   MAP FRONTEND INPUT -> DATABASE
========================================================= */

const mapRecordInput = (body) => {
  const result = {};

  if (
    body.tenderNumber !== undefined
  ) {
    result.tender_number =
      body.tenderNumber;
  } else if (
    body.tender_number !== undefined
  ) {
    result.tender_number =
      body.tender_number;
  }

  if (
    body.relevantTo !== undefined
  ) {
    result.relevant_to =
      body.relevantTo;
  }

  if (
    body.category !== undefined
  ) {
    result.category =
      body.category;
  }

  if (
    body.description !== undefined
  ) {
    result.description =
      body.description;
  }

  if (
    body.other !== undefined
  ) {
    result.other =
      body.other;
  }

  if (
    body.bidStartDate !== undefined
  ) {
    result.bid_start_date =
      body.bidStartDate
        ? String(
            body.bidStartDate
          ).slice(0, 10)
        : null;
  }

  if (
    body.bidOpenDate !== undefined
  ) {
    result.bid_open_date =
      body.bidOpenDate
        ? String(
            body.bidOpenDate
          ).slice(0, 10)
        : null;
  }

  if (
    body.bidClosingDate !== undefined
  ) {
    result.bid_closing_date =
      body.bidClosingDate
        ? String(
            body.bidClosingDate
          ).slice(0, 10)
        : null;
  }

  if (
    body.approvedDate !== undefined
  ) {
    result.approved_date =
      body.approvedDate
        ? String(
            body.approvedDate
          ).slice(0, 10)
        : null;
  }

  if (
    body.fileSentToTecDate !==
    undefined
  ) {
    result.file_sent_to_tec_date =
      body.fileSentToTecDate
        ? String(
            body.fileSentToTecDate
          ).slice(0, 10)
        : null;
  }

  if (
    body.fileSentToTecSecondTime !==
    undefined
  ) {
    result.file_sent_to_tec_second_time =
      body.fileSentToTecSecondTime
        ? String(
            body.fileSentToTecSecondTime
          ).slice(0, 10)
        : null;
  }

  if (
    body.bidBondNumber !== undefined
  ) {
    result.bid_bond_number =
      body.bidBondNumber;
  }

  if (
    body.bidBondBank !== undefined
  ) {
    result.bid_bond_bank =
      body.bidBondBank;
  }

  if (
    body.bidValidityPeriod !==
    undefined
  ) {
    result.bid_validity_period =
      body.bidValidityPeriod
        ? String(
            body.bidValidityPeriod
          ).slice(0, 10)
        : null;
  }

  if (
    body.remark !== undefined
  ) {
    result.remark =
      body.remark;
  }

  if (
    body.status !== undefined
  ) {
    result.status =
      body.status;
  }

  if (
    body.tecCommitteeNumber !==
    undefined
  ) {
    result.tec_committee_number =
      body.tecCommitteeNumber;
  }

  if (
    body.tecChairman !== undefined
  ) {
    result.tec_chairman =
      body.tecChairman;
  }

  if (
    body.tecMember1 !== undefined
  ) {
    result.tec_member1 =
      body.tecMember1;
  }

  if (
    body.tecMember2 !== undefined
  ) {
    result.tec_member2 =
      body.tecMember2;
  }

  if (
    body.awardedTo !== undefined
  ) {
    result.awarded_to =
      body.awardedTo;
  }

  if (
    body.serviceAgreementStartDate !==
    undefined
  ) {
    result.service_agreement_start_date =
      body.serviceAgreementStartDate
        ? String(
            body.serviceAgreementStartDate
          ).slice(0, 10)
        : null;
  }

  if (
    body.serviceAgreementEndDate !==
    undefined
  ) {
    result.service_agreement_end_date =
      body.serviceAgreementEndDate
        ? String(
            body.serviceAgreementEndDate
          ).slice(0, 10)
        : null;
  }

  if (
    body.performanceBondNumber !==
    undefined
  ) {
    result.performance_bond_number =
      body.performanceBondNumber;
  }

  if (
    body.performanceBondBank !==
    undefined
  ) {
    result.performance_bond_bank =
      body.performanceBondBank;
  }

  if (
    body.performanceBondRemark !==
    undefined
  ) {
    result.performance_bond_remark =
      body.performanceBondRemark;
  }

  if (
    body.delay !== undefined &&
    body.delay !== null
  ) {
    result.delay =
      Number(body.delay);
  }

  return result;
};

/* =========================================================
   LIST RECORDS
========================================================= */

exports.list = async (
  req,
  res,
  next
) => {
  try {
    const records =
      await Record.find({})
        .sort({
          created_at: -1
        });

    const allDocs =
      await RecordDocument
        .find({})
        .sort({
          uploaded_at: 1
        });

    const docsByRecordId = {};

    allDocs.forEach((doc) => {
      const recordId =
        doc.record_id.toString();

      if (
        !docsByRecordId[
          recordId
        ]
      ) {
        docsByRecordId[
          recordId
        ] = [];
      }

      docsByRecordId[
        recordId
      ].push(doc);
    });

    const items =
      records.map(
        (record) => {
          const recordId =
            record._id.toString();

          return formatRecord(
            record,
            docsByRecordId[
              recordId
            ] || []
          );
        }
      );

    res.json(items);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

/* =========================================================
   CREATE RECORD
========================================================= */

exports.create = async (
  req,
  res,
  next
) => {
  try {
    const insertData =
      mapRecordInput(
        req.body
      );

    const record =
      await Record.create(
        insertData
      );

    const item =
      formatRecord(
        record,
        []
      );

    await AuditLog.create({
      user:
        req.user?.email,

      type:
        'create:record',

      message:
        `Created record ${item.tenderNumber}`
    }).catch((err) =>
      console.error(
        'AuditLog error:',
        err
      )
    );

    /*
     * Trigger notifications for a newly created record.
     * Empty previousRecord allows initial Award/TEC/Completion
     * values to be detected as transitions.
     */
    await handleRecordTransitions({
      env: process.env,
      previousRecord: {},
      updatedRecord: record.toObject()
    }).catch((err) =>
      console.error(
        'Record notification error:',
        err
      )
    );

    res
      .status(201)
      .json(item);

  } catch (err) {
    if (
      err.code === 11000
    ) {
      return res
        .status(400)
        .json({
          message:
            'Tender number already exists'
        });
    }

    next(err);
  }
};

/* =========================================================
   GET RECORD
========================================================= */

exports.get = async (
  req,
  res,
  next
) => {
  try {
    if (
      !mongoose.Types
        .ObjectId
        .isValid(
          req.params.id
        )
    ) {
      return res
        .status(404)
        .json({
          message:
            'Not found'
        });
    }

    const record =
      await Record.findById(
        req.params.id
      );

    if (!record) {
      return res
        .status(404)
        .json({
          message:
            'Not found'
        });
    }

    const docs =
      await RecordDocument
        .find({
          record_id:
            record._id
        })
        .sort({
          uploaded_at: 1
        });

    res.json(
      formatRecord(
        record,
        docs
      )
    );

  } catch (err) {
    next(err);
  }
};

/* =========================================================
   UPDATE RECORD
========================================================= */

exports.update = async (
  req,
  res,
  next
) => {
  try {
    if (
      !mongoose.Types
        .ObjectId
        .isValid(
          req.params.id
        )
    ) {
      return res
        .status(404)
        .json({
          message:
            'Not found'
        });
    }

    const record =
      await Record.findById(
        req.params.id
      );

    if (!record) {
      return res
        .status(404)
        .json({
          message:
            'Not found'
        });
    }

    /*
     * Keep the original values before applying updates.
     * Notification transition detection needs both states.
     */
    const previousRecord =
      record.toObject();

    const updates =
      mapRecordInput(
        req.body
      );

    Object.assign(
      record,
      updates
    );

    const updated =
      await record.save();

    const docs =
      await RecordDocument
        .find({
          record_id:
            updated._id
        })
        .sort({
          uploaded_at: 1
        });

    const item =
      formatRecord(
        updated,
        docs
      );

    await AuditLog.create({
      user:
        req.user?.email,

      type:
        'update:record',

      message:
        `Updated record ${item.tenderNumber}`
    }).catch((err) =>
      console.error(
        'AuditLog error:',
        err
      )
    );

    /*
     * Trigger Award / TEC / Completion notifications
     * only when the relevant values transition.
     */
    await handleRecordTransitions({
      env: process.env,
      previousRecord,
      updatedRecord: updated.toObject()
    }).catch((err) =>
      console.error(
        'Record notification error:',
        err
      )
    );

    res.json(item);

  } catch (err) {
    if (
      err.code === 11000
    ) {
      return res
        .status(400)
        .json({
          message:
            'Tender number already exists'
        });
    }

    next(err);
  }
};

/* =========================================================
   DELETE RECORD
========================================================= */

exports.remove = async (
  req,
  res,
  next
) => {
  try {
    if (
      !mongoose.Types
        .ObjectId
        .isValid(
          req.params.id
        )
    ) {
      return res
        .status(404)
        .json({
          message:
            'Not found'
        });
    }

    const record =
      await Record.findById(
        req.params.id
      );

    if (!record) {
      return res
        .status(404)
        .json({
          message:
            'Not found'
        });
    }

    const recordFolder =
      path.join(
        UPLOAD_ROOT,
        record._id.toString()
      );

    /*
     * Delete MongoDB document
     * metadata first.
     */
    await RecordDocument
      .deleteMany({
        record_id:
          record._id
      });

    /*
     * Delete notification logs
     * belonging to this record.
     */
    await NotificationLog
      .deleteMany({
        record_id:
          record._id
      });

    /*
     * Delete record.
     */
    await Record
      .findByIdAndDelete(
        record._id
      );

    /*
     * Delete all physical files
     * belonging to this record.
     */
    await fs.rm(
      recordFolder,
      {
        recursive: true,
        force: true
      }
    );

    await AuditLog.create({
      user:
        req.user?.email,

      type:
        'delete:record',

      message:
        `Deleted record ${
          record.tender_number ||
          record._id
        }`
    }).catch((err) =>
      console.error(
        'AuditLog error:',
        err
      )
    );

    res.json({
      message:
        'Deleted'
    });

  } catch (err) {
    next(err);
  }
};

/* =========================================================
   EXCEL IMPORT HELPERS
========================================================= */

const cleanExcelText = (
  value
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(
    value
  ).trim();
};

const normalizeExcelHeader = (
  value
) => {
  return cleanExcelText(
    value
  )
    .toLowerCase()
    .replace(
      /\r?\n/g,
      ' '
    )
    .replace(
      /[_-]+/g,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
};

const excelDateToISO = (
  value
) => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  /*
   * XLSX can return
   * JavaScript Date objects.
   */
  if (
    value instanceof Date &&
    !Number.isNaN(
      value.getTime()
    )
  ) {
    return value
      .toISOString()
      .slice(0, 10);
  }

  /*
   * Excel serial date.
   */
  if (
    typeof value ===
    'number'
  ) {
    const parsed =
      XLSX.SSF
        .parse_date_code(
          value
        );

    if (parsed) {
      const year =
        String(
          parsed.y
        ).padStart(
          4,
          '0'
        );

      const month =
        String(
          parsed.m
        ).padStart(
          2,
          '0'
        );

      const day =
        String(
          parsed.d
        ).padStart(
          2,
          '0'
        );

      return (
        `${year}-` +
        `${month}-` +
        `${day}`
      );
    }
  }

  const text =
    cleanExcelText(
      value
    );

  if (!text) {
    return null;
  }

  /*
   * dd/mm/yyyy
   * or dd-mm-yyyy
   */
  const slashMatch =
    text.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
    );

  if (slashMatch) {
    const [
      ,
      day,
      month,
      year
    ] = slashMatch;

    return (
      `${year}-` +
      `${month.padStart(
        2,
        '0'
      )}-` +
      `${day.padStart(
        2,
        '0'
      )}`
    );
  }

  const parsedDate =
    new Date(text);

  if (
    !Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return parsedDate
      .toISOString()
      .slice(0, 10);
  }

  return null;
};

const findExcelValue = (
  row,
  aliases
) => {
  for (
    const alias
    of aliases
  ) {
    const normalizedAlias =
      normalizeExcelHeader(
        alias
      );

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          row,
          normalizedAlias
        )
    ) {
      return row[
        normalizedAlias
      ];
    }
  }

  return undefined;
};

const addTextField = (
  target,
  key,
  value
) => {
  const text =
    cleanExcelText(
      value
    );

  /*
   * Blank Excel values
   * do not overwrite
   * existing DB values.
   */
  if (text) {
    target[key] =
      text;
  }
};

const addDateField = (
  target,
  key,
  value
) => {
  const text =
    cleanExcelText(
      value
    );

  if (!text) {
    return {
      status:
        'blank'
    };
  }

  const parsed =
    excelDateToISO(
      value
    );

  if (!parsed) {
    return {
      status:
        'invalid',

      value:
        text
    };
  }

  target[key] =
    parsed;

  return {
    status:
      'valid',

    value:
      parsed
  };
};

/* =========================================================
   PREVIEW EXCEL - NO DATABASE WRITES
========================================================= */

exports.previewExcel = async (
  req,
  res,
  next
) => {
  try {
    if (
      !req.file ||
      !req.file.buffer
    ) {
      return res
        .status(400)
        .json({
          message:
            'Please select an Excel file'
        });
    }

    const workbook =
      XLSX.read(
        req.file.buffer,
        {
          type:
            'buffer',

          cellDates:
            true
        }
      );

    const sheetName =
      workbook.SheetNames.find(
        (name) =>
          name
            .trim()
            .toLowerCase() ===
          'pending tec'
      );

    if (!sheetName) {
      return res
        .status(400)
        .json({
          message:
            'Pending TEC sheet was not found in this workbook',

          availableSheets:
            workbook.SheetNames
        });
    }

    const sheet =
      workbook.Sheets[
        sheetName
      ];

    const matrix =
      XLSX.utils
        .sheet_to_json(
          sheet,
          {
            header: 1,
            defval: '',
            raw: true
          }
        );

    const headerRowIndex =
      matrix.findIndex(
        (row) =>
          Array.isArray(row) &&
          row.some(
            (cell) =>
              normalizeExcelHeader(
                cell
              ) ===
              'tender number'
          )
      );

    if (
      headerRowIndex === -1
    ) {
      return res
        .status(400)
        .json({
          message:
            'Could not find the Tender Number header in the Pending TEC sheet'
        });
    }

    const rawHeaders =
      matrix[
        headerRowIndex
      ].map(
        (value) =>
          cleanExcelText(
            value
          )
      );

    const normalizedHeaders =
      rawHeaders.map(
        normalizeExcelHeader
      );

    const sourceRows =
      matrix.slice(
        headerRowIndex + 1
      );

    const warnings = [];

    const tenderNumbers =
      new Set();

    let nonBlankRows = 0;
    let validTenderRows = 0;
    let duplicateTenderNumbers = 0;

    const dateHeaders = [
      'Bid Closing date',
      'File sent to TEC on',
      'File sent to TEC on second time',
      'Bid Validity Period',
      'Start date of the service agreement',
      'End date of the service agreement'
    ];

    sourceRows.forEach(
      (values, index) => {
        if (
          !Array.isArray(
            values
          ) ||
          !values.some(
            (value) =>
              cleanExcelText(
                value
              ) !== ''
          )
        ) {
          return;
        }

        nonBlankRows += 1;

        const excelRowNumber =
          headerRowIndex +
          index +
          2;

        const normalizedRow =
          {};

        normalizedHeaders
          .forEach(
            (
              header,
              columnIndex
            ) => {
              if (header) {
                normalizedRow[
                  header
                ] =
                  values[
                    columnIndex
                  ];
              }
            }
          );

        const tenderNumber =
          cleanExcelText(
            findExcelValue(
              normalizedRow,
              [
                'Tender Number'
              ]
            )
          );

        if (!tenderNumber) {
          warnings.push({
            row:
              excelRowNumber,

            field:
              'Tender Number',

            message:
              'Tender Number is missing — row will be skipped'
          });

          return;
        }

        validTenderRows += 1;

        if (
          tenderNumbers.has(
            tenderNumber
          )
        ) {
          duplicateTenderNumbers +=
            1;

          warnings.push({
            row:
              excelRowNumber,

            field:
              'Tender Number',

            message:
              `Duplicate Tender Number: ${tenderNumber} — last occurrence will be used`
          });
        }

        tenderNumbers.add(
          tenderNumber
        );

        dateHeaders.forEach(
          (header) => {
            const value =
              findExcelValue(
                normalizedRow,
                [header]
              );

            if (
              value !==
                undefined &&
              value !== null &&
              cleanExcelText(
                value
              ) !== '' &&
              !excelDateToISO(
                value
              )
            ) {
              warnings.push({
                row:
                  excelRowNumber,

                field:
                  header,

                message:
                  `Invalid date: ${cleanExcelText(
                    value
                  )} — field will be skipped`
              });
            }
          }
        );
      }
    );

    return res.json({
      message:
        'Excel validation preview completed. No database records were changed.',

      dryRun:
        true,

      fileName:
        req.file.originalname,

      sheet:
        sheetName,

      headerRow:
        headerRowIndex + 1,

      headers:
        rawHeaders.filter(
          Boolean
        ),

      nonBlankRows,

      validTenderRows,

      uniqueTenderNumbers:
        tenderNumbers.size,

      duplicateTenderNumbers,

      warningCount:
        warnings.length,

      blockingErrorCount:
        0,

      validationErrorCount:
        warnings.length,

      errors:
        warnings.slice(
          0,
          100
        )
    });

  } catch (err) {
    console.error(
      'Excel preview failed:',
      err
    );

    next(err);
  }
};

/* =========================================================
   IMPORT EXCEL
========================================================= */

exports.importExcel = async (
  req,
  res,
  next
) => {
  try {
    if (
      !req.file ||
      !req.file.buffer
    ) {
      return res
        .status(400)
        .json({
          message:
            'Please select an Excel file'
        });
    }

    /* -----------------------------
       Read Workbook
    ----------------------------- */

    const workbook =
      XLSX.read(
        req.file.buffer,
        {
          type:
            'buffer',

          cellDates:
            true
        }
      );

    /* -----------------------------
       Find Pending TEC sheet
    ----------------------------- */

    const sheetName =
      workbook.SheetNames.find(
        (name) =>
          name
            .trim()
            .toLowerCase() ===
          'pending tec'
      );

    if (!sheetName) {
      return res
        .status(400)
        .json({
          message:
            'Pending TEC sheet was not found in this workbook',

          availableSheets:
            workbook.SheetNames
        });
    }

    const sheet =
      workbook.Sheets[
        sheetName
      ];

    /* -----------------------------
       Convert Sheet -> Array
    ----------------------------- */

    const matrix =
      XLSX.utils
        .sheet_to_json(
          sheet,
          {
            header: 1,
            defval: '',
            raw: true
          }
        );

    /* -----------------------------
       Detect Header Row
    ----------------------------- */

    const headerRowIndex =
      matrix.findIndex(
        (row) =>
          Array.isArray(row) &&
          row.some(
            (cell) =>
              normalizeExcelHeader(
                cell
              ) ===
              'tender number'
          )
      );

    if (
      headerRowIndex === -1
    ) {
      return res
        .status(400)
        .json({
          message:
            'Could not find the Tender Number header in the Pending TEC sheet'
        });
    }

    const headers =
      matrix[
        headerRowIndex
      ].map(
        normalizeExcelHeader
      );

    /*
     * Pending TEC contains
     * two Remarks columns.
     * Use FIRST Remarks column.
     */
    const remarkColumnIndexes =
      headers
        .map(
          (
            header,
            index
          ) =>
            header ===
            'remarks'
              ? index
              : -1
        )
        .filter(
          (index) =>
            index !== -1
        );

    const sourceRows =
      matrix.slice(
        headerRowIndex + 1
      );

    /* -----------------------------
       Parse Records
    ----------------------------- */

    const rowsByTenderNumber =
      new Map();

    const warnings = [];

    let skipped = 0;

    sourceRows.forEach(
      (values, index) => {
        const excelRowNumber =
          headerRowIndex +
          index +
          2;

        const normalizedRow =
          {};

        headers.forEach(
          (
            header,
            columnIndex
          ) => {
            if (header) {
              normalizedRow[
                header
              ] =
                values[
                  columnIndex
                ];
            }
          }
        );

        const hasAnyValue =
          values.some(
            (value) =>
              cleanExcelText(
                value
              )
          );

        /*
         * Ignore completely
         * blank rows.
         */
        if (!hasAnyValue) {
          return;
        }

        const tenderNumber =
          cleanExcelText(
            findExcelValue(
              normalizedRow,
              [
                'Tender Number',
                'Tender No',
                'Tender No.'
              ]
            )
          );

        if (!tenderNumber) {
          skipped += 1;

          warnings.push({
            row:
              excelRowNumber,

            field:
              'Tender Number',

            message:
              'Tender Number is missing — row skipped'
          });

          return;
        }

        const record = {
          tender_number:
            tenderNumber
        };

        /* -------------------------
           Verified Mapping
        ------------------------- */

        addTextField(
          record,
          'relevant_to',
          findExcelValue(
            normalizedRow,
            ['Relevant To']
          )
        );

        addTextField(
          record,
          'category',
          findExcelValue(
            normalizedRow,
            ['Category']
          )
        );

        addTextField(
          record,
          'description',
          findExcelValue(
            normalizedRow,
            ['Description']
          )
        );

        addTextField(
          record,
          'other',
          findExcelValue(
            normalizedRow,
            ['Other']
          )
        );

        const bidClosingResult =
          addDateField(
            record,
            'bid_closing_date',
            findExcelValue(
              normalizedRow,
              [
                'Bid Closing date'
              ]
            )
          );

        if (
          bidClosingResult
            .status ===
          'invalid'
        ) {
          warnings.push({
            row:
              excelRowNumber,

            field:
              'Bid Closing date',

            message:
              `Invalid date: ${bidClosingResult.value} — field skipped`
          });
        }

        const fileSentResult =
          addDateField(
            record,
            'file_sent_to_tec_date',
            findExcelValue(
              normalizedRow,
              [
                'File sent to TEC on'
              ]
            )
          );

        if (
          fileSentResult
            .status ===
          'invalid'
        ) {
          warnings.push({
            row:
              excelRowNumber,

            field:
              'File sent to TEC on',

            message:
              `Invalid date: ${fileSentResult.value} — field skipped`
          });
        }

        const fileSentSecondResult =
          addDateField(
            record,
            'file_sent_to_tec_second_time',
            findExcelValue(
              normalizedRow,
              [
                'File sent to TEC on second time'
              ]
            )
          );

        if (
          fileSentSecondResult
            .status ===
          'invalid'
        ) {
          warnings.push({
            row:
              excelRowNumber,

            field:
              'File sent to TEC on second time',

            message:
              `Invalid date: ${fileSentSecondResult.value} — field skipped`
          });
        }

        const bidValidityResult =
          addDateField(
            record,
            'bid_validity_period',
            findExcelValue(
              normalizedRow,
              [
                'Bid Validity Period'
              ]
            )
          );

        if (
          bidValidityResult
            .status ===
          'invalid'
        ) {
          warnings.push({
            row:
              excelRowNumber,

            field:
              'Bid Validity Period',

            message:
              `Invalid date: ${bidValidityResult.value} — field skipped`
          });
        }

        /*
         * FIRST Remarks column only.
         */
        const firstRemarkValue =
          remarkColumnIndexes
            .length > 0
            ? values[
                remarkColumnIndexes[
                  0
                ]
              ]
            : undefined;

        addTextField(
          record,
          'remark',
          firstRemarkValue
        );

        addTextField(
          record,
          'status',
          findExcelValue(
            normalizedRow,
            ['Status']
          )
        );

        addTextField(
          record,
          'tec_chairman',
          findExcelValue(
            normalizedRow,
            ['TEC Chairman']
          )
        );

        addTextField(
          record,
          'tec_member1',
          findExcelValue(
            normalizedRow,
            ['Member 1']
          )
        );

        addTextField(
          record,
          'tec_member2',
          findExcelValue(
            normalizedRow,
            [
              'Member 2 (Acc Assistant)'
            ]
          )
        );

        addTextField(
          record,
          'awarded_to',
          findExcelValue(
            normalizedRow,
            ['Awarded To']
          )
        );

        const serviceStartResult =
          addDateField(
            record,
            'service_agreement_start_date',
            findExcelValue(
              normalizedRow,
              [
                'Start date of the service agreement'
              ]
            )
          );

        if (
          serviceStartResult
            .status ===
          'invalid'
        ) {
          warnings.push({
            row:
              excelRowNumber,

            field:
              'Start date of the service agreement',

            message:
              `Invalid date: ${serviceStartResult.value} — field skipped`
          });
        }

        const serviceEndResult =
          addDateField(
            record,
            'service_agreement_end_date',
            findExcelValue(
              normalizedRow,
              [
                'End date of the service agreement'
              ]
            )
          );

        if (
          serviceEndResult
            .status ===
          'invalid'
        ) {
          warnings.push({
            row:
              excelRowNumber,

            field:
              'End date of the service agreement',

            message:
              `Invalid date: ${serviceEndResult.value} — field skipped`
          });
        }

        /*
         * NOT imported intentionally:
         *
         * e-mail
         * Previous Tender Number
         * Previous agreement dates
         * Delay columns
         *
         * Mapping is not confirmed.
         */

        /* -------------------------
           Duplicate inside Excel
        ------------------------- */

        if (
          rowsByTenderNumber
            .has(
              tenderNumber
            )
        ) {
          skipped += 1;

          warnings.push({
            row:
              excelRowNumber,

            field:
              'Tender Number',

            message:
              `Duplicate Tender Number: ${tenderNumber} — last occurrence used`
          });
        }

        /*
         * Last occurrence wins.
         */
        rowsByTenderNumber
          .set(
            tenderNumber,
            record
          );
      }
    );

    const importedRows =
      Array.from(
        rowsByTenderNumber
          .values()
      );

    if (
      importedRows.length ===
      0
    ) {
      return res
        .status(400)
        .json({
          message:
            'No valid tender records were found in the Pending TEC sheet',

          skipped,

          warningCount:
            warnings.length,

          warnings:
            warnings.slice(
              0,
              100
            ),

          errors:
            warnings.slice(
              0,
              100
            )
        });
    }

    /* =====================================================
       FIND EXISTING RECORDS - MONGODB
    ===================================================== */

    const tenderNumbers =
      importedRows.map(
        (row) =>
          row.tender_number
      );

    const existingRecords =
      await Record
        .find({
          tender_number: {
            $in:
              tenderNumbers
          }
        })
        .select(
          'tender_number'
        )
        .lean();

    const existingTenderNumbers =
      new Set(
        existingRecords.map(
          (record) =>
            record.tender_number
        )
      );

    const created =
      importedRows.filter(
        (row) =>
          !existingTenderNumbers
            .has(
              row.tender_number
            )
      ).length;

    const updated =
      importedRows.length -
      created;

    /* =====================================================
       MONGODB BULK UPSERT

       IMPORTANT:

       imported record contains only
       non-blank / valid Excel values.

       Therefore $set preserves
       existing DB values when Excel
       cells are blank or invalid.
    ===================================================== */

    const operations =
      importedRows.map(
        (record) => ({
          updateOne: {
            filter: {
              tender_number:
                record.tender_number
            },

            update: {
              $set:
                record
            },

            upsert:
              true
          }
        })
      );

    const writeChunkSize =
      100;

    for (
      let i = 0;
      i < operations.length;
      i += writeChunkSize
    ) {
      const chunk =
        operations.slice(
          i,
          i +
            writeChunkSize
        );

      await Record.bulkWrite(
        chunk,
        {
          ordered:
            false
        }
      );
    }

    /* =====================================================
       AUDIT LOG

       IMPORTANT:
       Do NOT trigger record notifications
       during historical Excel import.
    ===================================================== */

    await AuditLog.create({
      user:
        req.user?.email,

      type:
        'import:records',

      message:
        `Imported ${req.file.originalname}: ` +
        `${created} created, ` +
        `${updated} updated, ` +
        `${skipped} skipped`
    }).catch((err) =>
      console.error(
        'AuditLog error:',
        err
      )
    );

    /* =====================================================
       RESPONSE
    ===================================================== */

    res.json({
      message:
        'Excel import completed successfully',

      sheet:
        sheetName,

      total:
        importedRows.length,

      created,

      updated,

      skipped,

      warningCount:
        warnings.length,

      warnings:
        warnings.slice(
          0,
          100
        ),

      errors:
        warnings.slice(
          0,
          100
        )
    });

  } catch (err) {
    console.error(
      'Excel import failed:',
      err
    );

    next(err);
  }
};

/* =========================================================
   DOCUMENT MANAGEMENT
========================================================= */

exports.uploadDocuments = async (
  req,
  res,
  next
) => {
  try {
    if (
      !mongoose.Types
        .ObjectId
        .isValid(
          req.params.id
        )
    ) {
      return res
        .status(404)
        .json({
          message:
            'Tender record not found'
        });
    }

    const record =
      await Record.findById(
        req.params.id
      );

    if (!record) {
      return res
        .status(404)
        .json({
          message:
            'Tender record not found'
        });
    }

    const recordFolder =
      path.join(
        UPLOAD_ROOT,
        record._id.toString()
      );

    await fs.mkdir(
      recordFolder,
      {
        recursive:
          true
      }
    );

    const createdDocs =
      [];

    if (
      req.files &&
      req.files.length > 0
    ) {
      for (
        const file
        of req.files
      ) {
        const ext =
          path
            .extname(
              file.originalname
            )
            .toLowerCase();

        const cleanBase =
          path
            .basename(
              file.originalname,
              ext
            )
            .replace(
              /[^a-zA-Z0-9_-]/g,
              '_'
            );

        const uniqueSuffix =
          `${Date.now()}-${Math.round(
            Math.random() *
              1e9
          )}`;

        const storageFilename =
          `${cleanBase}-${uniqueSuffix}${ext}`;

        const absolutePath =
          path.join(
            recordFolder,
            storageFilename
          );

        /*
         * Save actual file
         * to local disk.
         */
        await fs.writeFile(
          absolutePath,
          file.buffer
        );

        /*
         * Store relative path
         * in MongoDB.
         */
        const relativePath =
          path
            .join(
              'tender-documents',
              record._id
                .toString(),
              storageFilename
            )
            .replace(
              /\\/g,
              '/'
            );

        try {
          const document =
            await RecordDocument
              .create({
                record_id:
                  record._id,

                file_name:
                  file.originalname,

                file_path:
                  relativePath,

                file_size:
                  file.size,

                mime_type:
                  file.mimetype
              });

          createdDocs.push(
            document
          );

        } catch (dbError) {
          /*
           * Roll back physical
           * file if metadata
           * creation fails.
           */
          await fs
            .unlink(
              absolutePath
            )
            .catch(
              () => {}
            );

          throw dbError;
        }
      }
    }

    const docs =
      await RecordDocument
        .find({
          record_id:
            record._id
        })
        .sort({
          uploaded_at: 1
        });

    const formattedDocs =
      docs.map(
        formatRecordDocument
      );

    await AuditLog.create({
      user:
        req.user?.email,

      type:
        'document_upload',

      message:
        `Uploaded ${createdDocs.length} document(s) ` +
        `to Record ${
          record.tender_number ||
          record._id
        }`
    }).catch((err) =>
      console.error(
        'AuditLog error:',
        err
      )
    );

    res
      .status(201)
      .json({
        message:
          'Documents uploaded successfully',

        documents:
          formattedDocs
      });

  } catch (err) {
    next(err);
  }
};

/* =========================================================
   LIST DOCUMENTS
========================================================= */

exports.listDocuments = async (
  req,
  res,
  next
) => {
  try {
    if (
      !mongoose.Types
        .ObjectId
        .isValid(
          req.params.id
        )
    ) {
      return res
        .status(404)
        .json({
          message:
            'Tender record not found'
        });
    }

    const record =
      await Record.findById(
        req.params.id
      );

    if (!record) {
      return res
        .status(404)
        .json({
          message:
            'Tender record not found'
        });
    }

    const docs =
      await RecordDocument
        .find({
          record_id:
            record._id
        })
        .sort({
          uploaded_at: 1
        });

    res.json(
      docs.map(
        formatRecordDocument
      )
    );

  } catch (err) {
    next(err);
  }
};

/* =========================================================
   DOWNLOAD DOCUMENT
========================================================= */

exports.downloadDocument = async (
  req,
  res,
  next
) => {
  try {
    if (
      !mongoose.Types
        .ObjectId
        .isValid(
          req.params.id
        ) ||
      !mongoose.Types
        .ObjectId
        .isValid(
          req.params.docId
        )
    ) {
      return res
        .status(404)
        .json({
          message:
            'Document not found'
        });
    }

    const record =
      await Record.findById(
        req.params.id
      );

    if (!record) {
      return res
        .status(404)
        .json({
          message:
            'Tender record not found'
        });
    }

    const doc =
      await RecordDocument
        .findOne({
          _id:
            req.params.docId,

          record_id:
            record._id
        });

    if (!doc) {
      return res
        .status(404)
        .json({
          message:
            'Document not found'
        });
    }

    const absolutePath =
      path.resolve(
        path.join(
          __dirname,
          '../../uploads',
          doc.file_path
        )
      );

    const allowedRoot =
      path.resolve(
        UPLOAD_ROOT
      );

    /*
     * Prevent path traversal.
     */
    if (
      absolutePath !==
        allowedRoot &&
      !absolutePath.startsWith(
        allowedRoot +
          path.sep
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Invalid document path'
        });
    }

    try {
      await fs.access(
        absolutePath
      );
    } catch {
      return res
        .status(404)
        .json({
          message:
            'File not found in storage'
        });
    }

    res.setHeader(
      'Content-Type',
      doc.mime_type ||
        'application/octet-stream'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(
        doc.file_name
      )}`
    );

    res.sendFile(
      absolutePath
    );

  } catch (err) {
    next(err);
  }
};

/* =========================================================
   DELETE DOCUMENT
========================================================= */

exports.deleteDocument = async (
  req,
  res,
  next
) => {
  try {
    if (
      !mongoose.Types
        .ObjectId
        .isValid(
          req.params.id
        ) ||
      !mongoose.Types
        .ObjectId
        .isValid(
          req.params.docId
        )
    ) {
      return res
        .status(404)
        .json({
          message:
            'Document not found'
        });
    }

    const record =
      await Record.findById(
        req.params.id
      );

    if (!record) {
      return res
        .status(404)
        .json({
          message:
            'Tender record not found'
        });
    }

    const doc =
      await RecordDocument
        .findOne({
          _id:
            req.params.docId,

          record_id:
            record._id
        });

    if (!doc) {
      return res
        .status(404)
        .json({
          message:
            'Document not found'
        });
    }

    const absolutePath =
      path.resolve(
        path.join(
          __dirname,
          '../../uploads',
          doc.file_path
        )
      );

    const allowedRoot =
      path.resolve(
        UPLOAD_ROOT
      );

    /*
     * Prevent path traversal.
     */
    if (
      absolutePath !==
        allowedRoot &&
      !absolutePath.startsWith(
        allowedRoot +
          path.sep
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Invalid document path'
        });
    }

    /*
     * Delete physical file.
     *
     * ENOENT is allowed because
     * metadata should still be
     * removable if the file is
     * already missing.
     */
    try {
      await fs.unlink(
        absolutePath
      );
    } catch (err) {
      if (
        err.code !==
        'ENOENT'
      ) {
        throw err;
      }
    }

    /*
     * Delete MongoDB metadata.
     */
    await RecordDocument
      .findByIdAndDelete(
        doc._id
      );

    const docs =
      await RecordDocument
        .find({
          record_id:
            record._id
        })
        .sort({
          uploaded_at: 1
        });

    await AuditLog.create({
      user:
        req.user?.email,

      type:
        'document_delete',

      message:
        `Deleted document ${doc.file_name} ` +
        `from Record ${
          record.tender_number ||
          record._id
        }`
    }).catch((err) =>
      console.error(
        'AuditLog error:',
        err
      )
    );

    res.json({
      message:
        'Document deleted successfully',

      documents:
        docs.map(
          formatRecordDocument
        )
    });

  } catch (err) {
    next(err);
  }
};
