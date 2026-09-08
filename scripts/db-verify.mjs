import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

/**
 * Applies every migration to a real Postgres and checks that it did what it says.
 *
 *     pnpm db:verify
 *
 * WHY THIS EXISTS. `pnpm db:migrate` is a one-way door pointed at a database with real
 * rows in it, and until now the only thing standing between a bad migration and that
 * database was reading the SQL carefully. Typecheck cannot help: it does not see inside a
 * tagged template, so a renamed column leaves no trace in `tsc` and no trace in the test
 * suite either. Four migrations in, that was the largest unguarded surface in the repo.
 *
 * A REAL POSTGRES, NOT A MOCK, WHICH IS THE WHOLE REASON THIS IS WORTH HAVING. PGlite is
 * Postgres compiled to WebAssembly - the actual query planner, the actual type system, the
 * actual constraint machinery - running in this process with no server to install and no
 * container to start. A mocked database would only test the mock, which is the objection
 * vitest.config.mts already makes about mocked third parties, and it would be useless
 * here: the things worth checking are `on conflict` semantics, a cascade, a check
 * constraint and a timezone cast, none of which a fake can have an opinion about.
 *
 * A DEV DEPENDENCY, so the count docs/lab.md keeps is untouched. The five it counts are
 * RUNTIME dependencies; this one is the same trade vitest already made and for the same
 * reason.
 *
 * A SCRIPT RATHER THAN A TEST, which is a judgement call and could go the other way.
 * vitest.config.mts says only pure functions are tested and this is emphatically not one,
 * and at a couple of seconds it would be most of the suite's runtime. It sits beside
 * migrate.mjs instead, because it is the thing you run immediately before it. If it ever
 * wants to run on every commit, tests/server/db/ is where it would go and nothing here
 * would have to change but the harness around it.
 *
 * EVERY SUITE GETS A FRESH DATABASE, so nothing leaks between them and each one can seed
 * whatever shape it needs to migrate from.
 */

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const migrations = join(root, "src", "server", "db", "migrations");

/** Every migration, in the order migrate.mjs would apply them. Same sort, same reason. */
const FILES = readdirSync(migrations)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const sqlOf = (file) => readFileSync(join(migrations, file), "utf8");

/* ---------------- the harness ---------------- */

let failures = 0;
let checks = 0;

const check = (label, ok, detail = "") => {
  checks += 1;
  if (!ok) failures += 1;
  const mark = ok ? "  ok  " : " FAIL ";
  console.log(`${mark} ${label}${detail ? `  ->  ${detail}` : ""}`);
};

/**
 * Applies files the way migrate.mjs does: in order, one transaction each.
 *
 * The transaction is not decoration. It is what makes "applied" mean applied, and the
 * rollback suite below is the check that it actually holds for these statements.
 */
const apply = async (db, files) => {
  for (const file of files) {
    await db.exec("begin");
    try {
      await db.exec(sqlOf(file));
      await db.exec("commit");
    } catch (error) {
      await db.exec("rollback");
      throw new Error(`${file}: ${error.message}`, { cause: error });
    }
  }
};

/**
 * Pulls a tagged-template query out of a source file and rewrites `${…}` to $1, $2, …
 *
 * SO THE THING THAT RUNS IS THE THING THAT SHIPS. Copying these queries into this file
 * would let the copy drift from the original, and drift is precisely the bug being hunted:
 * a column renamed in a migration and missed in one store is invisible to typecheck and
 * invisible to a copy that was never updated either.
 *
 * The marker is the first few words of the query. If somebody rewrites one, this throws by
 * name rather than silently checking nothing, which is the failure mode worth having.
 */
const lift = (file, marker) => {
  const src = readFileSync(join(root, file), "utf8");
  const at = src.indexOf(marker);
  if (at < 0) throw new Error(`db-verify: no query matching "${marker}" in ${file}`);

  // The marker sits inside the template, so the opening backtick is behind it.
  let n = 0;
  return src
    .slice(src.lastIndexOf("`", at) + 1, src.indexOf("`", at))
    .replace(/\$\{[^}]*\}/g, () => `$${(n += 1)}`);
};

const SUGGEST_STORE = "src/server/suggest/store.ts";
const DEEPCUTS_STORE = "src/server/deepcuts/store.ts";

const V1 = "11111111-1111-4111-8111-111111111111";
const V2 = "22222222-2222-4222-8222-222222222222";
const V3 = "33333333-3333-4333-8333-333333333333";

