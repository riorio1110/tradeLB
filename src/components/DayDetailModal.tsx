'use client'

import Link from 'next/link'
import { useEffect } from 'react'

type Trade = {
    id: string
    symbol_code: string
    symbol_name: string
    trade_type: string
    quantity: number
    average_price: number
    settlement_amount: number
    execution_date: string
}

type Props = {
    isOpen: boolean
    onClose: () => void
    date: string
    trades: Trade[]
    dailyPL: number
    commentHref: string
}

function formatYen(amount: number): string {
    const prefix = amount >= 0 ? '+' : ''
    return `${prefix}¥${Math.abs(amount).toLocaleString()}`
}

function formatDateJP(dateStr: string): string {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-')
    return `${y}年${Number(m)}月${Number(d)}日`
}

export default function DayDetailModal({ isOpen, onClose, date, trades, dailyPL, commentHref }: Props) {
    // Escキーでモーダルを閉じる
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                    <div>
                        <h2 className="text-lg font-bold text-gray-100">
                            {formatDateJP(date)}のトレード
                        </h2>
                        <p className={`text-sm font-medium mt-1 ${dailyPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            損益合計: {formatYen(dailyPL)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {trades.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500">
                            <p className="text-3xl mb-3">📭</p>
                            <p className="text-sm">この日のトレードデータはありません</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800 text-zinc-400">
                                    <th className="text-left py-2 px-2">銘柄</th>
                                    <th className="text-left py-2 px-2">売買</th>
                                    <th className="text-right py-2 px-2">数量</th>
                                    <th className="text-right py-2 px-2">損益</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trades.map((trade) => (
                                    <tr key={trade.id} className="border-b border-zinc-800/50">
                                        <td className="py-3 px-2">
                                            <span className="text-zinc-200 font-medium">{trade.symbol_name}</span>
                                            <span className="text-zinc-500 text-xs ml-1">({trade.symbol_code})</span>
                                        </td>
                                        <td className="py-3 px-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${trade.trade_type === 'BUY'
                                                ? 'bg-blue-900/40 text-blue-300'
                                                : 'bg-pink-900/40 text-pink-300'
                                                }`}>
                                                {trade.trade_type === 'BUY' ? '買' : '売'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-right text-zinc-300">
                                            {Number(trade.quantity).toLocaleString()}
                                        </td>
                                        <td className={`py-3 px-2 text-right font-medium ${Number(trade.settlement_amount) >= 0 ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                            {formatYen(Number(trade.settlement_amount))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-800 flex justify-between gap-3">
                    <Link
                        href={commentHref}
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 transition-colors text-sm font-medium"
                    >
                        コメントを書く
                    </Link>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors text-sm font-medium"
                    >
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    )
}
