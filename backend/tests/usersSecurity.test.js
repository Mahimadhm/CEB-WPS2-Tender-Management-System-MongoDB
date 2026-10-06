const request = require('supertest');

const {
  setupDatabase,
  createTestApp,
  generateTestToken
} = require('./setup');

const User = require('../src/models/User');

describe('User Management Security', () => {
  setupDatabase();
  const app = createTestApp();

  const adminEmail = 'security-admin@ceb.lk';
  const actingSuperAdminEmail = 'security-superadmin@ceb.lk';
  const normalUserEmail = 'security-clerk@ceb.lk';
  const superAdminEmail = 'protected-superadmin@ceb.lk';

  let adminToken;
  let superAdminToken;

  beforeEach(async () => {
    await User.deleteMany({
      email: {
        $in: [
          adminEmail,
          actingSuperAdminEmail,
          normalUserEmail,
          superAdminEmail,
          'new-superadmin@ceb.lk',
          'valid-user@ceb.lk'
        ]
      }
    });

    const adminUser = await User.create({
      name: 'Security Test Admin',
      email: adminEmail,
      epf_number: '91005',
      password: 'test-password-hash',
      role: 'Admin',
      status: 'Active'
    });

    const actingSuperAdmin = await User.create({
      name: 'Security Test Super Admin',
      email: actingSuperAdminEmail,
      epf_number: '91006',
      password: 'test-password-hash',
      role: 'Super Admin',
      status: 'Active'
    });

    adminToken = generateTestToken({
      id: adminUser._id.toString(),
      _id: adminUser._id.toString(),
      role: adminUser.role,
      email: adminUser.email
    });

    superAdminToken = generateTestToken({
      id: actingSuperAdmin._id.toString(),
      _id: actingSuperAdmin._id.toString(),
      role: actingSuperAdmin.role,
      email: actingSuperAdmin.email
    });

    await User.create({
      name: 'Security Clerk',
      email: normalUserEmail,
      epf_number: '91001',
      password: 'test-password-hash',
      role: 'Clerk',
      status: 'Active'
    });

    await User.create({
      name: 'Protected Super Admin',
      email: superAdminEmail,
      epf_number: '91002',
      password: 'test-password-hash',
      role: 'Super Admin',
      status: 'Active'
    });
  });

  afterEach(async () => {
    await User.deleteMany({
      email: {
        $in: [
          adminEmail,
          actingSuperAdminEmail,
          normalUserEmail,
          superAdminEmail,
          'new-superadmin@ceb.lk',
          'valid-user@ceb.lk'
        ]
      }
    });
  });

  it('should block Admin from creating a Super Admin', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Super Admin',
        email: 'new-superadmin@ceb.lk',
        epfNumber: '91003',
        password: 'SecurePassword123!',
        role: 'Super Admin',
        status: 'Active'
      });

    expect(res.status).toBe(403);

    const created = await User.findOne({
      email: 'new-superadmin@ceb.lk'
    });

    expect(created).toBeNull();
  });

  it('should block Admin from promoting a Clerk to Super Admin', async () => {
    const user = await User.findOne({
      email: normalUserEmail
    });

    const res = await request(app)
      .put(`/api/users/${user._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'Super Admin'
      });

    expect(res.status).toBe(403);

    const unchanged = await User.findById(user._id);
    expect(unchanged.role).toBe('Clerk');
  });

  it('should block Admin from modifying an existing Super Admin', async () => {
    const user = await User.findOne({
      email: superAdminEmail
    });

    const res = await request(app)
      .put(`/api/users/${user._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Changed By Admin'
      });

    expect(res.status).toBe(403);
  });

  it('should block Admin from deleting an existing Super Admin', async () => {
    const user = await User.findOne({
      email: superAdminEmail
    });

    const res = await request(app)
      .delete(`/api/users/${user._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);

    const stillExists = await User.findById(user._id);
    expect(stillExists).not.toBeNull();
  });

  it('should allow Super Admin to promote a Clerk to Super Admin', async () => {
    const user = await User.findOne({
      email: normalUserEmail
    });

    const res = await request(app)
      .put(`/api/users/${user._id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        role: 'Super Admin'
      });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('Super Admin');
  });

  it('should reject an invalid role', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Invalid Role User',
        email: 'valid-user@ceb.lk',
        epfNumber: '91004',
        password: 'SecurePassword123!',
        role: 'Root',
        status: 'Active'
      });

    expect(res.status).toBe(400);
  });

  it('should reject an invalid account status', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Invalid Status User',
        email: 'valid-user@ceb.lk',
        epfNumber: '91004',
        password: 'SecurePassword123!',
        role: 'Clerk',
        status: 'Suspended'
      });

    expect(res.status).toBe(400);
  });
});
