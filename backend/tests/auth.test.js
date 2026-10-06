const request = require('supertest');
const bcrypt = require('bcryptjs');
const { setupDatabase, createTestApp } = require('./setup');
const User = require('../src/models/User');

describe('Auth Endpoints', () => {
  setupDatabase();
  const app = createTestApp();

  const validUser = {
    name: 'Test Engineer',
    email: 'engineer@ceb.lk',
    epfNumber: '12345',
    password: 'SecurePassword123!',
    role: 'Admin'
  };

  beforeEach(async () => {
    await User.deleteMany({
      $or: [
        { email: validUser.email },
        { epf_number: validUser.epfNumber }
      ]
    });
  });


  describe('POST /api/auth/register (Removed)', () => {
    it('should return 404 as public register endpoint is removed for security', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const hash = bcrypt.hashSync(validUser.password, 10);

      await User.create({
        name: validUser.name,
        email: validUser.email,
        epf_number: validUser.epfNumber,
        password: hash,
        role: validUser.role,
        status: 'Active'
      });
    });

    it('should login successfully with valid credentials and return a JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(validUser.email);
    });

    it('should block login for an inactive user', async () => {
      await User.updateOne(
        { email: validUser.email },
        { $set: { status: 'Inactive' } }
      );

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password
        });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/inactive/i);
    });

    it('should fail with 401 when logging in with a wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: 'IncorrectPassword123'
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/invalid/i);
    });
  });
});
