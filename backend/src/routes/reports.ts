// backend/src/routes/reports.ts
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

router.get('/kpis', async (_req, res, next) => {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT * FROM vw_report_kpis LIMIT 1`)
    res.json((result as any[])[0] ?? {})
  } catch (error) {
    next(error)
  }
})

router.get('/funnel', async (_req, res, next) => {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT * FROM vw_report_funnel`)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.get('/termination-reasons', async (_req, res, next) => {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT * FROM vw_report_termination_reasons`)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.get('/daily-activity', async (_req, res, next) => {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT * FROM vw_report_daily_activity`)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.get('/daily-costs', async (_req, res, next) => {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT * FROM vw_report_daily_costs`)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

export { router as reportsRouter }