/** The ISO UTC shape getIsoDateTimeUtc emits, which several columns are checked against. */
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** information_schema, asked the three questions this file keeps asking. */
const columnsOf = async (db, table) => {
  const { rows } = await db.query(
    `select column_name, data_type, is_nullable, column_default
       from information_schema.columns where table_name = $1`,
    [table]
  );
  return Object.fromEntries(rows.map((row) => [row.column_name, row]));
};

const constraintsOf = async (db, table) => {
  const { rows } = await db.query(
    `select tc.constraint_type, kcu.column_name
       from information_schema.table_constraints tc
       left join information_schema.key_column_usage kcu
         on kcu.constraint_name = tc.constraint_name
      where tc.table_name = $1`,
    [table]
  );
  return rows;
};

/* ---------------- the suites ---------------- */

/**
 * A database that has never been migrated, which is what a new Neon branch is.
 *
 * The end state is asserted rather than the steps, because this is the shape every other
 * suite migrates TOWARD and the one a fresh deployment gets without passing through any of
 * the intermediate ones.
 */
const freshDatabase = async (db) => {
  await apply(db, FILES);

  const tables = await db.query(
    `select table_name from information_schema.tables
      where table_schema = 'public' order by table_name`
  );
  check(
    "every table exists and nothing else does",
    tables.rows.map((row) => row.table_name).join(",") ===
      "pack_card,pack_rip,suggestion,visitor",
    tables.rows.map((row) => row.table_name).join(",")
  );

  /* 004: every surrogate key is a uuid, defaulted by the database. */
  for (const [table, column] of [
    ["suggestion", "id"],
    ["pack_rip", "id"],
    ["pack_card", "id"],
    ["pack_card", "rip_id"],
    ["visitor", "id"],
  ]) {
    const info = (await columnsOf(db, table))[column];
    check(`004: ${table}.${column} is uuid`, info?.data_type === "uuid", info?.data_type);
  }

  /* 005: the timestamps are text named for their format, with no default left. The
     default matters as much as the type: it is what makes a write that forgets the column
     fail loudly instead of recording Postgres's idea of the moment. */
  for (const [table, column] of [
    ["suggestion", "added_at_iso_datetime_utc"],
    ["pack_rip", "ripped_at_iso_datetime_utc"],
  ]) {
    const info = (await columnsOf(db, table))[column];
    check(`005: ${table}.${column} is text`, info?.data_type === "text", info?.data_type);
    check(`005: ${table}.${column} has no default`, info?.column_default === null, info?.column_default);
  }

  const suggestion = await columnsOf(db, "suggestion");
  check("005: suggestion.name is gone", suggestion.name === undefined);
  for (const column of ["track_name", "artist", "album", "album_art", "track_url", "duration_ms"]) {
    check(`005: suggestion.${column} exists`, suggestion[column] !== undefined);
  }

  const fk = await db.query(
    `select ccu.table_name as ref, rc.delete_rule
       from information_schema.table_constraints tc
       join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
       join information_schema.referential_constraints rc on rc.constraint_name = tc.constraint_name
      where tc.constraint_type = 'FOREIGN KEY' and tc.table_name = 'suggestion'`
  );
  check("005: suggestion points at visitor, cascading", fk.rows[0]?.ref === "visitor" && fk.rows[0]?.delete_rule === "CASCADE");

  /* 006: a pack is one row, and a card owns a slot within it. */
  const rip = await columnsOf(db, "pack_rip");
  check("006: pack_rip.day exists and is a date", rip.day?.data_type === "date", rip.day?.data_type);
  check("006: pack_rip.opens exists", rip.opens !== undefined);
  const card = await columnsOf(db, "pack_card");
  check("006: pack_card.slot exists", card.slot !== undefined);

  const unique = await constraintsOf(db, "pack_rip");
  const uniqueCols = unique
    .filter((row) => row.constraint_type === "UNIQUE")
    .map((row) => row.column_name)
    .sort()
    .join(",");
  check("006: pack_rip is unique per visitor, playlist and day", uniqueCols === "day,playlist_id,visitor_id", uniqueCols);

  const indexes = await db.query(`select indexname from pg_indexes where schemaname = 'public'`);
  const names = indexes.rows.map((row) => row.indexname);
  for (const want of [
    "suggestion_track_uri_idx",
    "suggestion_visitor_id_idx",
    "pack_rip_playlist_id_idx",
    "pack_rip_visitor_id_idx",
    "pack_card_tier_rank_idx",
  ]) {
    check(`index ${want} survived every migration`, names.includes(want));
  }
};

