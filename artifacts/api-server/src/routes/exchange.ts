import { Router } from "express"
import { getExchangeRates } from "../lib/exchange-rates"

const router = Router()

router.get("/exchange-rates", async (req, res) => {
  const target = typeof req.query.target === "string" ? req.query.target.toUpperCase() : undefined
  try {
    const rates = await getExchangeRates()
    if (target) {
      const rate = rates.rates[target]
      if (rate === undefined) {
        res.status(404).json({ error: `No exchange rate available for ${target}` })
        return
      }
      res.json({ base: rates.base, target, rate, updatedAt: new Date(rates.updatedAt).toISOString() })
      return
    }
    res.json({ base: rates.base, rates: rates.rates, updatedAt: new Date(rates.updatedAt).toISOString() })
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Could not fetch exchange rates" })
  }
})

export default router
