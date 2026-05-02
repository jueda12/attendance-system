import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { apiRouter } from './routes/index.js'
import { errorMiddleware } from './middlewares/error.middleware.js'

export const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json())
app.use('/api', apiRouter)
app.use(errorMiddleware)
