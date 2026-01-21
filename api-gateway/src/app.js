require('dotenv').config()
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const routes = require('./routes')
const authMiddleware = require('./middlewares/auth.middleware')

const app = express()

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.use(authMiddleware)
app.use('/', routes)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`)
})
