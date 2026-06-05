import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

router.get('/healthz', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

router.get('/readyz', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not-ready' });
  }
});

export default router;
