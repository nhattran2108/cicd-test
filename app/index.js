const express = require('express');
const os = require('os');
const app = express();
const port = process.env.PORT || 3000;
const version = process.env.APP_VERSION || 'dev';

app.get('/', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>sample-app-v1</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .card { background: #1e293b; padding: 2.5rem 3rem; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); text-align: center; }
  h1 { margin: 0 0 0.5rem; font-size: 1.75rem; }
  .badge { display: inline-block; margin-top: 1rem; padding: 0.25rem 0.75rem; border-radius: 999px; background: #16a34a; color: white; font-size: 0.85rem; }
  dl { margin-top: 1.5rem; text-align: left; }
  dt { color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; margin-top: 0.75rem; }
  dd { margin: 0.1rem 0 0; font-size: 1rem; }
</style>
</head>
<body>
  <div class="card">
    <h1>sample-app-v1</h1>
    <span class="badge">running</span>
    <dl>
      <dt>Version</dt><dd>${version}</dd>
      <dt>Hostname</dt><dd>${os.hostname()}</dd>
      <dt>Uptime</dt><dd>${Math.floor(process.uptime())}s</dd>
    </dl>
  </div>
</body>
</html>`);
});

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`sample-app listening on port ${port}`);
});
