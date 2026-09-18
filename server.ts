import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Ensure SUPABASE_URL points to the API endpoint rather than the dashboard or db host
if (process.env.SUPABASE_URL) {
  let url = process.env.SUPABASE_URL.trim().replace(/\/$/, '');
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/);
  if (dashboardMatch) {
    process.env.SUPABASE_URL = `https://${dashboardMatch[1]}.supabase.co`;
  } else if (url.startsWith('db.')) {
    process.env.SUPABASE_URL = `https://${url.replace(/^db\./, '')}`;
  } else if (!url.startsWith('http')) {
    process.env.SUPABASE_URL = `https://${url}`;
  }
}

// @ts-ignore
import apiRoutes from './backend/src/routes/index.js';
// @ts-ignore
import regenModule from './backend/src/jobs/apRegen.js';
const { startApRegenJob } = regenModule;

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Global Middlewares
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      game: 'TAG: The Assassination Game',
      timestamp: new Date().toISOString(),
    });
  });

  // Download route for master briefing and roadmap document
  app.get('/TAG_PROJECT_MASTER_BRIEFING_AND_ROADMAP.md', (req, res) => {
    const filePath = path.join(process.cwd(), 'public', 'TAG_PROJECT_MASTER_BRIEFING_AND_ROADMAP.md');
    res.download(filePath, 'TAG_PROJECT_MASTER_BRIEFING_AND_ROADMAP.md');
  });

  // Mount existing TAG backend API routes
  app.use('/api', apiRoutes);

  // Start scheduled hourly AP regen & tag cleanup background job
  try {
    startApRegenJob();
  } catch (cronErr) {
    console.warn('[AP Regen] Cron notice:', cronErr);
  }

  // Vite middleware for frontend development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TAG Game Engine] Live server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Fatal Error]', err);
  process.exit(1);
});
