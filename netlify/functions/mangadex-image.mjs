export async function handler(event) {
  const imageUrl = event.queryStringParameters?.url;

  if (!imageUrl) {
    return { statusCode: 400, body: 'Missing url parameter' };
  }

  let hostname;
  try {
    hostname = new URL(imageUrl).hostname;
  } catch {
    return { statusCode: 400, body: 'Invalid url' };
  }

  if (!hostname.endsWith('.mangadex.org') && !hostname.endsWith('.mangadex.network')) {
    return { statusCode: 403, body: 'Domain not allowed' };
  }

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return { statusCode: response.status, body: 'Upstream error' };
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
      body: Buffer.from(buffer).toString('base64'),
      isBase64Encoded: true,
    };
  } catch {
    return { statusCode: 502, body: 'Failed to fetch image' };
  }
}
