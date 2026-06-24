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
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "bad base64" })
    };
  }

  var parsed;
  try {
    parsed = new (require("url").URL)(targetUrl);
  } catch(e) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "invalid url" })
    };
  }

  var https = require("https");
  var http = require("http");
  var requester = parsed.protocol === "https:" ? https : http;

  return new Promise(function(resolve) {
    var isApi = parsed.hostname.includes("api.") || parsed.pathname.startsWith("/api/") || parsed.pathname.includes("/v1");
    var options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: method,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "Accept": isApi ? "application/json, */*" : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Referer": parsed.origin + "/"
      }
    };

    if (method === "POST") {
      options.headers["Content-Type"] = event.headers["content-type"] || "application/x-www-form-urlencoded";
      options.headers["X-Requested-With"] = "XMLHttpRequest";
      if (event.body) {
        options.headers["Content-Length"] = Buffer.byteLength(event.body);
      }
    }

    var req = requester.request(options, function(res) {
      var chunks = [];
      res.on("data", function(c) { chunks.push(c); });
      res.on("end", function() {
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
