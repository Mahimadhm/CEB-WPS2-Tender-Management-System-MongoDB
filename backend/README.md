# Tender Management System - Backend

Node.js + Express + MongoDB backend for the CEB Tender Management System.

The backend uses MongoDB for application data and local filesystem storage for tender documents.

## Requirements

- Node.js
- npm
- MongoDB

MongoDB must be running before starting the backend.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Configure `PORT`, `JWT_SECRET`, `CORS_ORIGIN`, `FRONTEND_URL`, `RESEND_API_KEY`, and `MONGODB_URI`.
4. Start development mode with `npm run dev`.
5. Seed demo data if required with `npm run seed`.

The local API runs at `http://localhost:5010`.

## MongoDB

Local development database: `ceb_tms`

Default connection:

    mongodb://127.0.0.1:27017/ceb_tms

Application data is managed through Mongoose models.

The old PostgreSQL migration files under `migrations/` are retained only as legacy schema reference and are not required for the MongoDB setup.

## Document Storage

Tender documents are stored locally under:

    backend/uploads/tender-documents/

Document metadata is stored in MongoDB.

Documents should be accessed through the authenticated API rather than exposing the upload directory publicly.

## Authentication & Security

- JWT login tokens expire after 8 hours.
- Authentication endpoints are rate-limited.
- HTTP security headers are enabled using Helmet.
- CORS is restricted using `CORS_ORIGIN`.
- MongoDB should not be exposed directly to client computers.
- Production MongoDB should use authentication, firewall restrictions, and backups.

## API

Base path: `/api`

Main APIs include authentication, users, categories, departments, staff, bidders, committees, records, documents, Excel import, audit logs, and notification logs.

## Testing

Run automated tests with `npm test`.

Automated tests use the separate MongoDB database:

    mongodb://127.0.0.1:27017/ceb_tms_test

## Production Notes

For deployment on the CEB internal network:

- Run the Node/Express backend on the application server.
- Run MongoDB on the server or another protected internal database server.
- Client PCs communicate with the backend API only.
- Do not expose MongoDB directly to client PCs.
- Enable MongoDB authentication and firewall rules.
- Back up both MongoDB data and uploaded tender documents.
- Configure `FRONTEND_URL` and `CORS_ORIGIN` for the production LAN address.
- Email notifications currently depend on the configured email service and may require internet access.
