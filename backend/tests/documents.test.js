const request = require('supertest');
const fs = require('fs/promises');
const path = require('path');

const {
  setupDatabase,
  createTestApp,
  generateTestToken
} = require('./setup');

const Record = require('../src/models/Record');
const RecordDocument = require('../src/models/RecordDocument');
const AuditLog = require('../src/models/AuditLog');
const User = require('../src/models/User');

describe('Record Documents Management', () => {
  setupDatabase();

  const app = createTestApp();

  const testUserEmails = [
    'documents-clerk@ceb.lk',
    'documents-admin@ceb.lk',
    'documents-procurement@ceb.lk'
  ];

  let clerkToken;
  let adminToken;
  let procurementToken;
  let testRecord;

  beforeEach(async () => {
    await User.deleteMany({
      email: { $in: testUserEmails }
    });

    const users = await User.insertMany([
      {
        name: 'Documents Test Clerk',
        email: 'documents-clerk@ceb.lk',
        epf_number: 'DOC001',
        password: 'test-password-hash',
        role: 'Clerk',
        status: 'Active'
      },
      {
        name: 'Documents Test Admin',
        email: 'documents-admin@ceb.lk',
        epf_number: 'DOC002',
        password: 'test-password-hash',
        role: 'Admin',
        status: 'Active'
      },
      {
        name: 'Documents Test Procurement',
        email: 'documents-procurement@ceb.lk',
        epf_number: 'DOC003',
        password: 'test-password-hash',
        role: 'Procurement',
        status: 'Active'
      }
    ]);

    const [clerkUser, adminUser, procurementUser] = users;

    clerkToken = generateTestToken({
      id: clerkUser._id.toString(),
      _id: clerkUser._id.toString(),
      role: clerkUser.role,
      email: clerkUser.email
    });

    adminToken = generateTestToken({
      id: adminUser._id.toString(),
      _id: adminUser._id.toString(),
      role: adminUser.role,
      email: adminUser.email
    });

    procurementToken = generateTestToken({
      id: procurementUser._id.toString(),
      _id: procurementUser._id.toString(),
      role: procurementUser.role,
      email: procurementUser.email
    });

    testRecord = await Record.create({
      tender_number: `CEB/WPS2/2026/DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      category: 'Equipment',
      description: 'Document upload test record',
      status: 'Under Evaluation'
    });
  });

  afterEach(async () => {
    await User.deleteMany({
      email: { $in: testUserEmails }
    });

    if (!testRecord) return;

    const recordId = testRecord._id.toString();

    await RecordDocument.deleteMany({
      record_id: testRecord._id
    });

    await Record.deleteOne({
      _id: testRecord._id
    });

    await AuditLog.deleteMany({
      type: { $in: ['document_upload', 'document_delete'] }
    });

    const recordFolder = path.join(
      __dirname,
      '../uploads/tender-documents',
      recordId
    );

    await fs.rm(recordFolder, {
      recursive: true,
      force: true
    });
  });

  describe('POST /api/records/:id/documents (Upload)', () => {
    it('should allow a Clerk to upload valid PDF and image documents', async () => {
      const pdfBuffer = Buffer.from(
        '%PDF-1.4 test dummy pdf content'
      );

      const imgBuffer = Buffer.from(
        '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR dummy png content'
      );

      const res = await request(app)
        .post(`/api/records/${testRecord._id}/documents`)
        .set('Authorization', `Bearer ${clerkToken}`)
        .attach('files', pdfBuffer, 'proposal_scanned.pdf')
        .attach('files', imgBuffer, 'site_inspection.png');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('documents');
      expect(res.body.documents.length).toBe(2);

      const pdfDoc = res.body.documents.find(
        d => d.originalName === 'proposal_scanned.pdf'
      );

      expect(pdfDoc).toBeDefined();
      expect(pdfDoc.mimeType).toBe('application/pdf');

      const logs = await AuditLog.find({
        type: 'document_upload'
      });

      expect(logs.length).toBeGreaterThan(0);
    });

    it('should reject upload with 400 when file type is not allowed (e.g. .txt or .exe)', async () => {
      const invalidBuffer = Buffer.from(
        'console.log("disallowed script");'
      );

      const res = await request(app)
        .post(`/api/records/${testRecord._id}/documents`)
        .set('Authorization', `Bearer ${clerkToken}`)
        .attach('files', invalidBuffer, 'malicious_script.exe');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/invalid file type/i);
    });

    it('should reject unauthenticated upload requests with 401', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 dummy content');

      const res = await request(app)
        .post(`/api/records/${testRecord._id}/documents`)
        .attach('files', pdfBuffer, 'unauthorized_file.pdf');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/records/:id/documents (List)', () => {
    it('should list all uploaded documents for a record', async () => {
      const pdfBuffer = Buffer.from(
        '%PDF-1.4 test document'
      );

      await request(app)
        .post(`/api/records/${testRecord._id}/documents`)
        .set('Authorization', `Bearer ${clerkToken}`)
        .attach('files', pdfBuffer, 'meeting_minutes.pdf');

      const res = await request(app)
        .get(`/api/records/${testRecord._id}/documents`)
        .set('Authorization', `Bearer ${clerkToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].originalName).toBe('meeting_minutes.pdf');
    });
  });

  describe('GET /api/records/:id/documents/:docId/download (Download)', () => {
    it('should stream the file back for download when authenticated', async () => {
      const pdfBuffer = Buffer.from(
        '%PDF-1.4 stream download content'
      );

      const uploadRes = await request(app)
        .post(`/api/records/${testRecord._id}/documents`)
        .set('Authorization', `Bearer ${clerkToken}`)
        .attach('files', pdfBuffer, 'specifications.pdf');

      const docId = uploadRes.body.documents[0]._id;

      const res = await request(app)
        .get(
          `/api/records/${testRecord._id}/documents/${docId}/download`
        )
        .set('Authorization', `Bearer ${clerkToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition'])
        .toContain('specifications.pdf');

      expect(res.body.toString())
        .toContain('%PDF-1.4 stream download content');
    });
  });

  describe('DELETE /api/records/:id/documents/:docId (Delete authorization)', () => {
    let docId;

    beforeEach(async () => {
      const pdfBuffer = Buffer.from(
        '%PDF-1.4 test document for deletion'
      );

      const uploadRes = await request(app)
        .post(`/api/records/${testRecord._id}/documents`)
        .set('Authorization', `Bearer ${clerkToken}`)
        .attach('files', pdfBuffer, 'doc_to_delete.pdf');

      docId = uploadRes.body.documents[0]._id;
    });

    it('should reject document deletion by Clerk with 403 (no hard delete permission)', async () => {
      const res = await request(app)
        .delete(
          `/api/records/${testRecord._id}/documents/${docId}`
        )
        .set('Authorization', `Bearer ${clerkToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('should allow document deletion by Admin role with 200', async () => {
      const res = await request(app)
        .delete(
          `/api/records/${testRecord._id}/documents/${docId}`
        )
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted successfully/i);

      const remainingDocs = await RecordDocument.find({
        record_id: testRecord._id
      });

      expect(remainingDocs.length).toBe(0);

      const logs = await AuditLog.find({
        type: 'document_delete'
      });

      expect(logs.length).toBeGreaterThan(0);
    });

    it('should reject document deletion by Procurement role with 403 (Admin-only delete permission)', async () => {
      const res = await request(app)
        .delete(
          `/api/records/${testRecord._id}/documents/${docId}`
        )
        .set('Authorization', `Bearer ${procurementToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/not authorized/i);
    });
  });
});
