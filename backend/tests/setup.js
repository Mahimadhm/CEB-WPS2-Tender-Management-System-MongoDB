require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

process.env.JWT_SECRET =
  process.env.JWT_SECRET ||
  'test_jwt_secret_for_automated_testing_12345';


if (!process.env.MONGODB_TEST_URI) {
  throw new Error('MONGODB_TEST_URI is required for automated tests');
}

process.env.MONGODB_URI = process.env.MONGODB_TEST_URI;

if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}

const setupDatabase = () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });
};

const createTestApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  const apiRouter = require('../src/routes');
  const errorHandler = require('../src/middleware/errorHandler');

  app.use('/api', apiRouter);
  app.use(errorHandler);

  return app;
};

const generateTestToken = (payload = {}) => {
  const defaultPayload = {
    id: new mongoose.Types.ObjectId().toString(),
    email: 'admin@ceb.lk',
    epfNumber: '10001',
    role: 'Admin',
    ...payload
  };

  return jwt.sign(
    defaultPayload,
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

module.exports = {
  setupDatabase,
  createTestApp,
  generateTestToken
};
