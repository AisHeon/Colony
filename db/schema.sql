-- Colony database schema (Postgres / PGlite compatible).
-- All timestamps are epoch milliseconds stored as double precision so both the
-- node-postgres driver and PGlite return plain JS numbers.

create table if not exists guest_session (
  id text primary key,
  token_hash text not null unique,
  created_at double precision not null
);

create table if not exists room (
  id text primary key,
  code text not null unique,
  host_member_id text,
  status text not null default 'lobby',
  settings jsonb not null,
  settings_version integer not null default 1,
  state_version integer not null default 1,
  created_at double precision not null,
  last_activity_at double precision not null,
  closed_at double precision
);

create table if not exists room_member (
  id text primary key,
  room_id text not null references room(id) on delete cascade,
  guest_id text not null references guest_session(id) on delete cascade,
  nickname text not null,
  nickname_norm text not null,
  avatar integer not null default 0,
  joined_at double precision not null,
  last_seen_at double precision not null,
  ready boolean not null default false,
  spectator boolean not null default false,
  left_at double precision,
  forfeited boolean not null default false
);

create unique index if not exists room_member_active_nickname
  on room_member (room_id, nickname_norm) where left_at is null;
create unique index if not exists room_member_active_guest
  on room_member (room_id, guest_id) where left_at is null;
create index if not exists room_member_room on room_member (room_id);

create table if not exists match (
  id text primary key,
  room_id text not null references room(id) on delete cascade,
  mode text not null,
  config jsonb not null,
  content_version text not null,
  status text not null default 'active',
  playlist jsonb not null default '[]'::jsonb,
  round_count integer not null,
  started_at double precision not null,
  ended_at double precision,
  vote_ends_at double precision,
  vote_result jsonb
);
create index if not exists match_room on match (room_id);

create table if not exists round (
  id text primary key,
  match_id text not null references match(id) on delete cascade,
  idx integer not null,
  mode text not null,
  phase text not null default 'countdown',
  prompt jsonb not null,
  participants jsonb not null,
  state jsonb not null default '{}'::jsonb,
  starts_at double precision not null,
  ends_at double precision not null,
  results_at double precision,
  finalized_at double precision,
  unique (match_id, idx)
);

create table if not exists intent_receipt (
  request_id text primary key,
  room_id text not null,
  member_id text,
  type text not null,
  result jsonb,
  created_at double precision not null
);
create index if not exists intent_receipt_created on intent_receipt (created_at);

create table if not exists answer_attempt (
  id text primary key,
  request_id text not null,
  room_id text not null,
  round_id text not null references round(id) on delete cascade,
  turn_id text,
  member_id text not null,
  submitted_text text not null,
  canonical_id text,
  result_code text not null,
  message text,
  admitted_at double precision not null
);
create unique index if not exists answer_attempt_request on answer_attempt (request_id);
create index if not exists answer_attempt_round on answer_attempt (round_id, member_id);

create table if not exists anthill_answer (
  round_id text not null references round(id) on delete cascade,
  member_id text not null,
  entity_id text not null,
  base_value integer not null,
  rarity text not null,
  created_at double precision not null,
  primary key (round_id, member_id, entity_id)
);
create index if not exists anthill_answer_entity on anthill_answer (round_id, entity_id);

create table if not exists beehive_turn (
  id text primary key,
  round_id text not null references round(id) on delete cascade,
  idx integer not null,
  active_member_id text not null,
  started_at double precision not null,
  deadline_at double precision not null,
  accepted_answer_id text,
  outcome text not null default 'pending'
);
create index if not exists beehive_turn_round on beehive_turn (round_id);

create table if not exists hopper_answer (
  round_id text not null references round(id) on delete cascade,
  member_id text not null,
  bucket_id text not null,
  accepted_at double precision not null,
  primary key (round_id, member_id)
);

create table if not exists spider_path (
  round_id text not null references round(id) on delete cascade,
  member_id text not null,
  entity_ids jsonb not null,
  edge_ids jsonb not null,
  strand_count integer not null,
  accepted_at double precision not null,
  primary key (round_id, member_id)
);

create table if not exists round_placement (
  round_id text not null references round(id) on delete cascade,
  member_id text not null,
  placement integer,
  performance jsonb not null,
  match_points integer not null,
  primary key (round_id, member_id)
);
create index if not exists round_placement_round on round_placement (round_id);

create table if not exists favorite_vote (
  match_id text not null references match(id) on delete cascade,
  member_id text not null,
  mode text not null,
  updated_at double precision not null,
  primary key (match_id, member_id)
);

create table if not exists content_report (
  id text primary key,
  kind text not null,
  target_id text not null,
  content_version text not null,
  submitted_text text not null,
  reason text,
  member_id text,
  room_code text,
  review_status text not null default 'open',
  created_at double precision not null
);

-- ---------------------------------------------------------------------------
-- Content tables. Seeded from content/*.json by scripts/seed.ts.
-- ---------------------------------------------------------------------------

create table if not exists entity (
  id text primary key,
  canonical_name text not null,
  type text not null,
  description text,
  meta jsonb not null default '{}'::jsonb
);

create table if not exists entity_alias (
  entity_id text not null references entity(id) on delete cascade,
  alias_norm text not null,
  display text not null,
  primary key (entity_id, alias_norm)
);
create index if not exists entity_alias_norm on entity_alias (alias_norm);

create table if not exists prompt (
  id text primary key,
  kind text not null,
  text text not null,
  scope text not null,
  pack text not null default 'core',
  family_friendly boolean not null default true,
  version text not null,
  meta jsonb not null default '{}'::jsonb
);

create table if not exists prompt_answer (
  prompt_id text not null references prompt(id) on delete cascade,
  entity_id text not null references entity(id) on delete cascade,
  rarity text not null,
  primary key (prompt_id, entity_id)
);
create index if not exists prompt_answer_prompt on prompt_answer (prompt_id);

create table if not exists graph_edge (
  id text primary key,
  from_entity text not null references entity(id) on delete cascade,
  predicate text not null,
  to_entity text not null references entity(id) on delete cascade,
  forward_label text not null,
  inverse_label text,
  source text not null,
  verified boolean not null default true,
  version text not null
);
create index if not exists graph_edge_from on graph_edge (from_entity);

create table if not exists puzzle (
  id text primary key,
  start_entity text not null references entity(id) on delete cascade,
  target_entity text not null references entity(id) on delete cascade,
  shortest_distance integer not null,
  allowed_predicates jsonb not null default '[]'::jsonb,
  source text not null,
  version text not null
);

create table if not exists hopper_question (
  id text primary key,
  text text not null,
  scope text not null,
  source_kind text not null,
  source_meta jsonb not null default '{}'::jsonb,
  version text not null
);

create table if not exists hopper_bucket (
  id text primary key,
  question_id text not null references hopper_question(id) on delete cascade,
  canonical text not null,
  rank integer not null,
  entity_id text,
  aliases jsonb not null default '[]'::jsonb
);
create index if not exists hopper_bucket_question on hopper_bucket (question_id);

create table if not exists content_meta (
  key text primary key,
  value jsonb not null
);

-- Aggregated, non-identifying play statistics. Raw text is stored per attempt
-- only for the lifetime of a round, plus reports submitted deliberately.
create table if not exists answer_stats (
  prompt_id text not null,
  entity_id text not null,
  selections integer not null default 0,
  exposures integer not null default 0,
  updated_at double precision not null,
  primary key (prompt_id, entity_id)
);
