-- search_transcripts RPC
-- Called from the search page and API route.
-- Returns media assets ranked by full-text relevance with HTML snippet.

CREATE OR REPLACE FUNCTION search_transcripts(vault UUID, query TEXT)
RETURNS TABLE (
  id              UUID,
  title           TEXT,
  recorded_at     TIMESTAMPTZ,
  mime_type       TEXT,
  duration_seconds INT,
  snippet         TEXT,
  person          JSONB
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  tsq TSQUERY := plainto_tsquery('english', query);
BEGIN
  RETURN QUERY
    SELECT
      ma.id,
      ma.title,
      ma.recorded_at,
      ma.mime_type,
      ma.duration_seconds,
      ts_headline(
        'english',
        COALESCE(t.full_text, ''),
        tsq,
        'MaxFragments=1,MaxWords=20,StartSel=<mark>,StopSel=</mark>'
      ) AS snippet,
      jsonb_build_object(
        'id',          p.id,
        'given_name',  p.given_name,
        'family_name', p.family_name
      ) AS person
    FROM transcripts t
    JOIN media_assets ma ON ma.id = t.media_asset_id
    JOIN people p ON p.id = ma.person_id
    WHERE
      ma.vault_id = vault
      AND to_tsvector('english', COALESCE(t.full_text, '')) @@ tsq
    ORDER BY
      ts_rank(to_tsvector('english', COALESCE(t.full_text, '')), tsq) DESC
    LIMIT 30;
END;
$$;
