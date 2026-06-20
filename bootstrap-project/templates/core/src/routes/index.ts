import { Router } from 'express';
import { healthRouter } from './health.js';

/**
 * Top-level router. Mounts health endpoints at /health (no auth, no version
 * header) and reserves {{API_BASE}} for future feature routers that land via /run-issue.
 */
export const router = Router();

router.use('/', healthRouter);

// Feature routers will mount under {{API_BASE}} here, e.g.:
//   router.use('{{API_BASE}}/<feature>', <feature>Router);
