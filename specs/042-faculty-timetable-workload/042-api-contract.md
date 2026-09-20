# Spec 042 — REST API Contract

Status: **proposed contract**  
Base path: existing SIMSDMS `/api` prefix  
Authentication: existing JWT httpOnly cookie  
Mutation protection: existing CSRF cookie/header contract

## 1. Conventions

- All endpoints use JSON.
- All routes require `authenticate`.
- Role restrictions use the existing `authorize(...)` middleware.
- Query, params and body inputs use Zod schemas through the existing `validate` middleware.
- Successful lists follow the repository pattern: `{ "data": [...], "total": n }`.
- Successful single-resource responses use `{ "data": {...} }`.
- Errors follow the repository pattern:

```json
{
  "error": true,
  "code": "TIMETABLE_CONFLICT",
  "message": "This classroom is already in use during the selected time.",
  "details": {
    "resource_type": "location",
    "occurrence_date": "2026-09-23"
  }
}
```

Do not expose another faculty member's private schedule details to an unauthorized caller.

## 2. Academic read APIs

These support dependent fields and return active records only unless an authorized Admin explicitly requests inactive items.

| Method | Endpoint | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/academics/programmes` | Authenticated | Active B.Pharm/Pharm.D programmes |
| GET | `/academics/year-levels?programme_id=` | Authenticated | Years for programme |
| GET | `/academics/semesters?year_level_id=` | Authenticated | B.Pharm semesters; empty for Pharm.D |
| GET | `/academics/sections?year_level_id=&semester_id=` | Authenticated | Matching active sections |
| GET | `/academics/batches?section_id=` | Authenticated | Active section batches |
| GET | `/academics/locations` | Authenticated | Active locations |
| GET | `/academics/my-subjects?programme_id=&year_level_id=&semester_id=` | Faculty | Subjects eligible for current faculty |
| GET | `/academics/subjects/:id/activities` | Faculty/Admin/Super Admin | Permitted activities |
| GET | `/academics/faculty` | Admin/Super Admin | Active faculty filter list |

Faculty subject queries derive `faculty_id` from the session.

## 3. Academic master mutations

Admin/Super Admin only. CRUD is soft-deactivation where referenced history exists.

| Resource path | Supported methods |
| --- | --- |
| `/academics/departments` | GET, POST; `/:id` GET, PATCH, DELETE(deactivate) |
| `/academics/programmes` | GET, POST; `/:id` GET, PATCH, DELETE(deactivate) |
| `/academics/year-levels` | GET, POST; `/:id` GET, PATCH, DELETE(deactivate) |
| `/academics/semesters` | GET, POST; `/:id` GET, PATCH, DELETE(deactivate) |
| `/academics/sections` | GET, POST; `/:id` GET, PATCH, DELETE(deactivate) |
| `/academics/batches` | GET, POST; `/:id` GET, PATCH, DELETE(deactivate) |
| `/academics/subjects` | GET, POST; `/:id` GET, PATCH, DELETE(deactivate) |
| `/academics/subjects/:id/activities` | PUT permitted activity set |
| `/academics/locations` | GET, POST; `/:id` GET, PATCH, DELETE(deactivate) |
| `/academics/faculty-subjects` | GET, POST; `/:id` DELETE(deactivate) |
| `/academics/exclusions` | GET, POST; `/:id` GET, PATCH, DELETE(deactivate) |

Master changes already used by historical versions do not rewrite those snapshots. Deactivation blocks new selections.

## 4. Faculty timetable APIs

### 4.1 List resolved occurrences

`GET /timetable/mine?from=2026-09-21&to=2026-09-26&include_cancelled=false`

Role: Faculty.

Rules:

- maximum range 8 weeks;
- data scoped to `req.user.id`;
- sorted by occurrence date and start time;
- returns resolved occurrence snapshots, not raw versions.

Example item:

```json
{
  "series_id": "uuid",
  "version_id": "uuid",
  "override_id": null,
  "occurrence_date": "2026-09-23",
  "activity_type": "practical",
  "subject": { "id": "uuid", "code": "BP401T", "name": "Pharmacology" },
  "programme": { "id": "uuid", "code": "b_pharm", "name": "B.Pharm" },
  "year": { "id": "uuid", "number": 2, "label": "Second Year" },
  "semester": { "id": "uuid", "number": 4, "label": "Semester IV" },
  "section": { "id": "uuid", "name": "A" },
  "batch": { "id": "uuid", "name": "Batch 1" },
  "location": { "id": "uuid", "name": "Pharmacology Lab" },
  "start_time": "10:00",
  "end_time": "12:00",
  "duration_minutes": 120,
  "status": "upcoming",
  "is_overridden": false
}
```

### 4.2 Create recurring class

`POST /timetable`

Role: Faculty only.

```json
{
  "programme_id": "uuid",
  "year_level_id": "uuid",
  "semester_id": "uuid",
  "section_id": "uuid",
  "subject_id": "uuid",
  "activity_type": "practical",
  "batch_id": "uuid",
  "internship_duty_name": null,
  "day_of_week": "wednesday",
  "start_time": "10:00",
  "end_time": "12:00",
  "location_id": "uuid",
  "effective_from": "2026-09-23"
}
```

The API ignores/rejects any `faculty_id` property. Response: `201` with created series/version and the first resolved occurrence.

### 4.3 Get series detail/history

- `GET /timetable/:seriesId` — Faculty owner; Admin/Super Admin read-only.
- `GET /timetable/:seriesId/history` — Faculty owner; Admin/Super Admin read-only.

### 4.4 Edit one occurrence

`PATCH /timetable/:seriesId`

Role: Faculty owner only.

```json
{
  "scope": "occurrence",
  "occurrence_date": "2026-09-23",
  "changes": {
    "start_time": "11:00",
    "end_time": "13:00",
    "location_id": "uuid"
  },
  "reason": "Laboratory maintenance"
}
```

The server resolves a complete replacement snapshot, validates it and stores one modified override.

### 4.5 Edit all future occurrences

Same endpoint, with:

```json
{
  "scope": "future",
  "occurrence_date": "2026-10-07",
  "changes": {
    "day_of_week": "thursday",
    "start_time": "09:00",
    "end_time": "11:00"
  },
  "reason": "Department timetable revision"
}
```

The server ends the current version and creates a new one transactionally.

### 4.6 Cancel Today

`POST /timetable/:seriesId/cancellations`

Role: Faculty owner only.

```json
{
  "occurrence_date": "2026-09-23",
  "reason": "College event"
}
```

Response `201`. Repeating the identical cancellation may return the existing cancellation idempotently; a conflicting existing modified override returns `409 OVERRIDE_ALREADY_EXISTS` unless the product UI explicitly converts it.

### 4.7 Delete Schedule

`DELETE /timetable/:seriesId`

Role: Faculty owner only. Body is avoided on DELETE; use query parameters:

`DELETE /timetable/:seriesId?effective_from=2026-11-04&reason=Subject%20completed`

The operation ends future recurrence and returns `200` with the final effective date. It never physically deletes historical rows.

## 5. Administrator timetable API

`GET /timetable/admin?from=&to=&faculty_id=&programme_id=&year_level_id=&semester_id=&section_id=&activity_type=&page=&limit=`

Roles: Admin/Super Admin. Read-only. Maximum 8-week range.

No administrator route exists for timetable create/edit/cancel/delete.

## 6. Workload APIs

### 6.1 Faculty workload

`GET /workload/mine?from=2026-09-01&to=2026-09-30&group_by=activity`

Role: Faculty. Maximum 366 days.

```json
{
  "data": {
    "from": "2026-09-01",
    "to": "2026-09-30",
    "total_minutes": 1860,
    "completed_minutes": 1320,
    "scheduled_minutes": 540,
    "breakdown": [
      { "key": "theory", "label": "Theory", "minutes": 720 },
      { "key": "practical", "label": "Practical", "minutes": 1140 }
    ],
    "disclaimer": "Schedule-based workload; this does not verify attendance or class delivery."
  }
}
```

`GET /workload/mine/occurrences?from=&to=&status=&activity_type=&page=&limit=` returns paginated details.

### 6.2 Administrator workload

- `GET /workload/admin/summary?from=&to=&faculty_id=&programme_id=&activity_type=`
- `GET /workload/admin/occurrences?from=&to=&faculty_id=&...&page=&limit=`

Roles: Admin/Super Admin. Read-only.

## 7. Validation matrix

| Rule | HTTP response |
| --- | --- |
| Invalid/missing input | `400 VALIDATION_ERROR` |
| Invalid academic hierarchy | `400 ACADEMIC_HIERARCHY_INVALID` |
| Subject not eligible for faculty | `403 SUBJECT_NOT_ALLOCATED` |
| Subject does not permit activity | `400 ACTIVITY_NOT_PERMITTED` |
| Batch missing/extra/wrong section | `400 BATCH_RULE_INVALID` |
| Semester invalid for programme | `400 SEMESTER_RULE_INVALID` |
| Internship rule invalid | `400 INTERNSHIP_RULE_INVALID` |
| End not after start | `400 TIME_RANGE_INVALID` |
| Sunday/invalid weekday | `400 DAY_NOT_ALLOWED` |
| Not authenticated | existing `401` contract |
| Wrong role/ownership | existing `403` contract |
| Resource not found within authorized scope | `404 NOT_FOUND` |
| Faculty/batch/section/location overlap | `409 TIMETABLE_CONFLICT` |
| Existing date override conflict | `409 OVERRIDE_ALREADY_EXISTS` |
| Concurrent serialization retries exhausted | `409 TIMETABLE_CONCURRENT_UPDATE` |
| Date range too large | `400 DATE_RANGE_TOO_LARGE` |

## 8. Conflict response details

`details.resource_type` is one of:

- `faculty`
- `location`
- `batch`
- `whole_section`

For the faculty owner, the response may include their conflicting series ID and occurrence summary. For an overlap caused by another faculty/resource, return only the minimum useful information: occurrence date, time and resource label the caller is authorized to see.

## 9. Idempotency and concurrency

- UI disables repeat submission while a mutation is pending.
- The server transaction remains authoritative.
- Optional `Idempotency-Key` support may be added for POST create/cancel if the existing API gains a general middleware; it is not a substitute for conflict locks.
- Version edits should accept an `expected_updated_at` or version token so a stale open form returns `409 STALE_TIMETABLE_VERSION` rather than overwriting a newer faculty edit.

## 10. OpenAPI/testing artifact

During implementation, mirror this contract in route-level tests. Adding a separate OpenAPI dependency is optional and must not block the first slice. The Markdown contract remains the planning authority until code/tests are approved.