/**
 * 004, over rows written under the bigserial schema.
 *
 * The one thing that cannot be rebuilt from anything else in these tables is which cards
 * came out of which pack, so that is what this checks hardest.
 */
const uuidOverExistingRows = async (db) => {
  await apply(db, FILES.filter((file) => file < "004"));

  await db.query(
    `insert into suggestion (track_uri, name, visitor_id) values ('spotify:track:a','ana',$1)`,
    [V1]
  );
  const pairs = [];
  for (let r = 0; r < 3; r += 1) {
    const rip = await db.query(
      `insert into pack_rip (playlist_id, visitor_id) values ($1,$2) returning id`,
      [`playlist-${r}`, V1]
    );
    for (let s = 0; s < 5; s += 1) {
      await db.query(
        `insert into pack_card (rip_id, track_uri, title, artist, tier, tier_rank)
         values ($1,$2,'t','a','SILVER',0)`,
        [rip.rows[0].id, `uri-${r}-${s}`]
      );
      pairs.push(`playlist-${r}|uri-${r}-${s}`);
    }
  }

  await apply(db, ["004_uuid_ids.sql"]);

  const after = await db.query(
    `select rip.playlist_id, card.track_uri from pack_card card
       join pack_rip rip on rip.id = card.rip_id
      order by rip.playlist_id, card.track_uri`
  );
  check(
    "004: every rip to card link survived, unchanged",
    after.rows.map((row) => `${row.playlist_id}|${row.track_uri}`).join(",") === pairs.sort().join(","),
    `${after.rows.length} pairs`
  );

  const ids = await db.query(`select id from pack_card`);
  check("004: ids are distinct uuid strings", new Set(ids.rows.map((r) => r.id)).size === 15 && typeof ids.rows[0].id === "string");

  const one = await db.query(`select id from pack_rip limit 1`);
  await db.query(`delete from pack_rip where id = $1`, [one.rows[0].id]);
  const left = await db.query(`select count(*) as c from pack_card`);
  check("004: the foreign key still cascades", Number(left.rows[0].c) === 10, `${left.rows[0].c} cards left`);
};

/**
 * 005, over rows written under the visitor_day schema.
 *
 * The interesting cases are the two the migration had to be reordered for: a visitor who
 * suggested without ever spending a counted add, and the instant preserved exactly through
 * a type change.
 */
const visitorOverExistingRows = async (db) => {
  await apply(db, FILES.filter((file) => file < "005"));

  await db.exec(`
    insert into visitor_day (visitor_id, day, adds) values
      ('${V1}', current_date, 2),
      ('${V2}', current_date - 1, 3);
  `);
  await db.query(
    `insert into suggestion (track_uri, name, visitor_id, added_at) values
       ('spotify:track:a','ana',      $1, timestamptz '2026-09-01 04:05:06.789+00'),
       ('spotify:track:b','ana later',$1, timestamptz '2026-09-05 10:00:00+00'),
       ('spotify:track:c','ben',      $2, timestamptz '2026-09-02 01:02:03.004+00'),
       ('spotify:track:d','cy',       $3, timestamptz '2026-09-03 12:00:00+00')`,
    [V1, V2, V3]
  );

  await apply(db, ["005_visitor_and_snapshot.sql"]);

  const v1 = await db.query(`select adds, name from visitor where id = $1`, [V1]);
  check("005: the spent allowance survived the rename", Number(v1.rows[0].adds) === 2, `adds=${v1.rows[0].adds}`);
  check("005: the name backfilled from the most recent suggestion", v1.rows[0].name === "ana later", v1.rows[0].name);

  /* V3 suggested but never had an allowance row. The migration has to give them one before
     it can add the foreign key, and it has to do that BEFORE the name backfill or they end
     up nameless having typed a name every time. */
  const v3 = await db.query(`select day, name from visitor where id = $1`, [V3]);
  check("005: a visitor who never spent an add was given a row", v3.rows.length === 1);
  check("005: with a null day", v3.rows[0]?.day === null);
  check("005: and their name", v3.rows[0]?.name === "cy", v3.rows[0]?.name);

  const converted = await db.query(
    `select added_at_iso_datetime_utc as ts from suggestion where track_uri = 'spotify:track:a'`
  );
  check("005: the instant is preserved exactly", converted.rows[0].ts === "2026-09-01T04:05:06.789Z", converted.rows[0].ts);
  check("005: and comes back a string, not a Date", typeof converted.rows[0].ts === "string");

  const order = await db.query(`select track_uri from suggestion order by added_at_iso_datetime_utc asc`);
  check(
    "005: text sorts chronologically",
    order.rows.map((r) => r.track_uri.slice(-1)).join("") === "acdb",
    order.rows.map((r) => r.track_uri.slice(-1)).join("")
  );

  const refuses = async (label, run) => {
    let refused = false;
    try { await run(); } catch { refused = true; }
    check(label, refused);
  };

  await refuses("005: a non-UTC timestamp is refused", () =>
    db.query(
      `insert into suggestion (track_uri, visitor_id, added_at_iso_datetime_utc)
       values ('x',$1,'2026-09-07T14:00:00+08:00')`, [V1]));
  await refuses("005: a write that forgets the timestamp is refused", () =>
    db.query(`insert into suggestion (track_uri, visitor_id) values ('y',$1)`, [V1]));
  await refuses("005: an unknown visitor is refused", () =>
    db.query(
      `insert into suggestion (track_uri, visitor_id, added_at_iso_datetime_utc)
       values ('z','99999999-9999-4999-8999-999999999999','2026-09-07T14:00:00.000Z')`));

  await db.query(`delete from visitor where id = $1`, [V2]);
  const orphaned = await db.query(`select count(*) as c from suggestion where visitor_id = $1`, [V2]);
  check("005: deleting a visitor takes their suggestions", Number(orphaned.rows[0].c) === 0);
};

