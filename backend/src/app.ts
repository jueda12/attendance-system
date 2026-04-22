import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { apiRouter } from './routes/index.js'
import { errorMiddleware } from './middlewares/error.middleware.js'
import { auditMiddleware } from './middlewares/audit.middleware.js'

export const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json())
app.use('/api', auditMiddleware, apiRouter)
app.use(errorMiddleware)
