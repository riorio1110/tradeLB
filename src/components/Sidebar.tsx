'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signout } from '@/app/login/actions'
import { useState } from 'react'

const navItems = [
    { href: '/dashboard', label: 'ダッシュボード', icon: '📊' },
    { href: '/calendar', label: '収益カレンダー', icon: '📅' },
    { href: '/trades', label: 'トレード一覧', icon: '📋' },
    { href: '/upload', label: 'CSVアップロード', icon: '📤' },
    { href: '/comments', label: 'コメント', icon: '💬' },
    { href: '/chart', label: 'チャート', icon: '📈' },
]

export default function Sidebar() {
    const pathname = usePathname()
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="fixed top-4 left-4 z-50 p-2 rounded-md bg-zinc-800 text-white md:hidden"
                aria-label="Toggle menu"
            >
                {isMobileOpen ? '✕' : '☰'}
            </button>

            {/* Overlay for mobile */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed top-0 left-0 z-40 h-full w-64
          bg-zinc-900 text-gray-100 border-r border-zinc-800
          flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:z-auto
        `}
            >
                {/* Logo */}
                <div className="p-6 border-b border-zinc-800">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        TradeNote
                    </h1>
                    <p className="text-xs text-zinc-500 mt-1">Stock Trading Manager</p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-150
                  ${isActive
                                        ? 'bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-400'
                                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                                    }
                `}
                            >
                                <span className="text-lg">{item.icon}</span>
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                {/* Sign out */}
                <div className="p-4 border-t border-zinc-800">
                    <form action={signout}>
                        <button
                            type="submit"
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:bg-red-900/30 hover:text-red-300 transition-all duration-150"
                        >
                            <span className="text-lg">🚪</span>
                            サインアウト
                        </button>
                    </form>
                </div>
            </aside>
        </>
    )
}
