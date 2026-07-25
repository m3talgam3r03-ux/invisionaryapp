-- ============================================================================
-- Invisionary — Migrazione 0004: Formazione (courses, lessons, lesson_progress, events).
-- Prerequisito: 0001_init.sql (is_admin(), can_read_member()).
-- Idempotente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- COURSES / LESSONS: catalogo formativo (contenuto gestito dall'admin).
-- ----------------------------------------------------------------------------
create table if not exists public.courses (
  id           uuid primary key default gen_random_uuid(),
  titolo       text not null,
  descrizione  text,
  ordine       integer not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.lessons (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses (id) on delete cascade,
  titolo      text not null,
  youtube_id  text not null,
  ordine      integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists lessons_course_id_idx on public.lessons (course_id);

-- ----------------------------------------------------------------------------
-- LESSON_PROGRESS: avanzamento per utente (una riga per lezione completata).
-- ----------------------------------------------------------------------------
create table if not exists public.lesson_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  lesson_id     uuid not null references public.lessons (id) on delete cascade,
  completed_at  timestamptz not null default now(),
  unique (user_id, lesson_id)
);
create index if not exists lesson_progress_user_idx on public.lesson_progress (user_id);

-- ----------------------------------------------------------------------------
-- EVENTS: calendario formazione.
-- ----------------------------------------------------------------------------
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  titolo       text not null,
  descrizione  text,
  start_at     timestamptz not null,
  end_at       timestamptz,
  created_by   uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists events_start_at_idx on public.events (start_at);

-- ----------------------------------------------------------------------------
-- RLS
--   courses / lessons / events → lettura per tutti gli autenticati, scrittura admin.
--   lesson_progress → lettura per owner/leader/admin, scrittura solo sulla propria.
-- ----------------------------------------------------------------------------
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.events enable row level security;

-- courses
drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses for select using (auth.uid() is not null);
drop policy if exists courses_insert on public.courses;
create policy courses_insert on public.courses for insert with check (public.is_admin());
drop policy if exists courses_update on public.courses;
create policy courses_update on public.courses for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists courses_delete on public.courses;
create policy courses_delete on public.courses for delete using (public.is_admin());

-- lessons
drop policy if exists lessons_select on public.lessons;
create policy lessons_select on public.lessons for select using (auth.uid() is not null);
drop policy if exists lessons_insert on public.lessons;
create policy lessons_insert on public.lessons for insert with check (public.is_admin());
drop policy if exists lessons_update on public.lessons;
create policy lessons_update on public.lessons for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists lessons_delete on public.lessons;
create policy lessons_delete on public.lessons for delete using (public.is_admin());

-- lesson_progress
drop policy if exists lesson_progress_select on public.lesson_progress;
create policy lesson_progress_select on public.lesson_progress
  for select using (public.can_read_member(user_id));
drop policy if exists lesson_progress_insert on public.lesson_progress;
create policy lesson_progress_insert on public.lesson_progress
  for insert with check (user_id = auth.uid());
drop policy if exists lesson_progress_delete on public.lesson_progress;
create policy lesson_progress_delete on public.lesson_progress
  for delete using (user_id = auth.uid() or public.is_admin());

-- events
drop policy if exists events_select on public.events;
create policy events_select on public.events for select using (auth.uid() is not null);
drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert with check (public.is_admin());
drop policy if exists events_update on public.events;
create policy events_update on public.events for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists events_delete on public.events;
create policy events_delete on public.events for delete using (public.is_admin());

grant select, insert, update, delete
  on public.courses, public.lessons, public.lesson_progress, public.events
  to authenticated;
