import { Router } from 'express';

export const metricsRouter = Router();

metricsRouter.get('/metrics', (_req, res) => {
  const mem = process.memoryUsage();
  const lines = [
    '# HELP process_uptime_seconds Process uptime in seconds',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds ${process.uptime()}`,
    '# HELP process_resident_memory_bytes Resident memory in bytes',
    '# TYPE process_resident_memory_bytes gauge',
    `process_resident_memory_bytes ${mem.rss}`,
  ];
  res.type('text/plain; version=0.0.4').send(`${lines.join('\n')}\n`);
});