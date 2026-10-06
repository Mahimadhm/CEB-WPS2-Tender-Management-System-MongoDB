const request = require('supertest');
const {
  setupDatabase,
  createTestApp,
  generateTestToken
} = require('./setup');

const Category = require('../src/models/Category');
const User = require('../src/models/User');

describe('Categories Endpoints', () => {
  setupDatabase();

  const app = createTestApp();

  const adminEmail = 'categories-admin@ceb.lk';
  let adminToken;

  const newCategory = {
    name: 'High Voltage Cables',
    description: 'Underground and aerial transmission cables',
    status: 'Active'
  };

  beforeEach(async () => {
    await Category.deleteMany({
      name: newCategory.name
    });

    await User.deleteMany({
      email: adminEmail
    });

    const adminUser = await User.create({
      name: 'Categories Test Admin',
      email: adminEmail,
      epf_number: 'CAT001',
      password: 'test-password-hash',
      role: 'Admin',
      status: 'Active'
    });

    adminToken = generateTestToken({
      id: adminUser._id.toString(),
      _id: adminUser._id.toString(),
      role: adminUser.role,
      email: adminUser.email
    });
  });

  afterEach(async () => {
    await Category.deleteMany({
      name: newCategory.name
    });

    await User.deleteMany({
      email: adminEmail
    });
  });

  describe('POST /api/categories', () => {
    it('should create a category successfully when authenticated with valid data', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newCategory);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.name).toBe(newCategory.name);
      expect(res.body.description).toBe(newCategory.description);
    });

    it('should return 400 when missing the required name field', async () => {
      const invalidCategory = {
        description: 'Category missing its mandatory name',
        status: 'Active'
      };

      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidCategory);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/name/i);
    });
  });
});
