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

  var targetUrl = (event.queryStringParameters || {}).url;

  if (!targetUrl) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Missing url parameter" }),
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
