import { createClient } from '@/utils/supabase/server'
import {
    formatDateJP,
    formatPrice,
    formatYen,
    getTradeBadgeClass,
    getTradeLabel,
    TradeRecord,
} from '@/utils/trades'

function SummaryCard({
    title,
    value,
    subtitle,
    colorClass,
}: {
    title: string
    value: string
    subtitle?: string
    colorClass: string
}) {
    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-zinc-700">
            <p className="text-sm font-medium text-zinc-400">{title}</p>
            <p className={`mt-3 text-3xl font-bold ${colorClass}`}>{value}</p>
            {subtitle && <p className="mt-2 text-xs text-zinc-500">{subtitle}</p>}
        </div>
    )
}

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('trades')
        .select('id, symbol_code, symbol_name, market, trade_type, term_type, custody_type, execution_date, settlement_date, quantity, average_price, fee, tax, settlement_amount, source')
        .is('deleted_at', null)
        .order('execution_date', { ascending: false })

    if (error) {
        console.error('Error fetching trades:', error)
    }

    const allTrades = (data ?? []) as TradeRecord[]
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

    const totalPL = allTrades.reduce((sum, trade) => sum + trade.settlement_amount, 0)
    const todayTrades = allTrades.filter((trade) => trade.execution_date === todayStr)
    const todayPL = todayTrades.reduce((sum, trade) => sum + trade.settlement_amount, 0)
    const monthTrades = allTrades.filter((trade) => trade.execution_date.startsWith(monthPrefix))
    const monthPL = monthTrades.reduce((sum, trade) => sum + trade.settlement_amount, 0)
    const winCount = allTrades.filter((trade) => trade.settlement_amount > 0).length
    const winRate = allTrades.length > 0 ? Math.round((winCount / allTrades.length) * 100) : 0

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-100">ダッシュボード</h1>
                <p className="mt-1 text-sm text-zinc-500">
                    取り込んだトレードの損益サマリーを確認できます。
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    title="累計損益"
                    value={formatYen(totalPL)}
                    subtitle={`${allTrades.length}件の返済トレード`}
                    colorClass={totalPL >= 0 ? 'text-emerald-400' : 'text-red-400'}
                />
                <SummaryCard
                    title="本日の損益"
                    value={formatYen(todayPL)}
                    subtitle={todayStr}
                    colorClass={todayPL >= 0 ? 'text-emerald-400' : 'text-red-400'}
                />
                <SummaryCard
                    title="今月の損益"
                    value={formatYen(monthPL)}
                    subtitle={`${monthTrades.length}件`}
                    colorClass={monthPL >= 0 ? 'text-emerald-400' : 'text-red-400'}
                />
                <SummaryCard
                    title="勝率"
                    value={`${winRate}%`}
                    subtitle={`${winCount}勝 / ${allTrades.length - winCount}敗`}
                    colorClass={winRate >= 50 ? 'text-emerald-400' : 'text-amber-300'}
                />
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-100">最新トレード</h2>
                        <p className="mt-1 text-sm text-zinc-500">直近 10 件を表示しています。</p>
                    </div>
                </div>

                {allTrades.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500">
                        <p className="text-lg font-medium text-zinc-300">まだトレードがありません</p>
                        <p className="mt-2 text-sm">CSVアップロードから取り込みを始めてください。</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[920px] text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800 text-zinc-400">
                                    <th className="px-2 py-3 text-left">決済日</th>
                                    <th className="px-2 py-3 text-left">銘柄</th>
                                    <th className="px-2 py-3 text-left">取引</th>
                                    <th className="px-2 py-3 text-right">数量</th>
                                    <th className="px-2 py-3 text-right">建単価</th>
                                    <th className="px-2 py-3 text-right">損益</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allTrades.slice(0, 10).map((trade) => (
                                    <tr key={trade.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                                        <td className="px-2 py-3 text-zinc-300">{formatDateJP(trade.execution_date)}</td>
                                        <td className="px-2 py-3">
                                            <div className="font-medium text-zinc-100">{trade.symbol_name}</div>
                                            <div className="text-xs text-zinc-500">{trade.symbol_code}</div>
                                        </td>
                                        <td className="px-2 py-3">
                                            <span className={`rounded px-2 py-1 text-xs font-medium ${getTradeBadgeClass(trade.trade_type)}`}>
                                                {getTradeLabel(trade.trade_type)}
                                            </span>
                                        </td>
                                        <td className="px-2 py-3 text-right text-zinc-300">{trade.quantity.toLocaleString()}</td>
                                        <td className="px-2 py-3 text-right text-zinc-300">{formatPrice(trade.average_price)}</td>
                                        <td className={`px-2 py-3 text-right font-semibold ${trade.settlement_amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {formatYen(trade.settlement_amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
