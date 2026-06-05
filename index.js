import { Router } from 'express';
import reference from './reference.js';
import listings from './listings.js';
import explore from './explore.js';
import alerts from './alerts.js';
import auth from './auth.js';
import operator from './operator.js';

const router = Router();

router.get('/', (req, res) =>
  res.json({ name: 'PanAfricanMines API', version: 'v1', status: 'ok' })
);

router.use('/reference', reference);
router.use('/listings', listings);
router.use('/explore', explore);
router.use('/alerts', alerts);
router.use('/auth', auth);
router.use('/operator', operator);

export default router;
