-- FIDE backend initial schema for Supabase Postgres

create extension if not exists "pgcrypto";

create type public.content_type as enum ('material', 'question');
create type public.progress_status as enum ('not_started', 'in_progress', 'completed');
create type public.submission_status as enum ('submitted', 'graded');

create table if not exists public.chapters (
  id bigserial primary key,
  level text not null,
  slug text not null unique,
  title text not null,
  description text,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sections (
  id bigserial primary key,
  chapter_id bigint not null references public.chapters(id) on delete cascade,
  level text not null,
  slug text not null unique,
  title text not null,
  is_final_boss boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id bigserial primary key,
  section_id bigint not null references public.sections(id) on delete cascade,
  level text not null,
  slug text not null unique,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contents (
  id bigserial primary key,
  lesson_id bigint not null references public.lessons(id) on delete cascade,
  type public.content_type not null,
  slug text not null unique,
  title text,
  body_html text,
  question_text text,
  correct_answer text,
  explanation_correct text,
  explanation_wrong text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_fields_by_type check (
    (type = 'material' and body_html is not null and question_text is null and correct_answer is null)
    or
    (type = 'question' and question_text is not null and correct_answer is not null)
  )
);

create table if not exists public.content_choices (
  id bigserial primary key,
  content_id bigint not null references public.contents(id) on delete cascade,
  option_key text not null,
  option_text text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (content_id, option_key)
);

create table if not exists public.bosses (
  id bigserial primary key,
  section_id bigint not null unique references public.sections(id) on delete cascade,
  type text not null,
  slug text not null unique,
  title text not null,
  question_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boss_expected_points (
  id bigserial primary key,
  boss_id bigint not null references public.bosses(id) on delete cascade,
  point_text text not null,
  sort_order int not null default 0,
  unique (boss_id, sort_order)
);

create table if not exists public.answers (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id bigint not null references public.contents(id) on delete cascade,
  selected_option text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  unique (user_id, content_id)
);

create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id bigint not null references public.lessons(id) on delete cascade,
  status public.progress_status not null default 'not_started',
  last_content_id bigint references public.contents(id) on delete set null,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.content_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id bigint not null references public.contents(id) on delete cascade,
  is_completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

create table if not exists public.boss_submissions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  boss_id bigint not null references public.bosses(id) on delete cascade,
  answer_text text not null,
  score numeric(5,2),
  feedback text,
  status public.submission_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  graded_at timestamptz
);

create index if not exists idx_sections_chapter on public.sections (chapter_id, sort_order);
create index if not exists idx_lessons_section on public.lessons (section_id, sort_order);
create index if not exists idx_contents_lesson on public.contents (lesson_id, sort_order);
create index if not exists idx_choices_content on public.content_choices (content_id, sort_order);
create index if not exists idx_answers_user on public.answers (user_id, answered_at desc);
create index if not exists idx_lesson_progress_user on public.lesson_progress (user_id);
create index if not exists idx_content_progress_user on public.content_progress (user_id);
create index if not exists idx_boss_submissions_user on public.boss_submissions (user_id, submitted_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tr_chapters_set_updated_at
before update on public.chapters
for each row execute procedure public.set_updated_at();

create trigger tr_sections_set_updated_at
before update on public.sections
for each row execute procedure public.set_updated_at();

create trigger tr_lessons_set_updated_at
before update on public.lessons
for each row execute procedure public.set_updated_at();

create trigger tr_contents_set_updated_at
before update on public.contents
for each row execute procedure public.set_updated_at();

create trigger tr_bosses_set_updated_at
before update on public.bosses
for each row execute procedure public.set_updated_at();

create trigger tr_lesson_progress_set_updated_at
before update on public.lesson_progress
for each row execute procedure public.set_updated_at();

create trigger tr_content_progress_set_updated_at
before update on public.content_progress
for each row execute procedure public.set_updated_at();

create or replace function public.get_progress_summary(p_user_id uuid default auth.uid())
returns table (
  total_lessons bigint,
  completed_lessons bigint,
  total_contents bigint,
  completed_contents bigint
)
language sql
stable
as $$
  select
    (select count(*) from public.lessons) as total_lessons,
    (select count(*) from public.lesson_progress lp where lp.user_id = p_user_id and lp.status = 'completed') as completed_lessons,
    (select count(*) from public.contents) as total_contents,
    (select count(*) from public.content_progress cp where cp.user_id = p_user_id and cp.is_completed = true) as completed_contents;
$$;

alter table public.chapters enable row level security;
alter table public.sections enable row level security;
alter table public.lessons enable row level security;
alter table public.contents enable row level security;
alter table public.content_choices enable row level security;
alter table public.bosses enable row level security;
alter table public.boss_expected_points enable row level security;
alter table public.answers enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.content_progress enable row level security;
alter table public.boss_submissions enable row level security;

create policy "Public read chapters" on public.chapters for select using (true);
create policy "Public read sections" on public.sections for select using (true);
create policy "Public read lessons" on public.lessons for select using (true);
create policy "Public read contents" on public.contents for select using (true);
create policy "Public read content choices" on public.content_choices for select using (true);
create policy "Public read bosses" on public.bosses for select using (true);
create policy "Public read boss expected points" on public.boss_expected_points for select using (true);

create policy "Users read own answers" on public.answers
for select using (auth.uid() = user_id);
create policy "Users insert own answers" on public.answers
for insert with check (auth.uid() = user_id);
create policy "Users update own answers" on public.answers
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read own lesson progress" on public.lesson_progress
for select using (auth.uid() = user_id);
create policy "Users upsert own lesson progress" on public.lesson_progress
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read own content progress" on public.content_progress
for select using (auth.uid() = user_id);
create policy "Users upsert own content progress" on public.content_progress
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read own boss submissions" on public.boss_submissions
for select using (auth.uid() = user_id);
create policy "Users insert own boss submissions" on public.boss_submissions
for insert with check (auth.uid() = user_id);
