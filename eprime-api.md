# ePRIME (PRIME-HRM) — API Map

> Mapped 2026-09-05 against `https://eprime.kerisoftware.com` (DepEd-Bayugan City Division, developed by KERI Software).
> **Bottom line: the site HAS an API.** It's a Next.js frontend backed by **Supabase** (PostgREST). No scraping needed.

---

## 1. Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js (App Router, Turbopack), React, Tailwind |
| Auth | Supabase Auth (email/password) |
| Database / API | Supabase Postgres via PostgREST (`/rest/v1/*`) |
| Real-time | Supabase Realtime (WebSocket) |
| File storage | Supabase Storage (buckets not exposed to clients) |

The anon key is embedded in the public JS bundles (normal for Supabase client-side apps).
The **OpenAPI schema endpoint** (`/rest/v1/` with `Accept: application/openapi+json`) is locked to the `service_role` key, so the schema was mapped by reading the client bundles + probing the live API instead.

## 2. Auth

Login is Supabase Auth, called directly from the browser. Exchange email/password for a JWT:

```bash
curl -s -X POST "https://nuhirhfevxoonendpfsm.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: <ANON_KEY>" -H "Content-Type: application/json" \
  -d '{"email":"you@deped.gov.ph","password":"..."}'
```

Response: `access_token`, `refresh_token`, `expires_at`, `user`.
Refresh a session: `POST /auth/v1/token?grant_type=refresh_token` with `{"refresh_token": "..."}`.

The app stores the session client-side and sends the `access_token` as `Authorization: Bearer <token>` on data requests.

### Key: `<ANON_KEY>` (public — shipped in the browser bundle)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51aGlyaGZldnhvb25lbmRwZnNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzcxNDMwOTksImV4cCI6MTk5MjcxOTA5OX0.F24Rc0tD5pM3g-8jNjlkUBR4EmB0d_PxvqWMNW8wn3Q
```

## 3. Base URLs

| Service | URL |
|---|---|
| REST (PostgREST) | `https://nuhirhfevxoonendpfsm.supabase.co/rest/v1` |
| Auth | `https://nuhirhfevxoonendpfsm.supabase.co/auth/v1` |
| Realtime | `wss://nuhirhfevxoonendpfsm.supabase.co/realtime/v1/websocket?apikey=<ANON_KEY>&vsn=1.0.0` |
| Storage | `https://nuhirhfevxoonendpfsm.supabase.co/storage/v1` |

Only Next.js API route found in the bundles: `POST /api/broadcast`. Everything else the app does is direct Supabase queries.

## 4. Web app routes (pages)

Public/portal: `/` (home, track & trace, application status), `/vacant`, `/rankingapplicantresults` (+ `/ier?ref=<ranking_id>`), `/apply?ref=<ranking_id>`, `/forgotpassword`.

Authenticated areas include (found in the JS sidebar):

