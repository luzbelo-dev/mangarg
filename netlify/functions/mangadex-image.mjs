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

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return { statusCode: response.status, body: 'Upstream error: ' + response.status };
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
      body: base64,
      isBase64Encoded: true,
    };
  } catch (err) {
    return { statusCode: 502, body: 'Fetch failed: ' + err.message };
  }
}
