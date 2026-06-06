# Feature Specification: Week 1 — Authentication & User Accounts

**Feature Branch**: `001-auth-user-accounts`

**Created**: 2026-06-06

**Status**: Draft

**Input**: User description: "Week 1 — Auth and user accounts as defined in the constitution."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Faculty Logs In via Telegram OTP (Priority: P1)

A faculty member opens the system and enters their registered Telegram username or phone number. They receive a one-time password in their Telegram app, enter it into the login screen, and gain access to the faculty dashboard.

**Why this priority**: Authentication is the gateway to all other system features. Without a working login, nothing else can be tested or used. This is the single most critical P1 deliverable of Week 1.

**Independent Test**: Can be fully tested by attempting to log in with a valid Telegram account. Delivers a working authenticated session with a faculty-scoped dashboard view.

**Acceptance Scenarios**:

1. **Given** a registered faculty user, **When** they request an OTP, **Then** they receive a one-time code in Telegram within 30 seconds.
2. **Given** a valid OTP, **When** the user submits it within 5 minutes of generation, **Then** they are authenticated and redirected to their dashboard.
3. **Given** an expired OTP (older than 5 minutes), **When** the user submits it, **Then** the system rejects it with a clear expiry message and prompts them to request a new one.
4. **Given** a user who has failed OTP entry 5 times, **When** they attempt again, **Then** the account is locked and they cannot request a new OTP until an Admin resets their session.
5. **Given** an authenticated user, **When** they close the browser and return, **Then** their session persists without re-authentication (within JWT validity window).

---

### User Story 2 — Admin Creates and Manages User Accounts (Priority: P2)

An Admin user creates new accounts for faculty, coordinators, and other admins. They can deactivate accounts that are no longer active and view all accounts in the system.

**Why this priority**: Without user accounts, faculty cannot be registered to log in. Admin account management is prerequisite to all role-based access in Phase 1.

**Independent Test**: Can be fully tested by logging in as Admin, creating a new Faculty account, and verifying that the new faculty user can subsequently log in.

**Acceptance Scenarios**:

1. **Given** a logged-in Admin, **When** they create a new user with a role (Faculty, Coordinator, Admin), **Then** the account is created and the new user can log in via Telegram OTP.
2. **Given** a logged-in Admin, **When** they deactivate a user account, **Then** that user can no longer authenticate until reactivated.
3. **Given** a logged-in Admin, **When** they view the user list, **Then** all active and deactivated accounts are listed with their roles and status.
4. **Given** a logged-in Admin, **When** they attempt to create a user with a duplicate Telegram identity, **Then** the system rejects the request with a clear duplicate error.

---

### User Story 3 — Super Admin Resets a Locked User Session (Priority: P3)

A Super Admin can unlock any user account that has been locked due to failed OTP attempts, restoring their ability to log in.

**Why this priority**: Without session reset, a locked-out faculty member cannot be recovered without database intervention. This is critical for operational continuity but depends on P1 and P2 being functional first.

**Independent Test**: Can be fully tested by locking a test account via 5 failed OTPs, then having Super Admin reset it and verifying the user can log in again.

**Acceptance Scenarios**:

1. **Given** a locked user account, **When** Super Admin resets their session, **Then** the user can immediately request a new OTP and log in.
2. **Given** a Super Admin, **When** they reset a session, **Then** an audit log entry is created recording who reset whose session and when.
3. **Given** a non-Super Admin user (Admin or Faculty), **When** they attempt to access session reset functionality, **Then** the system denies access.

---

### User Story 4 — Role-Based Access Control Enforced on All Routes (Priority: P2)

Every user, once authenticated, can only access screens and actions permitted for their role. Accessing a route outside their role results in a clear denial — not a crash or blank screen.

**Why this priority**: Role boundaries prevent data leakage and ensure system integrity. Without enforced RBAC, any logged-in user could access any feature.

**Independent Test**: Can be fully tested by logging in as a Faculty user and attempting to access an Admin-only page or action, verifying denial.

**Acceptance Scenarios**:

1. **Given** a Faculty user, **When** they attempt to access Admin or Coordinator functions, **Then** they receive a clear "access denied" response.
2. **Given** an unauthenticated user, **When** they attempt to access any protected page, **Then** they are redirected to the login screen.
4. **Given** any authenticated user, **When** their session JWT expires, **Then** they are automatically redirected to login on their next action.

---

### Edge Cases

- What happens when a user requests OTP but has no active Telegram account?
- How does the system handle OTP requests sent in rapid succession (rate limiting)?
- What happens if Telegram Bot API is temporarily unreachable when an OTP is requested?
- What if an Admin tries to deactivate their own account?
- What if the only Super Admin account is locked?

---

## Requirements *(mandatory)*

### Functional Requirements

**Authentication**

- **FR-001**: System MUST provide an OTP request flow where users identify themselves by their registered Telegram handle.
- **FR-002**: System MUST deliver the OTP exclusively via Telegram Bot — no email, SMS, or alternative delivery.
- **FR-003**: System MUST expire OTPs after exactly 5 minutes from generation.
- **FR-004**: System MUST lock a user account after 5 consecutive failed OTP attempts.
- **FR-005**: System MUST issue an authenticated session token stored in an httpOnly cookie upon successful OTP verification — never in browser storage.
- **FR-006**: System MUST enforce authentication on all routes except the OTP request and OTP verification endpoints.
- **FR-007**: System MUST automatically invalidate and redirect the user to login when their session token expires.

**User Accounts**

- **FR-008**: System MUST support exactly 3 roles: Super Admin, Admin, Faculty.
- **FR-009**: Admin MUST be able to create new user accounts and assign one of the 4 roles.
- **FR-010**: Admin MUST be able to deactivate user accounts. Deactivated users cannot authenticate.
- **FR-011**: Admin MUST be able to view a list of all user accounts with their roles and active/deactivated status.
- **FR-012**: Super Admin MUST be able to reset any user's locked session, restoring their ability to log in.
- **FR-013**: System MUST prevent duplicate user accounts based on Telegram identity.
- **FR-014**: System MUST enforce role-based access — each role can only access the actions and data permitted to them as defined in the project constitution.
- **FR-015**: System MUST log every session reset action in the audit log, recording the actor, the target user, and the timestamp.

### Key Entities

- **User**: Represents any system participant. Has a role (Super Admin / Admin / Coordinator / Faculty), Telegram identity, active/deactivated status, and timestamps.
- **OTP Session**: Represents a pending login attempt. Linked to a user, holds a hashed OTP value, expiry time, and failed-attempt count.
- **Audit Log**: Immutable record of sensitive system actions (session resets, account changes), recording actor, action type, target, and timestamp.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can complete the full login flow (request OTP → receive Telegram message → enter code → reach dashboard) in under 60 seconds under normal conditions.
- **SC-002**: An OTP that has expired is rejected 100% of the time with no authenticated session created.
- **SC-003**: After 5 failed OTP attempts, the account is locked and remains inaccessible until explicitly reset by Super Admin — no bypass path exists.
- **SC-004**: All 4 roles are independently accessible, and each role's access boundaries are enforced with zero cross-role data or action leakage.
- **SC-005**: Admin can create, deactivate, and list user accounts within 3 clicks from their dashboard.
- **SC-006**: 100% of protected routes reject unauthenticated requests — no unprotected route exists except OTP request and OTP verification.
- **SC-007**: Every session reset by Super Admin appears in the audit log within the same request cycle — no reset goes unlogged.

---

## Assumptions

- All users have an active Telegram account and have started the SIMS Telegram Bot before their first login attempt.
- The Telegram Bot is operational and able to deliver messages; graceful error messaging is shown if it is unreachable, but no fallback delivery method is provided.
- The first Super Admin account is seeded directly into the system (via a setup script or database seed) — there is no self-registration flow.
- Users do not share Telegram accounts — one Telegram identity maps to exactly one system user.
- Session token validity is 7 days, as configured in the environment. This is not user-configurable.
- Mobile responsiveness is required (PWA), but native mobile app builds are out of scope for Week 1.
- All user management (create, deactivate) is done through the Admin interface — there is no bulk import for users (only students use Excel import).
