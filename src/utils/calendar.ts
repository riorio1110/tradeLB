export type TradeLike = {
    execution_date: string
    settlement_amount: number | string | null | undefined
}

export type DailyPL = {
    date: string
    totalPL: number
    tradeCount: number
}

export type MonthlySummary = {
    totalPL: number
    tradingDays: number
    winRate: number
    winDays: number
    lossDays: number
}

function toSettlementAmount(value: TradeLike['settlement_amount']) {
    return Number(value || 0)
}

export function aggregateDailyPL(trades: TradeLike[]): DailyPL[] {
    const dailyMap = new Map<string, { totalPL: number; tradeCount: number }>()

    trades.forEach((trade) => {
        const current = dailyMap.get(trade.execution_date) || { totalPL: 0, tradeCount: 0 }
        current.totalPL += toSettlementAmount(trade.settlement_amount)
        current.tradeCount += 1
        dailyMap.set(trade.execution_date, current)
    })

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        totalPL: data.totalPL,
        tradeCount: data.tradeCount,
    }))
}

export function summarizeMonthlyPL(dailyPL: DailyPL[]): MonthlySummary {
    const totalPL = dailyPL.reduce((sum, day) => sum + day.totalPL, 0)
    const tradingDays = dailyPL.length
    const winDays = dailyPL.filter((day) => day.totalPL > 0).length
    const lossDays = dailyPL.filter((day) => day.totalPL < 0).length
    const winRate = tradingDays > 0 ? Math.round((winDays / tradingDays) * 100) : 0

    return {
        totalPL,
        tradingDays,
        winRate,
        winDays,
        lossDays,
    }
}

export function buildCalendarSummary(trades: TradeLike[]) {
    const dailyPL = aggregateDailyPL(trades)
    const monthlySummary = summarizeMonthlyPL(dailyPL)

    return {
        dailyPL,
        monthlySummary,
    }
}
