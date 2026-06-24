const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = 3001;

function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const encodedUrl = url.searchParams.get('url');
  const method = (url.searchParams.get('method') || 'GET').toUpperCase();

  if (!encodedUrl) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'alive' }));
  }

  let targetUrl;
  try {
    const standard = encodedUrl.replace(/-/g, '+').replace(/_/g, '/');
    targetUrl = Buffer.from(standard, 'base64').toString('utf8');
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'bad base64' }));
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'invalid url' }));
  }

  const requester = parsed.protocol === 'https:' ? https : http;
  const isApi = parsed.hostname.includes('api.') || parsed.hostname.includes('graphql.') || parsed.pathname.startsWith('/api/') || parsed.pathname.includes('/v1');

  const options = {
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname + parsed.search,
    method: method,
    headers: {
      'User-Agent': isApi ? 'MiMangaDinamita/1.2.0' : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
      'Accept': isApi ? 'application/json, */*' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'identity',
    }
  };
  if (!isApi) {
    options.headers['Referer'] = parsed.origin + '/';
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    if (method === 'POST') {
      options.headers['Content-Type'] = req.headers['content-type'] || 'application/x-www-form-urlencoded';
      options.headers['X-Requested-With'] = 'XMLHttpRequest';
      if (body) options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const proxyReq = requester.request(options, proxyRes => {
      const chunks = [];
      proxyRes.on('data', c => chunks.push(c));
      proxyRes.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = proxyRes.headers['content-type'] || 'text/html';
        res.writeHead(proxyRes.statusCode, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=60',
        });
        res.end(buffer);
      });
    });

    proxyReq.on('error', e => {
      res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: e.message, url: targetUrl }));
    });

    proxyReq.setTimeout(25000, () => {
      proxyReq.destroy();
      res.writeHead(504, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'timeout' }));
    });

    if (method === 'POST' && body) proxyReq.write(body);
    proxyReq.end();
  });
}

http.createServer(handler).listen(PORT, () => {
  console.log(`Dev proxy running on http://localhost:${PORT}`);
});
