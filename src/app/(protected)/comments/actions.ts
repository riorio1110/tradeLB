'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

function buildRedirectPath(params: {
    year: string
    month: string
    date: string
    status: 'saved' | 'error'
    message: string
}) {
    const searchParams = new URLSearchParams({
        year: params.year,
        month: params.month,
        date: params.date,
        status: params.status,
        message: params.message,
    })

    return `/comments?${searchParams.toString()}`
}

export async function saveTradeComment(formData: FormData) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const year = String(formData.get('year') ?? '')
    const month = String(formData.get('month') ?? '')
    const executionDate = String(formData.get('execution_date') ?? '')
    const rawComment = String(formData.get('comment') ?? '')
    const comment = rawComment.trim()

    if (!user) {
        redirect('/login')
    }

    if (!executionDate) {
        redirect(
            buildRedirectPath({
                year,
                month,
                date: '',
                status: 'error',
                message: '日付を選択してください',
            })
        )
    }

    if (!comment) {
        redirect(
            buildRedirectPath({
                year,
                month,
                date: executionDate,
                status: 'error',
                message: 'コメントを入力してください',
            })
        )
    }

    const { error } = await supabase
        .from('trade_comments')
        .upsert(
            {
                user_id: user.id,
                execution_date: executionDate,
                comment,
                deleted_at: null,
            },
            {
                onConflict: 'user_id,execution_date',
            }
        )

    if (error) {
        console.error('Error saving trade comment:', error)
        redirect(
            buildRedirectPath({
                year,
                month,
                date: executionDate,
                status: 'error',
                message: 'コメントの保存に失敗しました',
            })
        )
    }

    revalidatePath('/comments')
    revalidatePath('/calendar')

    redirect(
        buildRedirectPath({
            year,
            month,
            date: executionDate,
            status: 'saved',
            message: 'コメントを保存しました',
        })
    )
}