- **PMS module** (the one you're working on):
  - `/pms` — HOME (Performance Management System)
  - `/pms/ipcrf` — IPCRF
  - `/pms/opcrf` — OPCRF (visible to office heads: `head_user_id` match)
  - `/pms/chiefsopcrf` — OPCRF (gated by access types `sds` / `cid` / `sgod`)
  - `/pms/kras` — Domains (gated by `pms_manager`)
  - `/pms/objectives` — KRA/Domain Objectives (gated by `pms_manager`)
  - `/pms/competencies` — Competencies (gated by `pms_manager`)
  - `/pms/ipcrftemplates` — IPCRF/OPCRF Templates (gated by `pms_manager`)

Access is checked client-side via `hrm_system_access` rows (`type` column).

## 5. Database tables (~66 discovered)

Row counts from live probes. All tables exist and are *reachable*; visibility differs (see §6).

### HRM core
| Table | Rows | Notes |
|---|---|---|
| `hrm_users` | 1,705 | staff profiles: names, email, gender, school/office/position ids, salary_grade, item_id, position_type, signature_path |
| `hrm_pds` | 1,604 | Personnel Data Sheets (detailed records) |
| `hrm_items` | 1,630 | plantilla items (item_number, vice, salary_grade, position_id) |
| `hrm_schools` | 74 | name, district, head_user_id |
| `hrm_offices` | 11 | name, head_user_id, org_id |
| `hrm_positions` | 153 | name, salary_grade |
| `hrm_districts` | 6 | |
| `hrm_implementing_units` | 18 | |
| `hrm_school_years` | 0 | |
| `hrm_salaries` | 791 | salary data |
| `hrm_subjects` | 5 | |

### Records / transactions
| Table | Rows |
|---|---|
| `hrm_nosi` | 769 |
| `hrm_nosa` | 127 |
| `hrm_service_records` | 9,999+ |
| `hrm_leave_cards` / `hrm_leave_credits` / `hrm_leave_dates` / `hrm_leave_coc` | 9,999+ / 9,999+ / 9,999+ / 1,147 |
| `hrm_ctos` / `hrm_cto_users` | 128 / 877 |
| `hrm_service_credits` / `hrm_service_credit_users` | 83 / 2,880 |
| `hrm_assignments` / `hrm_designations` / `hrm_coordinatorships` | 71 / 3 / 29 |
| `hrm_promotions` | 2 |
| `hrm_annual_physical_exams` | 67 |
| `hrm_holidays` | 4 |
| `hrm_medical_officers` / `hrm_medical_officer_schools` | 8 / 72 |
| `hrm_ape_diagnoses` / `hrm_ape_diagnosis_files` | 69 / 22 |
| `hrm_items_removed` | 110 |

### Tracker (track & trace)
| Table | Rows |
|---|---|
| `hrm_request_trackers` | 9,999+ |
| `hrm_tracker_flow` | 9,999+ |
| `hrm_tracker_logs` | 9,999+ |
| `hrm_tracker_followers` | 245 |
| `hrm_request_tracker_stickies` | 25 |
| `hrm_remarks` | 3,068 |

### Ranking
| Table | Rows |
|---|---|
| `hrm_rankings` | 163 |
| `hrm_ranking_applicants` | 4,333 |
| `hrm_ranking_committees` | 589 |
| `hrm_ranking_evaluators` | 855 |
| `hrm_ranking_qualifications` | 1,773 |
| `hrm_position_qualifications` | 638 |
| `hrm_ranking_expenses_summary` | 0 |

### PMS ⭐ (Performance Management System)
| Table | Rows | Purpose |
|---|---|---|
| `pms_kras` | 168 | KRA domains |
| `pms_objectives` | 382 | KRA/Domain objectives |
| `pms_competencies` | 8 | Core competencies |
| `pms_competency_items` | 44 | Competency indicators |
| `pms_ipcrf` | 28 | Individual IPCRF forms (rater_id, user_id, ipcrf_template_id, ...) |
| `pms_ipcrf_positions` | 67 | Position scoping for IPCRF |
| `pms_ipcrf_templates` | 29 | IPCRF/OPCRF templates (type: `IPCRF` / `OPCRF`) |
| `pms_ipcrf_template_competencies` | 32 | Template ↔ competency links |
| `pms_ipcrf_template_objectives` | 304 | Template ↔ objective links |

### Misc
| Table | Rows |
|---|---|
| `hrm_system_access` | 76 | access control: `(user_id, org_id, type)` |
| `hrm_notifications` | 9,999+ | |
| `hrm_announcements` | 0 | (empty — matches empty Announcements on the homepage) |
| `hrm_registrations` | 0 | |
| `error_logs` | 2,086 | |

### Access types found in `hrm_system_access`
`records`, `employee_accounts`, `rsp_manager`, `cto_sc_approver`, `pms_manager`, `bulk_nosa`,
`certify_leave_credits`, `randr_manager`, `settings`, `verify_promotions`, `leave_approver`,
`sds`, `ld_training_approver`, `hr`, `rsp_reports`, `land_hrd`, `physical_exam_manager`

## 6. Read-access matrix (probed live)

Legend: **PUBLIC** = readable anonymously (no token). **AUTH** = requires a logged-in session.

| Visibility | Tables |
|---|---|
| **PUBLIC** (no login) | `hrm_users`, `hrm_ranking_applicants`, `hrm_request_trackers`, `hrm_rankings`, `hrm_ranking_committees`, `hrm_ranking_evaluators`, `hrm_ranking_qualifications`, `hrm_items`, `hrm_schools`, `hrm_offices`, `hrm_positions`, `hrm_districts`, `hrm_system_access`, `hrm_tracker_flow`, `hrm_leave_coc`, `hrm_registrations` |
| **AUTH only** (any logged-in user) | all `pms_*`, `hrm_pds`, `hrm_nosi`, `hrm_nosa`, `hrm_service_records`, all leave/CTO/SC tables, `hrm_salaries`, `hrm_assignments`, `hrm_designations`, `hrm_notifications`, `hrm_tracker_logs`, `hrm_remarks`, `hrm_ape_*`, `hrm_annual_physical_exams`, `hrm_promotions`, ... |

Example public call (vacant items shown on the portal):
```bash
curl -s -H "apikey: <ANON_KEY>" \
  "https://nuhirhfevxoonendpfsm.supabase.co/rest/v1/hrm_rankings?select=*,position:position_id(name)&status=eq.Open&display_on_portal=eq.true"
```

Example authed call (your session token as Bearer):
```bash
curl -s -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ACCESS_TOKEN>" \
  "https://nuhirhfevxoonendpfsm.supabase.co/rest/v1/pms_ipcrf_templates?select=*,objectives:pms_ipcrf_template_objectives(*)&type=eq.IPCRF"
```

## 7. Key columns (from the app's own select statements)

- `hrm_users`: `id, firstname, middlename, lastname, avatar_url, gender, email, birthday, position_type, assignment, org_id, item_id, position_id, school_id, office_id, district_id, salary_grade, salary_step, status, joining_date, date_of_last_promotion, step_increment_leave_days, signature_path, fts`
- `hrm_items`: `id, item_number, vice, salary_grade, position_id` (+ `hrm_position: position_id(name, salary_grade)`)
- `pms_ipcrf`: `id, user_id (ratee), rater_id, ipcrf_template_id` + joined `template: ipcrf_template_id(*)`, `rater: rater_id(id, firstname, lastname, middlename, avatar_url)`, `ratee: user_id(...)`
- `pms_ipcrf_templates`: `type` (`IPCRF` / `OPCRF`), `objectives: pms_ipcrf_template_objectives(*)`
- `pms_competencies`: `title`, `compentency_items: pms_competency_items(*)` *(note: "compentency" typo is in their code)*
- `hrm_request_trackers`: joins to `hrm_user: user_id(...)`, `receiver: receiver_id(...)`, `approver: current_approver_id(...)`, `hrm_tracker_logs`, `hrm_remarks`, `hrm_tracker_followers`, `leave_dates: hrm_leave_dates(*)`, `leave_cocs: hrm_leave_coc(*)`, `creator: created_by(...)` — the track-and-trace data model
- `hrm_rankings`: `status` (`Open`/`Closed`), `display_on_portal`, `display_on_portal_until`, `description`, `ier_education_description`, `ier_experience_description`, `ier_training_description`, `ier_eligibility_description`, `display_ier`, `position: position_id(name)`

## 8. ⚠️ Security findings (worth raising with KERI)

1. **Sensitive tables are publicly readable.** With *no login at all*, the API returns rows from:
   - `hrm_users` (1,705 staff: names, work emails, schools, positions, salary grades)
   - `hrm_ranking_applicants` (4,333 applicant records)
   - `hrm_request_trackers` (request/tracker data, 9,999+)
   - `hrm_system_access` (the full privilege map — who has which access type)
   - `hrm_leave_coc`, ranking committees/evaluators/qualifications, plantilla items, schools/offices/positions
2. **No per-row RLS on those tables** — likely missing RLS policies / grants to `anon` rather than deliberate exposure. Public portal pages only need `hrm_rankings` + related reference tables.
3. The OpenAPI schema is service-role-only (good), but the underlying tables aren't locked down the same way.

**Recommendation:** ask KERI to review grants/RLS — specifically revoke anonymous `SELECT` on `hrm_users`, `hrm_ranking_applicants`, `hrm_request_trackers`, `hrm_system_access`, `hrm_leave_coc`, and only leave the portal-facing tables (rankings, items, schools, offices, positions, districts) public.

## 9. Your account (current state)

- `joel.encendencia@deped.gov.ph` → `role: authenticated`, user id `3408a42d-ba05-46fc-b31f-bc5b15b29121`
- Profile: Joel Marasigan Encendencia, Teaching, salary grade 12, school_id 141, district 9, item_id 572
- **`hrm_system_access`: 0 rows** → no access types granted yet (that's the "waiting for admin" state). Until a row with `type: pms_manager` (or similar) is added for you, the PMS settings pages (`/pms/kras`, `/pms/objectives`, `/pms/competencies`, `/pms/ipcrftemplates`) and the `sds/cid/sgod` OPCRF page stay hidden in the UI.

## 10. Quick-start snippets

```bash
# 1) Login → save token
curl -s -X POST ".../auth/v1/token?grant_type=password" \
  -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}' > login.json
TOKEN=$(python -c "import json;print(json.load(open('login.json'))['access_token'])")

# 2) Any table, PostgREST style (filters, joins, ordering)
curl -s -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" \
  "https://nuhirhfevxoonendpfsm.supabase.co/rest/v1/pms_ipcrf?select=*,template:ipcrf_template_id(*),ratee:user_id(id,firstname,lastname)&user_id=eq.$MY_USER_ID"

# 3) Write (only if the table's policies allow; not verified for your role)
curl -s -X POST -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"...":"..."}' "https://nuhirhfevxoonendpfsm.supabase.co/rest/v1/<table>"
```

> The project id is `nuhirhfevxoonendpfsm`; the web origin is `eprime.kerisoftware.com`. If the site moves to another KERI deployment, the Supabase URL + anon key travel with the JS bundles, so re-extract from `/_next/static/immutable/chunks/*.js` the same way.