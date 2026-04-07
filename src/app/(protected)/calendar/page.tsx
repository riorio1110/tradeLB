import { createClient } from '@/utils/supabase/server'
import CalendarGrid from '@/components/CalendarGrid'

export default async function CalendarPage(props: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams

    // Determine year and month from URL params (default: current month)
    const now = new Date()
    const year = searchParams?.year ? Number(searchParams.year) : now.getFullYear()
    const month = searchParams?.month ? Number(searchParams.month) : now.getMonth() + 1

    // Calculate first and last day of the month
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`

    // Fetch trades for the month
    const supabase = await createClient()
    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .gte('execution_date', firstDay)
        .lte('execution_date', lastDay)
        .is('deleted_at', null)
        .order('execution_date', { ascending: true })

    if (error) {
        console.error('Error fetching trades:', error)
    }

    const allTrades = trades ?? []

    // Aggregate daily P&L
    const dailyMap = new Map<string, { totalPL: number; tradeCount: number }>()
    allTrades.forEach(trade => {
        const date = trade.execution_date
        const current = dailyMap.get(date) || { totalPL: 0, tradeCount: 0 }
        current.totalPL += Number(trade.settlement_amount || 0)
        current.tradeCount += 1
        dailyMap.set(date, current)
    })

    const dailyPL = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        totalPL: data.totalPL,
        tradeCount: data.tradeCount,
    }))

    // Monthly summary
    const totalPL = dailyPL.reduce((sum, d) => sum + d.totalPL, 0)
    const tradingDays = dailyPL.length
    const winDays = dailyPL.filter(d => d.totalPL > 0).length
    const lossDays = dailyPL.filter(d => d.totalPL < 0).length
    const winRate = tradingDays > 0 ? Math.round((winDays / tradingDays) * 100) : 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-100">収益確認カレンダー</h1>
                <p className="text-sm text-zinc-500 mt-1">日別の損益をカレンダー形式で確認</p>
            </div>

            {/* Calendar Component */}
            <CalendarGrid
                year={year}
                month={month}
                dailyPL={dailyPL}
                trades={allTrades}
                monthlySummary={{ totalPL, tradingDays, winRate, winDays, lossDays }}
            />
        </div>
    )
}
