const https = require("https");

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  var b64 = (event.queryStringParameters || {}).q;

  if (!b64) {
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Missing q parameter",
        receivedKeys: Object.keys(params),
        rawQuery: event.rawQuery || "none",
        rawUrl: event.rawUrl || "none",
        path: event.path || "none",
        httpMethod: event.httpMethod || "none",
      }),
    };
  }

  var targetUrl;
  try {
    targetUrl = Buffer.from(b64, "base64").toString("utf8");
  } catch (e) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Invalid base64" }),
    };
  }

  if (targetUrl.indexOf("https://api.mangadex.org") !== 0) {
    return {
      statusCode: 403,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Only api.mangadex.org allowed" }),
    };
  }

  return new Promise(function (resolve) {
    https
      .get(targetUrl, function (response) {
        var chunks = [];

        response.on("data", function (chunk) {
          chunks.push(chunk);
        });

        response.on("end", function () {
          var body = Buffer.concat(chunks).toString("utf8");
          resolve({
            statusCode: response.statusCode,
            headers: {
              "Content-Type": response.headers["content-type"] || "application/json",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=300",
            },
            body: body,
          });
        });

        response.on("error", function () {
          resolve({
            statusCode: 502,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Stream error" }),
          });
        });
      })
      .on("error", function (err) {
        resolve({
          statusCode: 502,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: "Fetch failed: " + err.message }),
        });
      });
  });
};
