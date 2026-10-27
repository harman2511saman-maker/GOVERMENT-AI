export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve deploy.sh as raw shell script for droplet bootstrap
    if (url.pathname === '/deploy.sh') {
      const asset = await env.ASSETS.fetch(request);
      const text = await asset.text();
      return new Response(text, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-store'
        }
      });
    }

    // Proxy API requests directly to DigitalOcean Droplet backend (Frankfurt)
    if (url.pathname.startsWith('/api/')) {
      const targetUrl = new URL(url.pathname + url.search, 'http://164.92.207.159');
      const headers = new Headers(request.headers);
      headers.set('Host', '164.92.207.159');

      const backendReq = new Request(targetUrl.toString(), {
        method: request.method,
        headers: headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'follow',
      });

      return fetch(backendReq);
    }

    // Serve static assets from frontend/dist (SPA routing)
    return env.ASSETS.fetch(request);
  },
};
