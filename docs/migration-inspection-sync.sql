-- Guarantees one canonical off-chain inspection row per on-chain batch.
-- Run the duplicate preflight first. Resolve any returned rows before creating the index.

SELECT batch_id, count(*) AS inspection_count
FROM public.inspections
GROUP BY batch_id
HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS inspections_batch_id_unique
  ON public.inspections (batch_id);

-- No RLS policy is changed. Inspector synchronization is performed by the
-- authenticated, chain-verifying server route, which uses the service role only
-- after confirming the caller's active Inspector profile and on-chain wallet.
