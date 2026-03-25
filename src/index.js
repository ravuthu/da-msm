export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Extract base from query param (support both 'base' and 'fallback' for backwards compatibility)
    const base = url.searchParams.get('base') || url.searchParams.get('fallback');

    // Remove base params from the URL we'll proxy
    url.searchParams.delete('base');
    url.searchParams.delete('fallback');
    const search = url.searchParams.toString();
    const queryString = search ? `?${search}` : '';

    // Parse path: /org/site/rest/of/path
    const pathParts = url.pathname.split('/').filter(Boolean);
    const satelliteOrg = pathParts[0];
    const satelliteSite = pathParts[1];
    const restOfPath = '/' + pathParts.slice(2).join('/');

    // Clone body for potential base fallback use
    const body = request.body ? await request.arrayBuffer() : null;

    // Build headers, explicitly preserving Authorization
    const headers = new Headers();
    for (const [key, value] of request.headers) {
      headers.set(key, value);
    }

    // Try satellite site
    const satellitePath = `/${satelliteOrg}/${satelliteSite}${restOfPath}${queryString}`;
    const satelliteUrl = env.CONTENT_ORIGIN + satellitePath;
    const satelliteResponse = await fetch(satelliteUrl, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
    });

    // If satellite returns 404 and we have a base, try it
    if (satelliteResponse.status === 404 && base) {
      const basePath = base.replace(/\/$/, '');
      const baseUrl = `${env.CONTENT_ORIGIN}${basePath}${restOfPath}${queryString}`;
      return fetch(baseUrl, {
        method: request.method,
        headers,
        body,
        redirect: 'manual',
      });
    }

    return satelliteResponse;
  },
};
