const https = require("https");
const http = require("http");

exports.handler = async function (event) {
  const imageUrl = (event.queryStringParameters || {}).url;

  if (!imageUrl) {
    return { statusCode: 400, body: "Missing url parameter" };
  }

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

  let parsedUrl;
  try {
    parsedUrl = new URL(imageUrl);
  } catch (e) {
    return { statusCode: 400, body: "Invalid url" };
  }

  const hostname = parsedUrl.hostname;
  if (
    !hostname.endsWith(".mangadex.org") &&
    !hostname.endsWith(".mangadex.network")
  ) {
    return { statusCode: 403, body: "Domain not allowed" };
  }

  return new Promise(function (resolve) {
    const protocol = parsedUrl.protocol === "https:" ? https : http;

    protocol
      .get(imageUrl, function (response) {
        if (response.statusCode !== 200) {
          resolve({
            statusCode: response.statusCode,
            body: "Upstream error",
          });
          return;
        }

        const chunks = [];
        response.on("data", function (chunk) {
          chunks.push(chunk);
        });

        response.on("end", function () {
          const buffer = Buffer.concat(chunks);
          const contentType =
            response.headers["content-type"] || "image/jpeg";

          resolve({
            statusCode: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=86400",
              "Access-Control-Allow-Origin": "*",
            },
            body: buffer.toString("base64"),
            isBase64Encoded: true,
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
