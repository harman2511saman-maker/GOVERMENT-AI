export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Block access to hidden, system, or sensitive files (.sh, .py, .env, .git, etc.)
    const blockedPattern = /\.(sh|py|env|sql|bak|git|config|conf|log|key|pem|cert)$/i;
    if (blockedPattern.test(url.pathname) || url.pathname.includes('/.')) {
      return new Response('403 Forbidden: Access Denied', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // Helper to append standard security headers
    function addSecurityHeaders(response) {
      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-Content-Type-Options', 'nosniff');
      newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
      newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      newHeaders.set('X-XSS-Protection', '1; mode=block');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    // 2. Proxy API requests directly to DigitalOcean Droplet backend (sslip.io)
    if (url.pathname.startsWith('/api/')) {
      const targetUrl = new URL(url.pathname + url.search, 'http://164-92-207-159.sslip.io');
      const headers = new Headers(request.headers);
      headers.set('Host', '164-92-207-159.sslip.io');

      const backendReq = new Request(targetUrl.toString(), {
        method: request.method,
        headers: headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'follow',
      });

      const backendResp = await fetch(backendReq);
      return addSecurityHeaders(backendResp);
    }

    // 3. Serve static assets from frontend/dist (SPA routing)
    const assetResp = await env.ASSETS.fetch(request);
    return addSecurityHeaders(assetResp);
  },
};
