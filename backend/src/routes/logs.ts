import { Router } from 'express'
import { LogRepository } from '../repositories/LogRepository.js'

const router = Router()
const logRepository = new LogRepository()

router.get('/', async (_req, res, next) => {
  try {
    const logs = await logRepository.findRecent(100)
    res.json(logs)
  } catch (error) {
    next(error)
  }
})

router.delete('/', async (_req, res, next) => {
  try {
    await logRepository.deleteAll()
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

export { router as logsRouter }