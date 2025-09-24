const { createProxyMiddleware } = require("http-proxy-middleware");

function buildProxyMiddleware(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    logLevel: "debug",
  });
}

module.exports = buildProxyMiddleware;
