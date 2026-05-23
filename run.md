# IssueFlow - Run Instructions

## Project

IssueFlow is a RESTful backend API for a ticket management platform.

Technology stack:

- TypeScript
- NestJS
- TypeORM
- PostgreSQL
- Docker Compose
- JWT authentication

## Prerequisites

Before running the project, make sure the following are installed:

- Node.js
- npm
- Docker Desktop

## Install Dependencies

From the project root directory, run:

```bash
npm install
```

## Start PostgreSQL Database

The project includes a `compose.yml` file with a PostgreSQL service.

Start the database with:

```bash
docker compose -f compose.yml up -d
```

The database configuration used by the compose file is:

```text
POSTGRES_USER=issueflow
POSTGRES_PASSWORD=issueflow
POSTGRES_DB=issueflow
PORT=5432
```

## Environment Variables

Create a `.env` file in the project root if it does not already exist.

Example:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=issueflow
DB_PASSWORD=issueflow
DB_DATABASE=issueflow
JWT_SECRET=issueflow-secret
JWT_EXPIRES_IN=3600s
```

If the skeleton already includes another expected `.env` format, use the same variable names that are used in the project source code.

## Build the Project

```bash
npm run build
```

## Run the Application in Development Mode

```bash
npm run start:dev
```

The API will run on:

```text
http://localhost:3000
```

## Run the Application in Production Mode

First build the project:

```bash
npm run build
```

Then run:

```bash
npm run start:prod
```

## Run Tests

```bash
npm run test
```

Optional coverage command:

```bash
npm run test:cov
```

## Main API Areas

The backend includes:

- Authentication
- User management
- Project management
- Ticket management
- Comment management
- Audit logs
- Ticket dependencies
- Attachments
- CSV import/export
- Soft delete and restore
- Comment mentions
- Auto assignment
- Auto escalation
- Optimistic locking

## Authentication Flow

Login:

```http
POST /auth/login
```

Body example:

```json
{
  "username": "safeuser",
  "password": "secret123"
}
```

The response contains a JWT access token.

Use the token in protected requests:

```text
Authorization: Bearer <accessToken>
```

Logout:

```http
POST /auth/logout
```

The token is revoked after logout.

Current user:

```http
GET /auth/me
```

## CSV Export

Export tickets for a project:

```http
GET /tickets/export?projectId=2
```

The response is a CSV file with the following columns:

```text
id,title,description,status,priority,type,assigneeId
```

## CSV Import

Import tickets using multipart form-data:

```http
POST /tickets/import
```

Required form fields:

```text
projectId
file
```

Example with curl:

```bash
curl -X POST "http://localhost:3000/tickets/import" \
  -H "Authorization: Bearer <accessToken>" \
  -F "projectId=2" \
  -F "file=@tickets-import.csv;type=text/csv"
```

CSV example:

```csv
title,description,status,priority,type,assigneeId,dueDate
Imported ticket,"Description with comma, and quotes",TODO,MEDIUM,FEATURE,,2026-07-01T00:00:00Z
```

## Attachments

Upload attachment to a ticket:

```http
POST /tickets/:ticketId/attachments
```

Required form field:

```text
file
```

Allowed file types:

```text
image/png
image/jpeg
application/pdf
text/plain
```

Maximum file size:

```text
10 MB
```

Example:

```bash
curl -X POST "http://localhost:3000/tickets/8/attachments" \
  -H "Authorization: Bearer <accessToken>" \
  -F "file=@test-attachment.txt"
```

## Soft Delete Admin Endpoints

The following endpoints are restricted to ADMIN users:

```http
GET /tickets/deleted
POST /tickets/:ticketId/restore
GET /projects/deleted
POST /projects/:projectId/restore
```

## Notes

The project uses TypeORM with PostgreSQL.

If the database schema changes during development and TypeORM synchronization is enabled, restart the application after pulling or applying code changes.

Uploaded ticket attachments are stored under:

```text
uploads/ticket-attachments
```

### Token Revocation

Revoked JWT tokens are stored in an in-memory `Set` inside the `AuthService`. This means revoked tokens are cleared when the server restarts. For production use, the deny-list should be persisted (e.g., in Redis or the database).

### Auto-Escalation Schedule

The auto-escalation job runs automatically every hour via a cron scheduler (`@nestjs/schedule`). It escalates the priority of non-DONE overdue tickets and sets the `isOverdue` flag on CRITICAL tickets. The job can also be triggered manually via `POST /tickets/auto-escalate`.
