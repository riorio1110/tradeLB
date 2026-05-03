import { describe, expect, it } from 'vitest'
import { aggregateDailyPL, buildCalendarSummary, summarizeMonthlyPL } from './calendar'

describe('aggregateDailyPL', () => {
    it('aggregates multiple trades on the same execution date', () => {
        expect(
            aggregateDailyPL([
                { execution_date: '2026-05-01', settlement_amount: 1000 },
                { execution_date: '2026-05-01', settlement_amount: '-250' },
                { execution_date: '2026-05-02', settlement_amount: null },
            ])
        ).toEqual([
            { date: '2026-05-01', totalPL: 750, tradeCount: 2 },
            { date: '2026-05-02', totalPL: 0, tradeCount: 1 },
        ])
    })
})

describe('summarizeMonthlyPL', () => {
    it('summarizes monthly profit and loss', () => {
        expect(
            summarizeMonthlyPL([
                { date: '2026-05-01', totalPL: 1000, tradeCount: 2 },
                { date: '2026-05-02', totalPL: -500, tradeCount: 1 },
                { date: '2026-05-03', totalPL: 0, tradeCount: 1 },
            ])
        ).toEqual({
            totalPL: 500,
            tradingDays: 3,
            winRate: 33,
            winDays: 1,
            lossDays: 1,
        })
    })

    it('returns a zero win rate when there are no trading days', () => {
        expect(summarizeMonthlyPL([])).toEqual({
            totalPL: 0,
            tradingDays: 0,
            winRate: 0,
            winDays: 0,
            lossDays: 0,
        })
    })
})

describe('buildCalendarSummary', () => {
    it('builds daily rows and monthly summary together', () => {
        expect(
            buildCalendarSummary([
                { execution_date: '2026-05-01', settlement_amount: '1000' },
                { execution_date: '2026-05-02', settlement_amount: undefined },
            ])
        ).toEqual({
            dailyPL: [
                { date: '2026-05-01', totalPL: 1000, tradeCount: 1 },
                { date: '2026-05-02', totalPL: 0, tradeCount: 1 },
            ],
            monthlySummary: {
                totalPL: 1000,
                tradingDays: 2,
                winRate: 50,
                winDays: 1,
                lossDays: 0,
            },
        })
    })
})
