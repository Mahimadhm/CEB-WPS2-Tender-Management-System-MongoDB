const request = require('supertest');

const {
  setupDatabase,
  createTestApp,
  generateTestToken
} = require('./setup');

const User = require('../src/models/User');

describe('Role Authorization', () => {
  setupDatabase();

  const app = createTestApp();

  const testEmails = [
    'authorization-admin@ceb.lk',
    'authorization-superadmin@ceb.lk',
    'authorization-clerk@ceb.lk',
    'authorization-procurement@ceb.lk'
  ];

  beforeEach(async () => {
    await User.deleteMany({
      email: { $in: testEmails }
    });

    await User.insertMany([
      {
        name: 'Authorization Test Admin',
        email: 'authorization-admin@ceb.lk',
        epf_number: 'AUTH001',
        password: 'test-password-hash',
        role: 'Admin',
        status: 'Active'
      },
      {
        name: 'Authorization Test Super Admin',
        email: 'authorization-superadmin@ceb.lk',
        epf_number: 'AUTH002',
        password: 'test-password-hash',
        role: 'Super Admin',
        status: 'Active'
      },
      {
        name: 'Authorization Test Clerk',
        email: 'authorization-clerk@ceb.lk',
        epf_number: 'AUTH003',
        password: 'test-password-hash',
        role: 'Clerk',
        status: 'Active'
      },
      {
        name: 'Authorization Test Procurement',
        email: 'authorization-procurement@ceb.lk',
        epf_number: 'AUTH004',
        password: 'test-password-hash',
        role: 'Procurement',
        status: 'Active'
      }
    ]);
  });

  afterEach(async () => {
    await User.deleteMany({
      email: { $in: testEmails }
    });
  });

  const tokenFor = (user) =>
    generateTestToken({
      id: user._id.toString(),
      _id: user._id.toString(),
      role: user.role,
      email: user.email
    });

  describe('GET /api/users (Admin-only endpoint)', () => {
    it('should reject access with 403 when authenticated as Clerk', async () => {
      const user = await User.findOne({
        email: 'authorization-clerk@ceb.lk'
      });

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${tokenFor(user)}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('should reject access with 403 when authenticated as Procurement', async () => {
      const user = await User.findOne({
        email: 'authorization-procurement@ceb.lk'
      });

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${tokenFor(user)}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('should allow access with 200 when authenticated as Admin', async () => {
      const user = await User.findOne({
        email: 'authorization-admin@ceb.lk'
      });

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${tokenFor(user)}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should allow access with 200 when authenticated as Super Admin', async () => {
      const user = await User.findOne({
        email: 'authorization-superadmin@ceb.lk'
      });

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${tokenFor(user)}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should immediately reject an existing JWT after the user becomes inactive', async () => {
      const user = await User.findOne({
        email: 'authorization-admin@ceb.lk'
      });

      const token = tokenFor(user);

      await User.updateOne(
        { _id: user._id },
        { $set: { status: 'Inactive' } }
      );

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/inactive/i);
    });

    it('should use the current database role instead of the stale role inside the JWT', async () => {
      const user = await User.findOne({
        email: 'authorization-admin@ceb.lk'
      });

      // Token is issued while the user is still an Admin.
      const token = tokenFor(user);

      // Administrator changes the account role afterwards.
      await User.updateOne(
        { _id: user._id },
        { $set: { role: 'Clerk' } }
      );

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);
    });
  });
});
