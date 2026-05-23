# AI Usage / Prompts Documentation

## Models Used

The primary AI model used during this assignment was:

```text
GPT-5.5 Thinking
```

An additional code review and automated fixes were performed using:

```text
Claude Code – claude-sonnet-4-6 (Anthropic)
```

## How AI Was Used

AI was used as a development assistant and reviewer during the IssueFlow backend assignment.

The work process was collaborative:

- I wrote and applied the project code in my local NestJS project.
- The AI assistant helped break the work into small implementation tasks.
- The AI assistant reviewed code snippets that I provided from my project.
- The AI assistant suggested corrections when build, test, or runtime errors appeared.
- I ran the commands locally, checked the results, and shared outputs for review.
- We used build results, test results, Git status, and manual API checks to validate each step.
- The final code was implemented, tested, and committed by me.

The AI did not independently submit or own the work. It was used as a guide, reviewer, and debugging assistant. I remained responsible for the code and verified that I understood the implementation.

## Development Workflow

The workflow was task-based.

For each feature:

1. I shared the relevant file or error output.
2. The AI assistant explained what needed to change.
3. The AI assistant gave me the next focused task.
4. I updated the code in my project.
5. I ran `npm run build` and `npm run test`.
6. I manually tested the API using PowerShell or `curl.exe`.
7. After the feature worked, I committed the changes to Git.

This helped keep the implementation incremental and reviewable.

## Main Areas Where AI Assisted

### Requirement Review

The AI helped review the requirements document and compare it against the current implementation.

Main gaps identified during review included:

- CSV import needed to use multipart/form-data.
- CSV export needed to include the `id` column.
- Soft-deleted tickets and projects needed ADMIN-only access.
- Logout needed to actually revoke the token.
- Mentions needed to be returned newest first.
- Workload response needed to use `openTicketCount`.
- Auto assignment needed to leave tickets unassigned if no developer exists.
- `run.md` and `prompts.md` were required for submission.

### Authentication

AI helped guide the implementation and testing of:

- JWT login
- Global JWT protection
- Public login route
- `/auth/me`
- Logout token revocation using an in-memory deny-list

Example prompt:

```text
Help me check if logout really invalidates the JWT token. Give me a simple PowerShell test.
```

### Audit Logs

AI helped review the audit log implementation and later identify that some audit records had empty `performedBy`.

Together we updated the controllers and services so that the authenticated user id is passed from the request into the audit log creation.

Example prompt:

```text
We need performedBy in audit logs to use the logged-in user from the JWT. Lead me file by file.
```

### Ticket Dependencies

AI helped guide the design and testing of ticket blockers:

- Add dependency
- List dependencies
- Remove dependency
- Prevent moving a blocked ticket to DONE while blockers are unresolved

Example prompt:

```text
Help me test ticket dependencies using PowerShell commands.
```

### Auto Assignment

AI helped guide the feature that assigns a ticket to the least-loaded developer when `assigneeId` is not provided.

The logic was manually tested by checking project workload before and after ticket creation.

Example prompt:

```text
Create a test flow that checks auto assignment by workload.
```

### Comment Mentions

AI helped review the comment mention mechanism:

- Extract `@username`
- Match users case-insensitively
- Persist mention metadata
- Recalculate mentions on comment update
- Return mentioned users in comment responses
- Return user mentions newest first

Example prompt:

```text
Check if the mentions feature matches the requirements and tell me what to fix.
```

### CSV Import and Export

AI helped guide the CSV implementation and later helped correct it to match the assignment requirements.

The final behavior:

- `GET /tickets/export?projectId={id}` returns CSV with:
  `id,title,description,status,priority,type,assigneeId`
- `POST /tickets/import` accepts `multipart/form-data`
- Import request includes:
  - `projectId`
  - `file`
- CSV parsing supports commas and quotes inside values.

Example prompt:

```text
The requirements say CSV import should be multipart/form-data. Fix our implementation to match that.
```

### Attachments

AI helped guide the implementation and manual testing of ticket attachments:

- Upload attachment
- List attachments
- Delete attachment
- Validate allowed file types
- Enforce max size of 10 MB

Example prompt:

```text
Give me the curl command to upload a text file as a ticket attachment.
```

### Auto Escalation

