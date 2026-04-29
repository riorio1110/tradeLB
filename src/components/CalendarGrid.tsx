'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import DayDetailModal from './DayDetailModal'

type DailyPL = {
  date: string
  totalPL: number
  tradeCount: number
}

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

type MonthlySummary = {
  totalPL: number
  tradingDays: number
  winRate: number
  winDays: number
  lossDays: number
}

type Props = {
  year: number
  month: number
  dailyPL: DailyPL[]
  trades: Trade[]
  monthlySummary: MonthlySummary
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function formatYen(amount: number): string {
  const prefix = amount >= 0 ? '+' : ''
  return `${prefix}¥${Math.abs(amount).toLocaleString()}`
}

export default function CalendarGrid({ year, month, dailyPL, trades, monthlySummary }: Props) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Build daily PL lookup map
  const plMap = new Map<string, DailyPL>()
  dailyPL.forEach(d => plMap.set(d.date, d))

  // Calendar grid calculation
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay() // 0=Sun

  // Build grid cells
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(null) // empty cells before 1st
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day)
  }
  // Pad to complete last row
  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  // Today check
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Month navigation
  const goToPrevMonth = () => {
    let newYear = year
    let newMonth = month - 1
    if (newMonth < 1) { newMonth = 12; newYear-- }
    router.push(`/calendar?year=${newYear}&month=${newMonth}`)
  }
  const goToNextMonth = () => {
    let newYear = year
    let newMonth = month + 1
    if (newMonth > 12) { newMonth = 1; newYear++ }
    router.push(`/calendar?year=${newYear}&month=${newMonth}`)
  }

  // Day click
  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(dateStr)
  }

  // Modal data
  const selectedTrades = selectedDate
    ? trades.filter(t => t.execution_date === selectedDate)
    : []
  const selectedDayPL = selectedDate ? plMap.get(selectedDate)?.totalPL ?? 0 : 0
  const commentHref = selectedDate
    ? `/comments?year=${year}&month=${month}&date=${selectedDate}`
    : `/comments?year=${year}&month=${month}`

  return (
    <div className="space-y-6">
      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">月間損益</h3>
          <p className={`text-2xl font-bold ${monthlySummary.totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatYen(monthlySummary.totalPL)}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">取引日数</h3>
          <p className="text-2xl font-bold text-blue-400">
            {monthlySummary.tradingDays}日
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {monthlySummary.winDays}勝 / {monthlySummary.lossDays}敗
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">月間勝率</h3>
          <p className={`text-2xl font-bold ${monthlySummary.winRate >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
            {monthlySummary.winRate}%
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goToPrevMonth}
            className="px-3 py-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors text-sm font-medium"
          >
            ◀ 前月
          </button>
          <h2 className="text-xl font-bold text-gray-100">
            {year}年 {month}月
          </h2>
          <button
            onClick={goToNextMonth}
            className="px-3 py-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors text-sm font-medium"
          >
            次月 ▶
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={label}
              className={`text-center text-xs font-medium py-2 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-zinc-500'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Day Grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square rounded-lg bg-zinc-950/50" />
            }

            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const pl = plMap.get(dateStr)
            const isToday = dateStr === todayStr
            const dayOfWeek = (firstDayOfWeek + day - 1) % 7

            let bgClass = 'bg-zinc-950/50 hover:bg-zinc-800/50'
            let plTextClass = 'text-zinc-600'

            if (pl) {
              if (pl.totalPL > 0) {
                bgClass = 'bg-green-900/20 hover:bg-green-900/30 border-green-800/30'
                plTextClass = 'text-green-400'
              } else if (pl.totalPL < 0) {
                bgClass = 'bg-red-900/20 hover:bg-red-900/30 border-red-800/30'
                plTextClass = 'text-red-400'
              }
            }

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`
                  aspect-square rounded-lg p-1.5 flex flex-col items-start justify-start
                  border border-transparent transition-all duration-150 cursor-pointer
                  ${bgClass}
                  ${isToday ? 'ring-2 ring-indigo-500' : ''}
                `}
              >
                <span className={`text-xs font-medium ${
                  isToday ? 'text-indigo-400' :
                  dayOfWeek === 0 ? 'text-red-400/70' :
                  dayOfWeek === 6 ? 'text-blue-400/70' :
                  'text-zinc-400'
                }`}>
                  {day}
                </span>
                {pl && (
                  <>
                    <span className={`text-xs font-bold mt-auto ${plTextClass} truncate w-full text-center`}>
                      {formatYen(pl.totalPL)}
                    </span>
                    <span className="text-[10px] text-zinc-600 w-full text-center">
                      {pl.tradeCount}件
                    </span>
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day Detail Modal */}
      <DayDetailModal
        isOpen={selectedDate !== null}
        onClose={() => setSelectedDate(null)}
        date={selectedDate ?? ''}
        trades={selectedTrades}
        dailyPL={selectedDayPL}
        commentHref={commentHref}
      />
    </div>
  )
}
