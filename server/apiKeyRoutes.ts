import { Router, type Request, type Response } from 'express';
import { requireAuth } from './auth.js';
import {
  apiKeysRequired,
  clearDemoKey,
  createApiKey,
  demoKeyStatus,
  isApiId,
  listApiKeys,
  revokeApiKey,
  setApiKeysRequired,
  setDemoKey,
} from './services/apiKeys.js';
import { BACKENDS } from './services/backends/registry.js';

/** Admin management of API keys. A key's value is returned only by the POST that creates it. */
const apiKeyRouter = Router();
apiKeyRouter.use(requireAuth);
apiKeyRouter.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

apiKeyRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    apis: BACKENDS.map(({ id, label }) => ({ id, label })),
    keys: listApiKeys(),
    demoKeys: demoKeyStatus(),
    required: apiKeysRequired(),
  });
});

apiKeyRouter.post('/', (req: Request, res: Response) => {
  const { api, name, useForDemo } = req.body ?? {};
  const label = typeof name === 'string' ? name.trim().slice(0, 80) : '';
  if (!isApiId(api) || !label) {
    res.status(400).json({ error: 'Choose an API and a name for the key.' });
    return;
  }
  const created = createApiKey(api, label);
  if (useForDemo) setDemoKey(api, created.key);
  res.status(201).json(created);
});

apiKeyRouter.delete('/:id', (req: Request, res: Response) => {
  if (!revokeApiKey(Number(req.params.id))) {
    res.status(404).json({ error: 'Key not found or already revoked.' });
    return;
  }
  res.json({ success: true });
});

/** Empty key clears the demo key. Only an active key of that API is accepted. */
apiKeyRouter.put('/demo/:api', (req: Request, res: Response) => {
  const { api } = req.params;
  const key = typeof req.body?.key === 'string' ? req.body.key.trim() : '';
  if (!isApiId(api)) {
    res.status(404).json({ error: 'Unknown API.' });
    return;
  }
  if (!key) {
    if (apiKeysRequired()) {
      res.status(409).json({ error: 'Turn off the API key requirement before removing a demo key.' });
      return;
    }
    clearDemoKey(api);
    res.json({ success: true });
    return;
  }
  if (!setDemoKey(api, key)) {
    res.status(400).json({ error: 'That is not an active key for this API.' });
    return;
  }
  res.json({ success: true });
});

apiKeyRouter.put('/required', (req: Request, res: Response) => {
  const result = setApiKeysRequired(req.body?.required === true);
  if (!result.ok) {
    res.status(409).json({ error: `Set a demo key first for: ${result.missing.join(', ')}.` });
    return;
  }
  res.json({ success: true });
});

export default apiKeyRouter;
