import { Router } from 'express'
import { CallRepository } from '../repositories/CallRepository.js'
import { AppError } from '../errors/AppError.js'

const router = Router()
const callRepository = new CallRepository()

router.get('/', async (_req, res, next) => {
  try {
    const calls = await callRepository.findMany()
    res.json(calls)
  } catch (error) {
    next(error)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const call = await callRepository.findById(req.params.id)
    res.json(call)
  } catch (error) {
    next(error)
  }
})

export { router as callsRouter }