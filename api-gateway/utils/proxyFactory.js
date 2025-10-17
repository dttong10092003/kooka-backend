// const { createProxyMiddleware } = require('http-proxy-middleware');

// /**
//  * Create a proxy middleware factory
//  * @param {string} target - Target service URL
//  * @param {Object} options - Additional proxy options
//  * @returns {Function} Express middleware function
//  */
// const createServiceProxy = (target, options = {}) => {
//   const defaultOptions = {
//     target,
//     changeOrigin: true,
//     timeout: 30000,
//     proxyTimeout: 30000,

//     // Handle errors
//     onError: (err, req, res) => {
//       console.error(`Proxy error: ${err.message}`);

//       if (!res.headersSent) {
//         res.status(503).json({
//           error: 'Service Unavailable',
//           message: 'Backend service is not available'
//         });
//       }
//     },

//     // Simple logging
//     onProxyReq: (proxyReq, req, res) => {
//       console.log(`Proxying ${req.method} ${req.url} to ${target}`);
//     },

//     ...options
//   };

//   return createProxyMiddleware(defaultOptions);
// };

// /**
//  * Create auth service proxy
//  */
// const createAuthProxy = () => {
//   return createServiceProxy(process.env.AUTH_SERVICE_URL, {
//     pathRewrite: {
//       '^/api/auth': '/auth' // Rewrite /api/auth to /auth for auth-service
//     }
//   });
// };

// /**
//  * Create user service proxy
//  */
// const createUserProxy = () => {
//   return createServiceProxy(process.env.USER_SERVICE_URL, {
//     pathRewrite: {
//       '^/api/user/profile': '/profiles' // Rewrite /api/user/profile to /profiles for user-service
//     }
//   });
// };

// module.exports = {
//   createServiceProxy,
//   createAuthProxy,
//   createUserProxy
// };

const { createProxyMiddleware } = require("http-proxy-middleware");

function buildProxyMiddleware(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    logLevel: "debug",
  });
}

module.exports = buildProxyMiddleware;
