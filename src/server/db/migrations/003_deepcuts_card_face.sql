-- What a card LOOKED like, not just what it was.
--
-- 002 recorded enough to answer the two figures at the top of /lab/deepcuts: which
-- playlist is opened most, and the rarest card anybody has pulled. Both are one line of
-- text, so a title, an artist and a rung were enough.
--
-- The collection tab is not one line of text. It renders the card FACE - album cover,
-- rung, plays, and the holographic finish if it rolled one - for every card a visitor has
-- pulled, and none of those three columns existed. Re-deriving them was the alternative
-- and it is not a real one: it would mean a Spotify lookup per stored card, on a page
-- load, for artwork that was already in hand at the moment the card was dealt.
--
-- SAME RULE AS 002, AND THIS IS WHERE IT EARNS ITS KEEP. A card is a thing that happened,
-- so it keeps what was printed on it at the time. When Spotify re-issues an album with new
-- artwork, the card in somebody's collection keeps the cover it was pulled with. That is
-- not stale data; that is what a card is.

-- The album cover, as an i.scdn.co URL. Host-checked by pickAlbumArt in the Spotify
-- mappers before it ever reaches here, and the page's CSP is the second lock.
--
-- Nullable, because a track genuinely can have no artwork and the card renders a quiet
-- square instead.
alter table pack_card add column if not exists album_art text;

-- Where the song opens on Spotify. Free to have kept all along: it rides on the track
-- projection the pack was dealt from.
alter table pack_card add column if not exists track_url text;

-- WHETHER IT CAME OUT SHINY, which is the one field here that is not cosmetic.
--
-- Shiny is a second, independent roll made after the rung is decided - see SHINY_ODDS -
-- so it cannot be recomputed from anything else in the row. A ghost is a ghost; whether
-- THIS ghost was the one in two hundred that came out holographic is a coin that was
-- flipped once, and if it is not written here it is gone.
--
-- not null with a default, so every row 002 already wrote reads as a plain card, which
-- is what those cards were: nothing dealt before this column existed recorded a finish,
-- and false is the honest answer rather than unknown.
alter table pack_card add column if not exists shiny boolean not null default false;

-- The collection tab reads one visitor's cards, rarest first. That is a join from
-- pack_card back to pack_rip for the visitor, so the foreign key wants an index from the
-- other direction: 002 indexed pack_rip by playlist, and nothing indexed it by visitor.
create index if not exists pack_rip_visitor_id_idx on pack_rip (visitor_id);