/**
 * 006, over a database where the same pack was already opened several times.
 *
 * THE DAY BOUNDARY IS THE CASE WORTH SEEDING. Two of the three rips below are on the
 * previous UTC day and the same Manila day. A backfill that used Postgres's own date would
 * split them into two packs and the collapse would miss them, which is the same mistake the
 * daily add cap was written to avoid.
 */
const onePackOverExistingRows = async (db) => {
  await apply(db, FILES.filter((file) => file < "006"));

  const seed = async (visitor, playlist, iso) => {
    const rip = await db.query(
      `insert into pack_rip (playlist_id, visitor_id, ripped_at_iso_datetime_utc)
       values ($1,$2,$3) returning id`,
      [playlist, visitor, iso]
    );
    for (let s = 0; s < 5; s += 1) {
      await db.query(
        `insert into pack_card (rip_id, track_uri, title, artist, tier, tier_rank, shiny)
         values ($1,$2,'t','a','SILVER',0,false)`,
        [rip.rows[0].id, `uri-${s}`]
      );
    }
  };

  await seed(V1, "playlist-A", "2026-09-06T22:00:00.000Z"); // already the 7th in Manila
  await seed(V1, "playlist-A", "2026-09-06T23:10:00.000Z"); // and so is this
  await seed(V1, "playlist-A", "2026-09-07T01:30:00.000Z");
  await seed(V1, "playlist-B", "2026-09-07T02:00:00.000Z");
  await seed(V2, "playlist-A", "2026-09-07T03:00:00.000Z");

  await apply(db, ["006_one_pack_a_day.sql"]);

  const rips = await db.query(`select playlist_id, visitor_id, day, opens from pack_rip`);
  check("006: three rips of one pack collapsed to one row", rips.rows.length === 3, `${rips.rows.length} rips`);

  const survivor = rips.rows.find((r) => r.playlist_id === "playlist-A" && r.visitor_id === V1);
  check("006: the survivor absorbed the whole tally", Number(survivor.opens) === 3, `opens=${survivor.opens}`);
  check(
    "006: the day is the Manila one, not the UTC one",
    new Date(survivor.day).toISOString().slice(0, 10) === "2026-09-07",
    new Date(survivor.day).toISOString().slice(0, 10)
  );

  const cards = await db.query(`select count(*) as c from pack_card`);
  check("006: the duplicate cards went with the cascade", Number(cards.rows[0].c) === 15, `${cards.rows[0].c} cards`);

  const slots = await db.query(
    `select count(distinct slot) as d, count(*) as n from pack_card group by rip_id`
  );
  check("006: every card has a distinct slot within its pack", slots.rows.every((r) => r.d === r.n));

  let refused = false;
  try {
    await db.query(
      `insert into pack_rip (playlist_id, visitor_id, day, ripped_at_iso_datetime_utc)
       values ('playlist-A',$1,'2026-09-07','2026-09-07T09:00:00.000Z')`, [V1]);
  } catch { refused = true; }
  check("006: a second rip of the same pack on the same day is refused", refused);
};

