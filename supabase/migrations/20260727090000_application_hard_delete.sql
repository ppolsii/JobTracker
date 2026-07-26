-- Permanent Application Deletion (product decision, post-Phase 40): the one
-- narrow, deliberate exception to this project's "no hard DELETE anywhere"
-- rule (DECISIONS.md ADR-021/BUSINESS_RULES.md "Soft Deletes") - scoped to
-- `applications` only. Companies and CV Versions are unaffected and keep
-- no DELETE grant at all.
--
-- "Archived first" is a business rule, not a database constraint - it is
-- enforced by ApplicationService.deletePermanently, not here. This policy
-- deliberately mirrors every other applications policy exactly (ownership
-- only, via user_id = auth.uid()), the same "RLS enforces ownership;
-- Services own business rules" split ARCHITECTURE.md already draws
-- everywhere else in this project.
grant delete on public.applications to authenticated;

drop policy if exists "Users can delete own applications" on public.applications;
create policy "Users can delete own applications"
  on public.applications for delete
  using (user_id = (select auth.uid()));
