// Proteccion SSRF compartida para las funciones proxy de Netlify.
// Bloquea destinos a IPs privadas/reservadas (incluye el endpoint de metadata
// de cloud 169.254.169.254) y restringe el esquema a http(s).
//
// El punto clave es resolver el DNS ANTES de conectar y validar TODAS las
// direcciones que devuelve. Ademas se conecta solo a la IP ya validada
// (via la opcion `lookup` de net.connect), lo que evita el ataque de
// DNS rebinding: que el hostname resuelva a una IP publica durante el chequeo
// y a una privada en el momento de conectar.

var dns = require("dns");

function ipv4Blocked(ip) {
  var parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(function(n) { return isNaN(n) || n < 0 || n > 255; })) {
    return true; // malformada -> tratar como bloqueada
  }
  var a = parts[0], b = parts[1], c = parts[2];
  if (a === 0) return true;                            // 0.0.0.0/8
  if (a === 10) return true;                           // 10.0.0.0/8
  if (a === 127) return true;                          // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true;             // 169.254.0.0/16 link-local + metadata cloud
  if (a === 172 && b >= 16 && b <= 31) return true;    // 172.16.0.0/12
  if (a === 192 && b === 168) return true;             // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true;   // 100.64.0.0/10 CGNAT
  if (a === 192 && b === 0 && c === 0) return true;    // 192.0.0.0/24
  if (a === 198 && (b === 18 || b === 19)) return true;// 198.18.0.0/15 benchmarking
  if (a >= 224) return true;                           // 224.0.0.0/4 multicast + 240.0.0.0/4 reservado
  return false;
}

function isBlockedAddress(address, family) {
  if (!address) return true;
  if (family === 6 || address.indexOf(":") !== -1) {
    var addr = address.toLowerCase();
    var mapped = addr.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped ::ffff:1.2.3.4
    if (mapped) return ipv4Blocked(mapped[1]);
    if (addr === "::1" || addr === "::") return true;        // loopback / unspecified
    if (/^fe[89ab]/.test(addr)) return true;                 // fe80::/10 link-local
    if (/^f[cd]/.test(addr)) return true;                    // fc00::/7 unique local
    return false;
  }
  return ipv4Blocked(address);
}

// Compatible con la firma de la opcion `lookup` de net.connect.
function safeLookup(hostname, options, callback) {
  if (typeof options === "function") { callback = options; options = {}; }
  dns.lookup(hostname, { all: true }, function(err, addresses) {
    if (err) return callback(err);
    var list = Array.isArray(addresses) ? addresses : [addresses];
    for (var i = 0; i < list.length; i++) {
      if (isBlockedAddress(list[i].address, list[i].family)) {
        return callback(new Error("SSRF bloqueado: el destino resuelve a una IP privada/reservada"));
      }
    }
    if (options && options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

function assertAllowedProtocol(parsed) {
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

module.exports = { safeLookup: safeLookup, isBlockedAddress: isBlockedAddress, assertAllowedProtocol: assertAllowedProtocol };
