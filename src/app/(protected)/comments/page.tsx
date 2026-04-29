import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { saveTradeComment } from './actions'

type SearchParams = {
    year?: string | string[]
    month?: string | string[]
    date?: string | string[]
    status?: string | string[]
    message?: string | string[]
}

type CommentRow = {
    id: string
    execution_date: string
    comment: string
    updated_at: string
}

type TradeRow = {
    execution_date: string
    settlement_amount: number | string | null
}

function readParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value
}

function formatDateLabel(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
    })
}

function formatMonthLabel(year: number, month: number) {
    return new Date(year, month - 1, 1).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
    })
}

function formatYen(amount: number) {
    const prefix = amount >= 0 ? '+' : '-'
    return `${prefix}¥${Math.abs(amount).toLocaleString()}`
}

function truncateComment(comment: string, maxLength = 90) {
    if (comment.length <= maxLength) {
        return comment
    }

    return `${comment.slice(0, maxLength)}...`
}

function isDateInMonth(date: string, year: number, month: number) {
    const [dateYear, dateMonth] = date.split('-').map(Number)
    return dateYear === year && dateMonth === month
}

export default async function CommentsPage(props: {
    searchParams?: Promise<SearchParams>
}) {
    const searchParams = await props.searchParams
    const now = new Date()

    const year = Number(readParam(searchParams?.year) ?? now.getFullYear())
    const month = Number(readParam(searchParams?.month) ?? now.getMonth() + 1)
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`

    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const supabase = await createClient()
    const [{ data: comments, error: commentsError }, { data: trades, error: tradesError }] = await Promise.all([
        supabase
            .from('trade_comments')
            .select('id, execution_date, comment, updated_at')
            .gte('execution_date', firstDay)
            .lte('execution_date', lastDay)
            .is('deleted_at', null)
            .order('execution_date', { ascending: false }),
        supabase
            .from('trades')
            .select('execution_date, settlement_amount')
            .gte('execution_date', firstDay)
            .lte('execution_date', lastDay)
            .is('deleted_at', null),
    ])

    if (commentsError) {
        console.error('Error fetching comments:', commentsError)
    }

    if (tradesError) {
        console.error('Error fetching trades for comments page:', tradesError)
    }

    const monthlyComments = (comments ?? []) as CommentRow[]
    const monthlyTrades = (trades ?? []) as TradeRow[]
    const requestedDate = readParam(searchParams?.date)
    const fallbackDate = isDateInMonth(todayStr, year, month) ? todayStr : firstDay
    const selectedDate = requestedDate && isDateInMonth(requestedDate, year, month)
        ? requestedDate
        : monthlyComments[0]?.execution_date ?? fallbackDate
    const selectedComment = monthlyComments.find((comment) => comment.execution_date === selectedDate)
    const status = readParam(searchParams?.status)
    const message = readParam(searchParams?.message)

    const dailyTradeMap = new Map<string, { count: number; totalPL: number }>()
    monthlyTrades.forEach((trade) => {
        const current = dailyTradeMap.get(trade.execution_date) ?? { count: 0, totalPL: 0 }
        current.count += 1
        current.totalPL += Number(trade.settlement_amount ?? 0)
        dailyTradeMap.set(trade.execution_date, current)
    })

    const commentDays = monthlyComments.length
    const totalTradeDays = dailyTradeMap.size
    const commentedTradeDays = monthlyComments.filter((comment) => dailyTradeMap.has(comment.execution_date)).length
    const coverage = totalTradeDays > 0 ? Math.round((commentedTradeDays / totalTradeDays) * 100) : 0

    const prevMonthYear = month === 1 ? year - 1 : year
    const prevMonth = month === 1 ? 12 : month - 1
    const nextMonthYear = month === 12 ? year + 1 : year
    const nextMonth = month === 12 ? 1 : month + 1

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100">トレードコメント</h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        日ごとの振り返りを残して、勝ちパターンと反省点を積み上げます。
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start rounded-xl border border-zinc-800 bg-zinc-900 p-1">
                    <Link
                        href={`/comments?year=${prevMonthYear}&month=${prevMonth}`}
                        className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                    >
                        前月
                    </Link>
                    <div className="min-w-36 px-3 text-center text-sm font-semibold text-zinc-100">
                        {formatMonthLabel(year, month)}
                    </div>
                    <Link
                        href={`/comments?year=${nextMonthYear}&month=${nextMonth}`}
                        className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                    >
                        次月
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                    <p className="text-sm font-medium text-zinc-400">コメント日数</p>
                    <p className="mt-2 text-2xl font-bold text-zinc-100">{commentDays}日</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                    <p className="text-sm font-medium text-zinc-400">取引日カバー率</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-400">{coverage}%</p>
                    <p className="mt-1 text-xs text-zinc-500">
                        {commentedTradeDays}/{totalTradeDays} 取引日にコメントあり
                    </p>
                </div>
            </div>

            {message && (
                <div
                    className={`rounded-xl border px-4 py-3 text-sm ${
                        status === 'saved'
                            ? 'border-emerald-700/50 bg-emerald-950/40 text-emerald-300'
                            : 'border-red-700/50 bg-red-950/40 text-red-300'
                    }`}
                >
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-100">コメントを書く</h2>
                            <p className="mt-1 text-sm text-zinc-500">
                                1日1コメントで、その日の判断や感情を残せます。
                            </p>
                        </div>
                        {selectedComment && (
                            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                                最終更新: {new Date(selectedComment.updated_at).toLocaleString('ja-JP')}
                            </span>
                        )}
                    </div>

                    <form action={saveTradeComment} className="space-y-4">
                        <input type="hidden" name="year" value={String(year)} />
                        <input type="hidden" name="month" value={String(month)} />

                        <div className="space-y-2">
                            <label htmlFor="execution_date" className="text-sm font-medium text-zinc-300">
                                日付
                            </label>
                            <input
                                id="execution_date"
                                name="execution_date"
                                type="date"
                                defaultValue={selectedDate}
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none transition-colors focus:border-indigo-500"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="comment" className="text-sm font-medium text-zinc-300">
                                コメント
                            </label>
                            <textarea
                                id="comment"
                                name="comment"
                                defaultValue={selectedComment?.comment ?? ''}
                                placeholder="エントリー根拠、手仕舞い判断、感情の動き、次回への改善点などを書いておくと振り返りやすいです。"
                                className="min-h-64 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-4 text-sm leading-7 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-indigo-500"
                                required
                            />
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-zinc-500">
                                同じ日付で保存すると上書き更新されます。
                            </p>
                            <button
                                type="submit"
                                className="rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
                            >
                                保存する
                            </button>
                        </div>
                    </form>
                </section>

                <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                    <div className="mb-5">
                        <h2 className="text-lg font-semibold text-zinc-100">今月のコメント一覧</h2>
                        <p className="mt-1 text-sm text-zinc-500">
                            日付を選ぶと右側の入力欄に内容を読み込みます。
                        </p>
                    </div>

                    <div className="space-y-3">
                        {monthlyComments.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 px-5 py-10 text-center">
                                <p className="text-sm font-medium text-zinc-300">まだコメントがありません</p>
                                <p className="mt-2 text-sm text-zinc-500">
                                    最初の振り返りを保存するとここに並びます。
                                </p>
                            </div>
                        ) : (
                            monthlyComments.map((comment) => {
                                const tradeInfo = dailyTradeMap.get(comment.execution_date)
                                const isActive = comment.execution_date === selectedDate

                                return (
                                    <Link
                                        key={comment.id}
                                        href={`/comments?year=${year}&month=${month}&date=${comment.execution_date}`}
                                        className={`block rounded-2xl border px-4 py-4 transition-colors ${
                                            isActive
                                                ? 'border-indigo-500 bg-indigo-500/10'
                                                : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-950'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-zinc-100">
                                                    {formatDateLabel(comment.execution_date)}
                                                </p>
                                                <p className="mt-2 text-sm leading-6 text-zinc-400">
                                                    {truncateComment(comment.comment)}
                                                </p>
                                            </div>
                                            {tradeInfo && (
                                                <div className="shrink-0 text-right">
                                                    <p className="text-xs text-zinc-500">{tradeInfo.count}件</p>
                                                    <p
                                                        className={`text-sm font-semibold ${
                                                            tradeInfo.totalPL >= 0 ? 'text-emerald-400' : 'text-red-400'
                                                        }`}
                                                    >
                                                        {formatYen(tradeInfo.totalPL)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                )
                            })
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}