/**
 * The queries the app actually makes, run against the final schema.
 *
 * THIS IS THE SUITE THAT CATCHES A RENAMED COLUMN. Every statement below is lifted out of
 * a store rather than written here, so the thing being checked is the thing that ships.
 */
const theAppsOwnQueries = async (db) => {
  await apply(db, FILES);

  const reserve = lift(SUGGEST_STORE, "insert into visitor as v");
  const release = lift(SUGGEST_STORE, "update visitor");
  const record = lift(SUGGEST_STORE, "insert into suggestion (");
  const names = lift(SUGGEST_STORE, "select distinct on (s.track_uri)");
  const mine = lift(SUGGEST_STORE, "select id, track_uri, visitor_id");

  const day = "2026-09-07";
  const iso = "2026-09-07T14:07:05.000Z";

  const adds = [];
  for (let i = 0; i < 4; i += 1) {
    adds.push((await db.query(reserve, [V1, "ana", day, 3])).rows.length);
  }
  check("reserveAdd: three allowed, the fourth refused", adds.join("") === "1110", adds.join(""));
  check(
    "reserveAdd: the next day resets",
    (await db.query(reserve, [V1, "ana", "2026-09-08", 3])).rows[0]?.adds == 1
  );
  await db.query(reserve, [V1, null, "2026-09-08", 3]);
  check(
    "reserveAdd: a null name does not erase a stored one",
    (await db.query(`select name from visitor where id = $1`, [V1])).rows[0].name === "ana"
  );

  /* A visitor minted by a pack rip has a null day and has never spent an add. `is distinct
     from` rather than `<>` is what stops their first suggestion being refused. */
  await db.query(`insert into visitor (id, adds) values ($1, 0)`, [V3]);
  check(
    "reserveAdd: a visitor with a null day can spend their first add",
    (await db.query(reserve, [V3, "cy", day, 3])).rows[0]?.adds == 1
  );

  await db.query(release, [V1, "2026-09-08"]);
  check(
    "releaseAdd: puts one back",
    Number((await db.query(`select adds from visitor where id = $1`, [V1])).rows[0].adds) === 1
  );

  await db.query(record, [
    "spotify:track:a", V1, iso, "Song", "Artist", "Album",
    "https://i.scdn.co/x.jpg", "https://open.spotify.com/track/x", 210000,
  ]);
  const looked = await db.query(names, [["spotify:track:a", "spotify:track:none"]]);
  check("namesByUri: joins visitor for the name", looked.rows.length === 1 && looked.rows[0].name === "ana");

  const own = await db.query(mine, [V1, 200]);
  check("suggestionsFor: returns the row with its snapshot", own.rows.length === 1 && own.rows[0].track_name === "Song");
  check("suggestionsFor: the timestamp is ISO UTC text", ISO.test(own.rows[0].added_at_iso_datetime_utc), own.rows[0].added_at_iso_datetime_utc);

  const ripUpsert = lift(DEEPCUTS_STORE, "insert into pack_rip (");
  const cardInsert = lift(DEEPCUTS_STORE, "insert into pack_card (");
  const opened = lift(DEEPCUTS_STORE, "select playlist_id, sum(opens)");
  const rarest = lift(DEEPCUTS_STORE, "select card.title, card.artist, card.tier");
  const total = lift(DEEPCUTS_STORE, "select coalesce(sum(opens), 0)");
  const collection = lift(DEEPCUTS_STORE, "select\n        card.id");

  const rip = async (visitor, playlist, on, at, cards = 5) => {
    const row = await db.query(ripUpsert, [playlist, visitor, on, at]);
    for (let s = 0; s < cards; s += 1) {
      await db.query(cardInsert, [
        row.rows[0].id, s, `uri-${s}`, `card-${s}`, "artist",
        s === 4 ? "GHOST" : "SILVER", s === 4 ? 6 : 0, 100, null, "u", s === 4,
      ]);
    }
    return row.rows[0].id;
  };

  const first = await rip(V1, "playlist-A", day, "2026-09-07T10:00:00.000Z");
  const again = await rip(V1, "playlist-A", day, "2026-09-07T10:05:00.000Z");
  check("recordRip: opening the same pack twice returns the same rip", first === again);
  check(
    "recordRip: and writes no extra cards",
    Number((await db.query(`select count(*) as c from pack_card where rip_id = $1`, [first])).rows[0].c) === 5
  );
  const reopened = await db.query(
    `select opens, ripped_at_iso_datetime_utc as ts from pack_rip where id = $1`, [first]
  );
  check("recordRip: but counts the opening", Number(reopened.rows[0].opens) === 2, `opens=${reopened.rows[0].opens}`);
  check("recordRip: and leaves the first-opened moment alone", reopened.rows[0].ts === "2026-09-07T10:00:00.000Z");

  /* A pack whose cards failed halfway. Without `on conflict do nothing` on the card insert
     this would be short forever, because every later opening finds the rip row. */
  const partial = await rip(V2, "playlist-C", day, "2026-09-07T11:00:00.000Z", 2);
  await rip(V2, "playlist-C", day, "2026-09-07T11:30:00.000Z");
  check(
    "recordRip: a half-written pack fills in its missing cards",
    Number((await db.query(`select count(*) as c from pack_card where rip_id = $1`, [partial])).rows[0].c) === 5
  );

  const top = await db.query(opened);
  check("stats: most opened counts openings, not packs", Number(top.rows[0].rips) === 2, `${top.rows[0].playlist_id}=${top.rows[0].rips}`);
  check("stats: total rips counts openings", Number((await db.query(total)).rows[0].rips) === 4);
  check("stats: rarest card runs", (await db.query(rarest)).rows[0]?.tier === "GHOST");

  const held = await db.query(collection, [V1, 200]);
  check("cardsFor: runs and comes back rarest first", held.rows.length === 5 && held.rows[0].tier === "GHOST");
  check("cardsFor: ripped_at is an ISO string, not a Date", typeof held.rows[0].ripped_at_iso_datetime_utc === "string");
};

