-- Week 7: Dynamic emoji usage stats (platform-wide)
-- Returns the most common title-keyword → icon mapping across all expenses.

-- RPC function: returns aggregated emoji usage stats across the entire platform.
-- Each row: keyword (lowercase first word of expense title), icon, usage count.
CREATE OR REPLACE FUNCTION get_emoji_usage_stats()
RETURNS TABLE (keyword text, icon text, usage_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    lower(trim(split_part(e.title, ' ', 1))) AS keyword,
    e.icon,
    count(*) AS usage_count
  FROM expenses e
  WHERE e.deleted_at IS NULL
    AND e.icon IS NOT NULL
    AND e.icon <> '📝'          -- exclude default/generic icon
    AND length(trim(e.title)) > 0
  GROUP BY lower(trim(split_part(e.title, ' ', 1))), e.icon
  HAVING count(*) >= 2          -- only patterns used at least twice
  ORDER BY usage_count DESC
  LIMIT 200;                    -- cap result size
$$;
