import { createClient } from '@/utils/supabase/server'
import {
    formatDateJP,
    formatPrice,
    formatYen,
    getTradeBadgeClass,
    getTradeLabel,
    TradeRecord,
} from '@/utils/trades'

type SearchParams = {
    month?: string | string[]
    keyword?: string | string[]
}

function readParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value
}

export default async function TradesPage(props: {
    searchParams?: Promise<SearchParams>
}) {
    const searchParams = await props.searchParams
    const monthFilter = readParam(searchParams?.month) ?? ''
    const keyword = (readParam(searchParams?.keyword) ?? '').trim().toLowerCase()

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
    const filteredTrades = allTrades.filter((trade) => {
        const matchesMonth = monthFilter ? trade.execution_date.startsWith(monthFilter) : true
        const matchesKeyword = keyword
            ? trade.symbol_name.toLowerCase().includes(keyword) || trade.symbol_code.toLowerCase().includes(keyword)
            : true

        return matchesMonth && matchesKeyword
    })

    const totalPL = filteredTrades.reduce((sum, trade) => sum + Number(trade.settlement_amount ?? 0), 0)
    const winCount = filteredTrades.filter((trade) => Number(trade.settlement_amount) > 0).length
    const lossCount = filteredTrades.filter((trade) => Number(trade.settlement_amount) < 0).length
    const winRate = filteredTrades.length > 0 ? Math.round((winCount / filteredTrades.length) * 100) : 0

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-100">トレード一覧</h1>
                <p className="mt-1 text-sm text-zinc-500">
                    CSV から取り込んだ返済トレードを一覧で確認できます。
                </p>
            </div>

            <form className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:grid-cols-[220px_1fr_auto]">
                <div>
                    <label htmlFor="month" className="mb-2 block text-sm font-medium text-zinc-300">
                        月で絞り込み
                    </label>
                    <input
                        id="month"
                        name="month"
                        type="month"
                        defaultValue={monthFilter}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-indigo-500"
                    />
                </div>
                <div>
                    <label htmlFor="keyword" className="mb-2 block text-sm font-medium text-zinc-300">
                        銘柄名 / コード
                    </label>
                    <input
                        id="keyword"
                        name="keyword"
                        type="text"
                        defaultValue={readParam(searchParams?.keyword) ?? ''}
                        placeholder="例: ソフトバンク 9984"
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500"
                    />
                </div>
                <div className="flex items-end">
                    <button
                        type="submit"
                        className="w-full rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
                    >
                        絞り込む
                    </button>
                </div>
            </form>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                    <p className="text-sm font-medium text-zinc-400">表示件数</p>
                    <p className="mt-2 text-2xl font-bold text-zinc-100">{filteredTrades.length}件</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                    <p className="text-sm font-medium text-zinc-400">合計損益</p>
                    <p className={`mt-2 text-2xl font-bold ${totalPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatYen(totalPL)}
                    </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                    <p className="text-sm font-medium text-zinc-400">勝率</p>
                    <p className="mt-2 text-2xl font-bold text-zinc-100">{winRate}%</p>
                    <p className="mt-1 text-xs text-zinc-500">{winCount}勝 / {lossCount}敗</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                    <p className="text-sm font-medium text-zinc-400">平均損益</p>
                    <p className="mt-2 text-2xl font-bold text-zinc-100">
                        {filteredTrades.length > 0 ? formatYen(Math.round(totalPL / filteredTrades.length)) : '±¥0'}
                    </p>
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900">
                {filteredTrades.length === 0 ? (
                    <div className="px-6 py-16 text-center text-zinc-500">
                        <p className="text-lg font-medium text-zinc-300">表示できるトレードがありません</p>
                        <p className="mt-2 text-sm">CSVを取り込むか、絞り込み条件を見直してください。</p>
                    </div>
                ) : (
                    <table className="w-full min-w-[980px] text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800 text-zinc-400">
                                <th className="px-3 py-3 text-left">決済日</th>
                                <th className="px-3 py-3 text-left">銘柄</th>
                                <th className="px-3 py-3 text-left">取引</th>
                                <th className="px-3 py-3 text-left">市場</th>
                                <th className="px-3 py-3 text-right">数量</th>
                                <th className="px-3 py-3 text-right">建単価</th>
                                <th className="px-3 py-3 text-right">損益</th>
                                <th className="px-3 py-3 text-left">受渡日</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTrades.map((trade) => (
                                <tr key={trade.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                                    <td className="px-3 py-3 text-zinc-300">{formatDateJP(trade.execution_date)}</td>
                                    <td className="px-3 py-3">
                                        <div className="font-medium text-zinc-100">{trade.symbol_name}</div>
                                        <div className="text-xs text-zinc-500">{trade.symbol_code}</div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <span className={`rounded px-2 py-1 text-xs font-medium ${getTradeBadgeClass(trade.trade_type)}`}>
                                            {getTradeLabel(trade.trade_type)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-zinc-400">{trade.market ?? '-'}</td>
                                    <td className="px-3 py-3 text-right text-zinc-300">{trade.quantity.toLocaleString()}</td>
                                    <td className="px-3 py-3 text-right text-zinc-300">{formatPrice(trade.average_price)}</td>
                                    <td className={`px-3 py-3 text-right font-semibold ${trade.settlement_amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {formatYen(trade.settlement_amount)}
                                    </td>
                                    <td className="px-3 py-3 text-zinc-400">
                                        {trade.settlement_date ? formatDateJP(trade.settlement_date) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
