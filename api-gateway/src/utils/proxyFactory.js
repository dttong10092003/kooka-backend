// const { createProxyMiddleware } = require("http-proxy-middleware");

// function buildProxyMiddleware(target) {
//   return createProxyMiddleware({
//     target,
//     changeOrigin: true,
//     logLevel: "debug",
//   });
// }

// module.exports = buildProxyMiddleware;

const { createProxyMiddleware } = require("http-proxy-middleware");

function buildProxyMiddleware(target, pathRewrite = {}) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    logLevel: "debug",
    pathRewrite, // <-- thêm cái này
  });
}

module.exports = buildProxyMiddleware;
