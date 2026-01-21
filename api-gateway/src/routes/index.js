const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')
const services = require('../config/services')

const router = express.Router()

Object.values(services).forEach(service => {
  router.use(
    service.path,
    createProxyMiddleware({
      target: service.target,
      changeOrigin: true,
      pathRewrite: {
        [`^${service.path}`]: ''
      }
    })
  )
})

module.exports = router
