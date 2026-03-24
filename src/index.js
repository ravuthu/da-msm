export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Extract fallback from query param
    const fallback = url.searchParams.get('fallback');

    // Remove fallback param from the URL we'll proxy
    url.searchParams.delete('fallback');
    const search = url.searchParams.toString();
    const queryString = search ? `?${search}` : '';

    // Parse path: /org/site/rest/of/path
    const pathParts = url.pathname.split('/').filter(Boolean);
    const primaryOrg = pathParts[0];
    const primarySite = pathParts[1];
    const restOfPath = '/' + pathParts.slice(2).join('/');

    // Clone body for potential fallback use
    const body = request.body ? await request.arrayBuffer() : null;

    // Build headers, explicitly preserving Authorization
    const headers = new Headers();
    for (const [key, value] of request.headers) {
      headers.set(key, value);
    }

    // Try primary origin
    const primaryPath = `/${primaryOrg}/${primarySite}${restOfPath}${queryString}`;
    const primaryUrl = env.CONTENT_ORIGIN + primaryPath;
    const primaryResponse = await fetch(primaryUrl, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
    });

    // If primary returns 404 and we have a fallback, try it
    if (primaryResponse.status === 404 && fallback) {
      const fallbackBase = fallback.replace(/\/$/, '');
      const fallbackPath = `${fallbackBase}${restOfPath}${queryString}`;
      const fallbackUrl = env.CONTENT_ORIGIN + fallbackPath;
      return fetch(fallbackUrl, {
        method: request.method,
        headers,
        body,
        redirect: 'manual',
      });
    }

    return primaryResponse;
  },
};