/**
 * A migration that fails partway must leave the schema exactly as it was.
 *
 * This is the property migrate.mjs's ledger depends on: a file that did not fully apply
 * has to stay pending, and it can only stay pending if it left nothing behind.
 */
const aFailedMigrationLeavesNothing = async (db) => {
  await apply(db, FILES.slice(0, -1));
  const before = await db.query(
    `select column_name from information_schema.columns
      where table_name = 'pack_rip' order by column_name`
  );

  await db.exec("begin");
  let threw = false;
  try {
    await db.exec(`${sqlOf(FILES[FILES.length - 1])}\nselect this_is_not_a_function();`);
    await db.exec("commit");
  } catch {
    threw = true;
    await db.exec("rollback");
  }
  check("a broken migration does not commit", threw);

  const after = await db.query(
    `select column_name from information_schema.columns
      where table_name = 'pack_rip' order by column_name`
  );
  check(
    "and the schema is byte for byte what it was",
    before.rows.map((r) => r.column_name).join(",") === after.rows.map((r) => r.column_name).join(","),
    after.rows.map((r) => r.column_name).join(",")
  );
};

/* ---------------- the runner ---------------- */

const SUITES = [
  ["a fresh database", freshDatabase],
  ["004, over rows that already existed", uuidOverExistingRows],
  ["005, over rows that already existed", visitorOverExistingRows],
  ["006, over a pack opened more than once", onePackOverExistingRows],
  ["the app's own queries", theAppsOwnQueries],
  ["a failed migration", aFailedMigrationLeavesNothing],
];

const run = async () => {
  const probe = new PGlite();
  const version = await probe.query("select version()");
  console.log(`${version.rows[0].version.split(",")[0]}`);
  console.log(`${FILES.length} migration(s): ${FILES.join(", ")}\n`);
  await probe.close();

  for (const [name, suite] of SUITES) {
    console.log(`— ${name}`);
    const db = new PGlite();
    try {
      await suite(db);
    } catch (error) {
      failures += 1;
      console.log(` FAIL  the suite threw  ->  ${error.message}`);
    } finally {
      await db.close();
    }
    console.log("");
  }

  if (failures) {
    console.error(`${failures} of ${checks} checks failed.`);
    process.exit(1);
  }

  console.log(`${checks} checks passed. Safe to run pnpm db:migrate.`);
};

run().catch((error) => {
  console.error("db-verify failed to run:", error.message);
  process.exit(1);
});
