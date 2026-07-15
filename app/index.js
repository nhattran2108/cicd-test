const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const version = process.env.APP_VERSION || 'dev';

app.get('/', (req, res) => {
  res.json({ message: 'Hello from sample-app', version, hostname: require('os').hostname() });
});

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`sample-app listening on port ${port}`);
});
