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

  var path = event.path.replace("/.netlify/functions/mangadex-proxy", "");
  if (!path) path = "/";

  var qs = event.rawQuery ? "?" + event.rawQuery : "";
  var targetUrl = "https://api.mangadex.org" + path + qs;

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
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=300",
            },
            body: body,
          });
        });

        response.on("error", function () {
          resolve({ statusCode: 502, body: "Stream error" });
        });
      })
      .on("error", function (err) {
        resolve({ statusCode: 502, body: "Fetch failed: " + err.message });
      });
  });
};