AI helped guide the auto escalation implementation and manual testing:

- Overdue tickets are escalated in priority.
- DONE tickets are ignored.
- CRITICAL tickets set `isOverdue`.
- The status field is not changed.
- System audit logs are created.

Example prompt:

```text
Help me test auto escalation with an overdue LOW priority ticket.
```

### Optimistic Locking

AI helped guide optimistic locking for tickets and comments:

- Added version columns.
- Update DTOs accept optional version.
- If the submitted version is old, the API returns `409 Conflict`.

Example prompt:

```text
Help me test that two updates with the same old version cause a 409 conflict.
```

### Admin-only Soft Delete Endpoints

AI helped identify that the soft-deleted list and restore endpoints needed to be restricted to ADMIN users.

Together we added checks and tested that a DEVELOPER receives `403 Forbidden`.

Example prompt:

```text
The requirements say deleted and restore endpoints are ADMIN only. Lead me through the minimal fix.
```

## Manual Testing

The AI helped generate PowerShell and `curl.exe` commands for manual testing.

Examples of tested flows:

- Login and use JWT token
- Logout and verify the token is revoked
- Create ticket
- Update ticket
- Trigger optimistic locking conflict
- Import CSV with multipart/form-data
- Export CSV
- Upload and delete attachment
- Add and remove ticket dependency
- Create and update comments with mentions
- Run auto escalation
- Verify ADMIN-only endpoints return 403 for DEVELOPER users

## Build and Test Validation

During the work, I repeatedly ran:

```bash
npm run build
npm run test
```

Build and test output was used to decide the next correction.

When errors appeared, I shared the exact output with the AI assistant and fixed the relevant code.

## Git Workflow

The work was committed incrementally after each completed feature.

Examples of commit topics:

- Audit logs
- Ticket dependencies
- Auto assignment and workload
- Comment mentions
- CSV export and import
- Ticket attachments
- Auto escalation
- Optimistic locking
- Real actor tracking in audit logs
- Requirements alignment fixes

## Code Review by Claude Code

After the initial implementation, the entire codebase was reviewed using **Claude Code (claude-sonnet-4-6)**.

Claude Code analyzed each source file against the requirements document and produced the following findings:

### Issues Found and Fixed

| # | Issue | Severity |
|---|-------|----------|
| 1 | Auto-escalation had no scheduler – only a manual HTTP endpoint | High |
| 2 | JWT secret was hardcoded (`'issueflow-secret-key'`) instead of reading from `JWT_SECRET` env var | High |
| 3 | Database credentials were hardcoded in `app.module.ts` instead of using env vars | High |
| 4 | `GET /users/:userId/mentions` was missing `page` / `pageSize` pagination | Medium |
| 5 | Model name in `prompts.md` was incorrect | Medium |
| 6 | `requireNumber` private method in `tickets.service.ts` was defined but never called (dead code) | Low |
| 7 | Token revocation is in-memory (cleared on server restart) | Low |

### Fixes Applied

- Added `@nestjs/schedule` and registered `ScheduleModule.forRoot()` in `app.module.ts`.
- Created `tickets.scheduler.ts` with an `@Cron(CronExpression.EVERY_HOUR)` job that calls `autoEscalateOverdueTickets` automatically.
- Updated `auth.module.ts` and `jwt.strategy.ts` to read the JWT secret from `process.env.JWT_SECRET`.
- Updated `app.module.ts` to read DB connection config from environment variables (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`).
- Added `page` and `pageSize` query parameters to `GET /users/:userId/mentions` with a default page size of 20.
- Removed the unused `requireNumber` private method from `tickets.service.ts`.
- Added notes to `run.md` about the token revocation limitation and auto-escalation schedule.

### Review Prompts (Claude Code Session)

```text
@requirements.pdf תעבור על הקוד בריפו ותוודא שאני עומד בהם, במידה ולא תעשה רשימה של כל דבר שדורש תיקון
```

```text
תתקן הכל, ואחרי זה תעדכן את הPROMPT.MD שהקוד עבר ביקורת של קלוד קוד
```

## Accountability Statement

AI was used as an assistant for planning, explanation, debugging, code review, and test guidance.

The implementation was done in my local project, tested by me, and committed by me.

I am responsible for the submitted code and understand the features that were implemented.
