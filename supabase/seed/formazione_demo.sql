-- ============================================================================
-- Seed dimostrativo Formazione (facoltativo) — corso + lezioni + eventi.
-- Da eseguire nel SQL Editor DOPO la migrazione 0004.
-- I youtube_id sono video CC (Big Buck Bunny) come segnaposto: sostituiscili con
-- gli ID dei tuoi video "non in elenco" (unlisted).
-- Idempotente (on conflict do nothing).
-- ============================================================================

insert into public.courses (id, titolo, descrizione, ordine) values
  ('0000000c-0000-0000-0000-000000000001', 'Fondamenti Invisionary', 'Corso introduttivo dimostrativo.', 1)
on conflict (id) do nothing;

insert into public.lessons (id, course_id, titolo, youtube_id, ordine) values
  ('0000000e-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000001', 'Benvenuto', 'aqz-KE-bpKQ', 1),
  ('0000000e-0000-0000-0000-000000000002', '0000000c-0000-0000-0000-000000000001', 'Mentalità vincente', 'aqz-KE-bpKQ', 2)
on conflict (id) do nothing;

insert into public.events (id, titolo, descrizione, start_at, end_at) values
  ('0000000f-0000-0000-0000-000000000001', 'Webinar: apertura stagione', 'Sessione dimostrativa.',
   '2026-09-15 18:00:00+00', '2026-09-15 19:30:00+00'),
  ('0000000f-0000-0000-0000-000000000002', 'Workshop di rete', 'Incontro dimostrativo.',
   '2026-10-01 10:00:00+00', '2026-10-01 12:00:00+00')
on conflict (id) do nothing;
