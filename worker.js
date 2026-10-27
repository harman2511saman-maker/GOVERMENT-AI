export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy API requests directly to the Render backend
    if (url.pathname.startsWith('/api/')) {
      const targetUrl = new URL(url.pathname + url.search, 'https://goverment-ai.onrender.com');
      const headers = new Headers(request.headers);
      headers.set('Host', 'goverment-ai.onrender.com');

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
