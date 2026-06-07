-- Pre-existing fix: the reused `umami-analytics` project had RLS disabled on all
-- 18 public.* tables, exposing analytics data + the umami login hash via the anon key.
-- umami connects directly as the postgres role (bypasses RLS), so enabling RLS with
-- no policies closes the PostgREST/anon hole without affecting umami.
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pixel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_replay ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_replay_saved ENABLE ROW LEVEL SECURITY;
