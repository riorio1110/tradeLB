import { createClient } from '@/utils/supabase/server'

// Summary card component
function SummaryCard({
    title,
    value,
    subtitle,
    icon,
    colorClass,
}: {
    title: string
    value: string
    subtitle?: string
    icon: string
    colorClass: string
}) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
                <span className="text-2xl">{icon}</span>
            </div>
            <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
            {subtitle && (
                <p className="text-xs text-zinc-500 mt-2">{subtitle}</p>
            )}
        </div>
    )
}

export default async function DashboardPage() {
    const supabase = await createClient()

    // Fetch all trades for summary
    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .is('deleted_at', null)

    if (error) {
        console.error('Error fetching trades:', error)
    }

    const allTrades = trades ?? []

    // Calculate summary stats
    const totalPL = allTrades.reduce((sum, t) => sum + Number(t.settlement_amount || 0), 0)
    const tradeCount = allTrades.length
    const sellTrades = allTrades.filter(t => t.trade_type === 'SELL')
    const winTrades = sellTrades.filter(t => Number(t.settlement_amount || 0) > 0)
    const winRate = sellTrades.length > 0
        ? Math.round((winTrades.length / sellTrades.length) * 100)
        : 0

    // Today's P&L
    const today = new Date().toISOString().split('T')[0]
    const todayTrades = allTrades.filter(t => t.execution_date === today)
    const todayPL = todayTrades.reduce((sum, t) => sum + Number(t.settlement_amount || 0), 0)

    // Format currency
    const formatYen = (amount: number) => {
        const prefix = amount >= 0 ? '+' : ''
        return `${prefix}¥${Math.abs(amount).toLocaleString()}`
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-100">ダッシュボード</h1>
                <p className="text-sm text-zinc-500 mt-1">トレード実績のサマリー</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title="総合損益"
                    value={formatYen(totalPL)}
                    subtitle="全期間"
                    icon="💰"
                    colorClass={totalPL >= 0 ? 'text-green-400' : 'text-red-400'}
                />
                <SummaryCard
                    title="本日の損益"
                    value={formatYen(todayPL)}
                    subtitle={today}
                    icon="📅"
                    colorClass={todayPL >= 0 ? 'text-green-400' : 'text-red-400'}
                />
                <SummaryCard
                    title="取引回数"
                    value={`${tradeCount}回`}
                    subtitle="全期間"
                    icon="🔄"
                    colorClass="text-blue-400"
                />
                <SummaryCard
                    title="勝率"
                    value={`${winRate}%`}
                    subtitle={`${winTrades.length}勝 / ${sellTrades.length}回`}
                    icon="🎯"
                    colorClass={winRate >= 50 ? 'text-green-400' : 'text-yellow-400'}
                />
            </div>

            {/* Recent Trades */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-100 mb-4">最近のトレード</h2>
                {allTrades.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                        <p className="text-4xl mb-4">📭</p>
                        <p className="text-lg font-medium">まだトレードデータがありません</p>
                        <p className="text-sm mt-2">CSVアップロードまたは手動入力でデータを追加しましょう</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800 text-zinc-400">
                                    <th className="text-left py-3 px-2">日付</th>
                                    <th className="text-left py-3 px-2">銘柄</th>
                                    <th className="text-left py-3 px-2">売買</th>
                                    <th className="text-right py-3 px-2">数量</th>
                                    <th className="text-right py-3 px-2">単価</th>
                                    <th className="text-right py-3 px-2">損益</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allTrades.slice(0, 10).map((trade) => (
                                    <tr key={trade.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                        <td className="py-3 px-2 text-zinc-300">{trade.execution_date}</td>
                                        <td className="py-3 px-2">
                                            <span className="text-zinc-200 font-medium">{trade.symbol_name}</span>
                                            <span className="text-zinc-500 text-xs ml-2">{trade.symbol_code}</span>
                                        </td>
                                        <td className="py-3 px-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${trade.trade_type === 'BUY'
                                                    ? 'bg-blue-900/40 text-blue-300'
                                                    : 'bg-pink-900/40 text-pink-300'
                                                }`}>
                                                {trade.trade_type === 'BUY' ? '買' : '売'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-right text-zinc-300">{Number(trade.quantity).toLocaleString()}</td>
                                        <td className="py-3 px-2 text-right text-zinc-300">¥{Number(trade.average_price).toLocaleString()}</td>
                                        <td className={`py-3 px-2 text-right font-medium ${Number(trade.settlement_amount) >= 0 ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                            {formatYen(Number(trade.settlement_amount))}
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
