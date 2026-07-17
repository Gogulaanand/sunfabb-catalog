// Load .env before any NestJS module initializes — required for e2e tests
// because jest-e2e doesn't go through main.ts (which has `import 'dotenv/config'`).
// This fixes JWT_SECRET / CUSTOMER_JWT_SECRET / etc. being unset at module init.
import 'dotenv/config';
