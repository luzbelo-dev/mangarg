var guard = require("./_ssrf-guard");

var MAX_RESPONSE_BYTES = 15 * 1024 * 1024; // 15 MB - evita agotar memoria/cuota de Netlify

function json(status, obj) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(obj)
  };
}

exports.handler = async function(event) {
  var params = event.queryStringParameters || {};
  var encodedUrl = params.url;
  var method = (params.method || "GET").toUpperCase();

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
        "Access-Control-Max-Age": "86400"
      },
      body: ""
    };
  }

  if (!encodedUrl) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ status: "alive" })
    };
  }

  var targetUrl;
  try {
    var standard = encodedUrl.replace(/-/g, "+").replace(/_/g, "/");
    targetUrl = Buffer.from(standard, "base64").toString("utf8");
  } catch(e) {
    return json(400, { error: "bad base64" });
  }

  // Referer explicito (base64url) para imagenes con proteccion anti-hotlink:
  // el CDN exige el origin del SITIO, no el del propio CDN.
  var refererOverride = null;
  if (params.referer) {
    try {
      var refStd = params.referer.replace(/-/g, "+").replace(/_/g, "/");
      var decodedRef = Buffer.from(refStd, "base64").toString("utf8");
      var refParsed = new (require("url").URL)(decodedRef);
      if (refParsed.protocol === "http:" || refParsed.protocol === "https:") {
        refererOverride = refParsed.origin + "/";
      }
    } catch(e) { /* referer invalido: se ignora y se usa el default */ }
  }

  var parsed;
  try {
    parsed = new (require("url").URL)(targetUrl);
  } catch(e) {
    return json(400, { error: "invalid url" });
  }

  // SSRF: solo http/https. Bloquea file:, ftp:, gopher:, etc.
  if (!guard.assertAllowedProtocol(parsed)) {
    return json(400, { error: "protocol not allowed" });
  }

  var https = require("https");
  var http = require("http");
  var requester = parsed.protocol === "https:" ? https : http;

  return new Promise(function(resolve) {
    var isApi = parsed.hostname.includes("api.") || parsed.hostname.includes("graphql.") || parsed.pathname.startsWith("/api/") || parsed.pathname.includes("/v1");
    var isMangaSite = !isApi;
    var options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: method,
      // SSRF: resuelve el DNS y valida que la IP no sea privada/reservada
      // antes de conectar; net.connect usa esta misma IP validada.
      lookup: guard.safeLookup,
      headers: {
        "User-Agent": isApi ? "Mangarg/1.5.0" : "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "Accept": isApi ? "application/json, */*" : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      }
    };
    if (refererOverride) {
      options.headers["Referer"] = refererOverride;
    } else if (isMangaSite) {
      options.headers["Referer"] = parsed.origin + "/";
    }

    if (method === "POST") {
      options.headers["Content-Type"] = event.headers["content-type"] || "application/x-www-form-urlencoded";
      options.headers["X-Requested-With"] = "XMLHttpRequest";
      if (event.body) {
        options.headers["Content-Length"] = Buffer.byteLength(event.body);
      }
    }

    var req = requester.request(options, function(res) {
      var chunks = [];
      var total = 0;
      var aborted = false;
      res.on("data", function(c) {
        if (aborted) return;
        total += c.length;
        if (total > MAX_RESPONSE_BYTES) {
          aborted = true;
          req.destroy();
          resolve(json(413, { error: "response too large" }));
          return;
        }
        chunks.push(c);
      });
      res.on("end", function() {
        if (aborted) return;
        var buffer = Buffer.concat(chunks);
        var contentType = res.headers["content-type"] || "text/html";
        var isText = contentType.includes("text") || contentType.includes("json") || contentType.includes("xml") || contentType.includes("javascript");

        resolve({
          statusCode: res.statusCode,
          headers: {
            "Content-Type": contentType,
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=60"
          },
          body: isText ? buffer.toString("utf8") : buffer.toString("base64"),
          isBase64Encoded: !isText
        });
      });
    });

    req.on("error", function(e) {
      resolve({
        statusCode: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: e.message, url: targetUrl })
      });
    });

    req.setTimeout(25000, function() {
      req.destroy();
      resolve({
        statusCode: 504,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "timeout" })
      });
    });

    if (method === "POST" && event.body) {
      req.write(event.body);
    }

    req.end();
  });
};
