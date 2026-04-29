'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { parseBrokerCsv } from '@/utils/broker-csv'

function buildRedirectPath(params: Record<string, string>) {
    const searchParams = new URLSearchParams(params)
    return `/upload?${searchParams.toString()}`
}

export async function uploadTradesCsv(formData: FormData) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const file = formData.get('csv') as File | null

    if (!file || file.size === 0) {
        redirect(
            buildRedirectPath({
                status: 'error',
                message: 'CSVファイルを選択してください',
            })
        )
    }

    const { trades, skippedRows, skippedReasons } = parseBrokerCsv(await file.arrayBuffer())

    if (trades.length === 0) {
        redirect(
            buildRedirectPath({
                status: 'error',
                message: '取り込める返済トレードが見つかりませんでした',
                skipped: String(skippedRows),
            })
        )
    }

    const executionDates = trades.map((trade) => trade.execution_date).sort()
    const firstDate = executionDates[0]
    const lastDate = executionDates[executionDates.length - 1]
    const targetDates = Array.from(new Set(trades.map((trade) => trade.execution_date))).sort()

    const { error: deleteError } = await supabase
        .from('trades')
        .update({ deleted_at: new Date().toISOString() })
        .in('execution_date', targetDates)
        .is('deleted_at', null)

    if (deleteError) {
        console.error('Error replacing existing trades:', deleteError)
        redirect(
            buildRedirectPath({
                status: 'error',
                message: '既存トレードの上書きに失敗しました',
            })
        )
    }

    const { error: insertError } = await supabase.from('trades').insert(trades)

    if (insertError) {
        console.error('Error importing trades:', insertError)
        redirect(
            buildRedirectPath({
                status: 'error',
                message: 'CSVの取り込みに失敗しました',
            })
        )
    }

    revalidatePath('/upload')
    revalidatePath('/trades')
    revalidatePath('/dashboard')
    revalidatePath('/calendar')
    revalidatePath('/comments')

    redirect(
        buildRedirectPath({
            status: 'success',
            message: 'CSVを取り込みました',
            imported: String(trades.length),
            replaced_dates: String(targetDates.length),
            date_from: firstDate,
            date_to: lastDate,
            skipped: String(skippedRows),
            notes: skippedReasons.join(' / '),
        })
    )
}
