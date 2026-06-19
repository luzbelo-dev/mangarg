exports.handler = async function(event) {
  var q = event.queryStringParameters && event.queryStringParameters.q;

  if (!q) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        status: "alive",
        params: event.queryStringParameters,
        path: event.path
      })
    };
  }

  var targetUrl;
  try {
    var standard = q.replace(/-/g, "+").replace(/_/g, "/");
    targetUrl = Buffer.from(standard, "base64").toString("utf8");
  } catch(e) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "bad base64", q: q })
    };
  }

  if (targetUrl.indexOf("https://api.mangadex.org") !== 0) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "domain not allowed", url: targetUrl })
    };
  }

  var https = require("https");

  return new Promise(function(resolve) {
    var parsed = new (require("url").URL)(targetUrl);
    https.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: { "User-Agent": "MiMangaDinamita/1.0" }
    }, function(res) {
      var data = "";
      res.on("data", function(c) { data += c; });
      res.on("end", function() {
        resolve({
          statusCode: res.statusCode,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: data
        });
      });
    }).on("error", function(e) {
      resolve({
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: e.message })
      });
    });
  });
};
