-- Analytics statistics views (IMPLEMENTATION_ORDER_V2.md Phase 21).
-- DATABASE.md's "Views" section reserved these four names for exactly this
-- purpose. Each view performs pure per-status counting via GROUP BY -
-- nothing else. Which statuses mean "interview", "offer" or "response" is
-- decided entirely in application code (application.constants.ts), reused
-- unchanged by AnalyticsService/analytics-calculations.ts against these
-- views' per-status columns - these views enumerate every application
-- status exhaustively and make no categorisation decision of their own.
-- Rates, minimum-sample gating, sorting, Funnel Analytics, Insights and
-- Average Response Time remain entirely in AnalyticsService, unchanged.
--
-- `with (security_invoker = true)` is required so each view is evaluated
-- with the querying user's own permissions - RLS on applications/companies/
-- cv_versions then filters rows exactly as it does for any other query
-- against those tables. The explicit `a.user_id = (select auth.uid())`
-- filter in every view body is redundant with RLS by design (the same
-- defense-in-depth pattern already used throughout this schema).
--
-- CREATE OR REPLACE VIEW is idempotent - safe to re-run by hand in the SQL
-- Editor, matching every other migration in this project.

create or replace view public.dashboard_metrics
with (security_invoker = true) as
select
  a.user_id,
  (count(*) filter (where a.current_status = 'Wishlist'))::integer as wishlist_count,
  (count(*) filter (where a.current_status = 'Applied'))::integer as applied_count,
  (count(*) filter (where a.current_status = 'Recruiter Contact'))::integer as recruiter_contact_count,
  (count(*) filter (where a.current_status = 'HR Interview'))::integer as hr_interview_count,
  (count(*) filter (where a.current_status = 'Technical Interview'))::integer as technical_interview_count,
  (count(*) filter (where a.current_status = 'Final Interview'))::integer as final_interview_count,
  (count(*) filter (where a.current_status = 'Offer'))::integer as offer_count,
  (count(*) filter (where a.current_status = 'Accepted'))::integer as accepted_count,
  (count(*) filter (where a.current_status = 'Rejected'))::integer as rejected_count,
  count(*)::integer as total_count
from public.applications a
where a.deleted_at is null
  and a.user_id = (select auth.uid())
group by a.user_id;

grant select on public.dashboard_metrics to authenticated;

create or replace view public.company_statistics
with (security_invoker = true) as
select
  a.user_id,
  a.company_id as id,
  c.name as name,
  (count(*) filter (where a.current_status = 'Wishlist'))::integer as wishlist_count,
  (count(*) filter (where a.current_status = 'Applied'))::integer as applied_count,
  (count(*) filter (where a.current_status = 'Recruiter Contact'))::integer as recruiter_contact_count,
  (count(*) filter (where a.current_status = 'HR Interview'))::integer as hr_interview_count,
  (count(*) filter (where a.current_status = 'Technical Interview'))::integer as technical_interview_count,
  (count(*) filter (where a.current_status = 'Final Interview'))::integer as final_interview_count,
  (count(*) filter (where a.current_status = 'Offer'))::integer as offer_count,
  (count(*) filter (where a.current_status = 'Accepted'))::integer as accepted_count,
  (count(*) filter (where a.current_status = 'Rejected'))::integer as rejected_count,
  count(*)::integer as total_count
from public.applications a
join public.companies c on c.id = a.company_id
where a.deleted_at is null
  and a.user_id = (select auth.uid())
group by a.user_id, a.company_id, c.name;

grant select on public.company_statistics to authenticated;

create or replace view public.cv_statistics
with (security_invoker = true) as
select
  a.user_id,
  a.cv_version_id as id,
  v.name as name,
  (count(*) filter (where a.current_status = 'Wishlist'))::integer as wishlist_count,
  (count(*) filter (where a.current_status = 'Applied'))::integer as applied_count,
  (count(*) filter (where a.current_status = 'Recruiter Contact'))::integer as recruiter_contact_count,
  (count(*) filter (where a.current_status = 'HR Interview'))::integer as hr_interview_count,
  (count(*) filter (where a.current_status = 'Technical Interview'))::integer as technical_interview_count,
  (count(*) filter (where a.current_status = 'Final Interview'))::integer as final_interview_count,
  (count(*) filter (where a.current_status = 'Offer'))::integer as offer_count,
  (count(*) filter (where a.current_status = 'Accepted'))::integer as accepted_count,
  (count(*) filter (where a.current_status = 'Rejected'))::integer as rejected_count,
  count(*)::integer as total_count
from public.applications a
join public.cv_versions v on v.id = a.cv_version_id
where a.deleted_at is null
  and a.user_id = (select auth.uid())
group by a.user_id, a.cv_version_id, v.name;

grant select on public.cv_statistics to authenticated;

-- Wishlist-stage applications have no application_date yet and are
-- excluded, matching AnalyticsService's existing exclusion of the same
-- rows from its date-keyed timeline (they have nothing to key by).
create or replace view public.monthly_statistics
with (security_invoker = true) as
select
  a.user_id,
  to_char(a.application_date, 'YYYY-MM') as id,
  to_char(a.application_date, 'YYYY-MM') as name,
  (count(*) filter (where a.current_status = 'Wishlist'))::integer as wishlist_count,
  (count(*) filter (where a.current_status = 'Applied'))::integer as applied_count,
  (count(*) filter (where a.current_status = 'Recruiter Contact'))::integer as recruiter_contact_count,
  (count(*) filter (where a.current_status = 'HR Interview'))::integer as hr_interview_count,
  (count(*) filter (where a.current_status = 'Technical Interview'))::integer as technical_interview_count,
  (count(*) filter (where a.current_status = 'Final Interview'))::integer as final_interview_count,
  (count(*) filter (where a.current_status = 'Offer'))::integer as offer_count,
  (count(*) filter (where a.current_status = 'Accepted'))::integer as accepted_count,
  (count(*) filter (where a.current_status = 'Rejected'))::integer as rejected_count,
  count(*)::integer as total_count
from public.applications a
where a.deleted_at is null
  and a.application_date is not null
  and a.user_id = (select auth.uid())
group by a.user_id, to_char(a.application_date, 'YYYY-MM');

grant select on public.monthly_statistics to authenticated;
