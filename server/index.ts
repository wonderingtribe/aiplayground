import express from 'express';
import cors from 'cors';
import { validateWonderlandKey } from './wonderland-keys';
import { callModel, callModelStreaming } from './providers/registry';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

app.use(cors());

// Stripe webhook — only mount if Stripe key is configured
if (process.env.STRIPE_API_KEY || process.env.STRIPE_SECRET_KEY) {
  const { default: stripeWebhook } = await import('./stripe-webhook');
  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);
}

app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const { model, messages, config, wonderlandKey } = req.body;

  if (!model || !messages) {
    res.status(400).json({ error: 'Missing required fields: model, messages' });
    return;
  }

  if (!wonderlandKey) {
    res.status(401).json({ error: 'Missing Wonderland key. Provide wonderlandKey in request body.' });
    return;
  }

  if (!validateWonderlandKey(wonderlandKey)) {
    res.status(403).json({ error: 'Invalid Wonderland key.' });
    return;
  }

  try {
    const result = await callModel(model, messages, config || {});
    res.json(result);
  } catch (err: any) {
    console.error(`/api/chat error for model ${model}:`, err.message);
    res.status(502).json({ error: err.message || 'Upstream provider error.' });
  }
});

app.post('/api/chat/stream', async (req, res) => {
  const { model, messages, config, wonderlandKey } = req.body;

  if (!model || !messages) {
    res.status(400).json({ error: 'Missing required fields: model, messages' });
    return;
  }

  if (!wonderlandKey) {
    res.status(401).json({ error: 'Missing Wonderland key.' });
    return;
  }

  if (!validateWonderlandKey(wonderlandKey)) {
    res.status(403).json({ error: 'Invalid Wonderland key.' });
    return;
  }

  try {
    const providerResponse = await callModelStreaming(model, messages, config || {});

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const reader = providerResponse.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }
    res.end();
  } catch (err: any) {
    console.error(`/api/chat/stream error for model ${model}:`, err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: err.message || 'Upstream provider error.' });
    } else {
      res.end();
    }
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

app.listen(PORT, () => {
  console.log(`Wonderland proxy server running on port ${PORT}`);
});
