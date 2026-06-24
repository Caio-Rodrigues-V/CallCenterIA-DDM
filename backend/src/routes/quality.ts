// backend/src/routes/quality.ts
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

router.get('/metrics', async (_req, res, next) => {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT * FROM vw_quality_metrics LIMIT 1`)
    res.json((result as any[])[0] ?? {})
  } catch (error) {
    next(error)
  }
})

router.get('/rating-distribution', async (_req, res, next) => {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT * FROM vw_quality_rating_distribution`)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.get('/by-campaign', async (_req, res, next) => {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT * FROM vw_quality_by_campaign`)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.get('/top-objections', async (_req, res, next) => {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT * FROM vw_quality_top_objections`)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

export { router as qualityRouter }
