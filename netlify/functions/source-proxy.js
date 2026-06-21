exports.handler = async function(event) {
  var params = event.queryStringParameters || {};
  var encodedUrl = params.url;
  var method = (params.method || "GET").toUpperCase();

  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400"
      },
      body: ""
    };
  }

  if (!encodedUrl) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        status: "alive",
        params: params,
        path: event.path
      })
    };
  }

  var targetUrl;
  try {
    var standard = encodedUrl.replace(/-/g, "+").replace(/_/g, "/");
    targetUrl = Buffer.from(standard, "base64").toString("utf8");
  } catch(e) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "bad base64", url: encodedUrl })
    };
  }

  // Whitelist of allowed domains
  var allowedDomains = [
    "api.comick.fun",
    "kitsu.io",
    "graphql.anilist.co",
    "api.mangaupdates.com",
    "api.mangadex.org",
    "meo.comick.pictures",
    "media.kitsu.app"
  ];

  var parsed;
  try {
    parsed = new (require("url").URL)(targetUrl);
  } catch(e) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "invalid url", url: targetUrl })
    };
  }

  var domainAllowed = false;
  for (var i = 0; i < allowedDomains.length; i++) {
    if (parsed.hostname === allowedDomains[i]) {
      domainAllowed = true;
      break;
    }
  }

  if (!domainAllowed) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "domain not allowed", url: targetUrl })
    };
  }

  var https = require("https");
  var http = require("http");
  var requester = parsed.protocol === "https:" ? https : http;

  return new Promise(function(resolve) {
    var options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: method,
      headers: {
        "User-Agent": "MiMangaDinamita/1.0"
      }
    };

    if (method === "POST") {
      options.headers["Content-Type"] = "application/json";
      if (event.body) {
        options.headers["Content-Length"] = Buffer.byteLength(event.body);
      }
    }

    var req = requester.request(options, function(res) {
      var data = "";
      res.on("data", function(c) { data += c; });
      res.on("end", function() {
        resolve({
          statusCode: res.statusCode,
          headers: {
            "Content-Type": res.headers["content-type"] || "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300"
          },
          body: data
        });
      });
    });

    req.on("error", function(e) {
      resolve({
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: e.message })
      });
    });

    if (method === "POST" && event.body) {
      req.write(event.body);
    }

    req.end();
  });
};
