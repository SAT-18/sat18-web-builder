const express = require('express');
const next = require('next');

const port = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  // A simple route for checking server status
  server.get('/ping', (req, res) => {
    res.send('Server SAT18 Web Builder aktif!');
  });

  // Handle all other requests with Next.js
  server.all('*', (req, res) => handle(req, res));

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
});
