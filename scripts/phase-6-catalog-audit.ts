// Keep the archived CR-016/051 comparator available for the rollback baseline.
// The active P7 audit pins the additive CR-053/054/056 catalog independently.
import { runCatalogAudit } from './trivia-v2-catalog-audit.js';

await runCatalogAudit();
