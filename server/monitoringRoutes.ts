import { Router, type Request, type Response } from 'express';
import { requireAuth } from './auth.js';
import { logFilePath, tailLog } from './services/vpsLogs.js';

/** /api/admin/monitoring/*: read-only server logs for the admin panel. */
const monitoringRouter = Router();
monitoringRouter.use(requireAuth);
monitoringRouter.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

monitoringRouter.get('/logs', async (req: Request, res: Response) => {
  const stream = req.query.stream === 'out' ? 'out' : 'error';
  const limit = Math.min(Math.max(Number(req.query.lines) || 200, 50), 1000);
  const query = typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : '';
  try {
    res.json(await tailLog(logFilePath(stream), limit, query));
  } catch (err: any) {
    console.error('[admin/monitoring] Failed to read logs:', err.message);
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

export default monitoringRouter;
