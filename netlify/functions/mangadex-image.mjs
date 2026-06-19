export default async (req) => {
  const url = new URL(req.url);
  const imageUrl = url.searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  const allowed = ['uploads.mangadex.org', 'cmdxd98sb0x3yprd.mangadex.network'];
  let hostname;
  try {
    hostname = new URL(imageUrl).hostname;
  } catch {
    return new Response('Invalid url', { status: 400 });
  }

  if (!hostname.endsWith('.mangadex.org') && !hostname.endsWith('.mangadex.network')) {
    return new Response('Domain not allowed', { status: 403 });
  }

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return new Response('Upstream error', { status: response.status });
    }

    const body = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response('Failed to fetch image', { status: 502 });
  }
};

export const config = {
  path: '/.netlify/functions/mangadex-image',
};
