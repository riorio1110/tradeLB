import { uploadTradesCsv } from './actions'

type SearchParams = {
    status?: string | string[]
    message?: string | string[]
    imported?: string | string[]
    replaced_dates?: string | string[]
    date_from?: string | string[]
    date_to?: string | string[]
    skipped?: string | string[]
    notes?: string | string[]
}

function readParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value
}

export default async function UploadPage(props: {
    searchParams?: Promise<SearchParams>
}) {
    const searchParams = await props.searchParams
    const status = readParam(searchParams?.status)
    const message = readParam(searchParams?.message)
    const imported = Number(readParam(searchParams?.imported) ?? '0')
    const replacedDates = Number(readParam(searchParams?.replaced_dates) ?? '0')
    const dateFrom = readParam(searchParams?.date_from)
    const dateTo = readParam(searchParams?.date_to)
    const skipped = Number(readParam(searchParams?.skipped) ?? '0')
    const notes = readParam(searchParams?.notes)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-100">CSVアップロード</h1>
                <p className="mt-1 text-sm text-zinc-500">
                    添付いただいた証券会社 CSV を基準に、返済トレードだけを取り込みます。
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                    <p className="text-sm font-medium text-zinc-400">新規取り込み</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-400">{imported}件</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                    <p className="text-sm font-medium text-zinc-400">上書き対象日</p>
                    <p className="mt-2 text-2xl font-bold text-zinc-100">{replacedDates}日</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                    <p className="text-sm font-medium text-zinc-400">非対応行</p>
                    <p className="mt-2 text-2xl font-bold text-amber-300">{skipped}件</p>
                </div>
            </div>

            {message && (
                <div
                    className={`rounded-xl border px-4 py-3 text-sm ${
                        status === 'success'
                            ? 'border-emerald-700/50 bg-emerald-950/40 text-emerald-300'
                            : 'border-red-700/50 bg-red-950/40 text-red-300'
                    }`}
                >
                    <p>{message}</p>
                    {dateFrom && dateTo && (
                        <p className="mt-1 text-xs opacity-80">
                            対象期間: {dateFrom} から {dateTo}
                        </p>
                    )}
                    {notes && <p className="mt-1 text-xs opacity-80">{notes}</p>}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                    <h2 className="text-lg font-semibold text-zinc-100">ファイルを取り込む</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                        `決済日 / 銘柄 / 銘柄コード / 取引 / 決済数量 / 建単価 / 受渡日 / 受渡金額/決済損益`
                        を含む CSV を想定しています。
                    </p>

                    <form action={uploadTradesCsv} className="mt-6 space-y-4">
                        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/60 p-5">
                            <label htmlFor="csv" className="block text-sm font-medium text-zinc-300">
                                CSVファイル
                            </label>
                            <input
                                id="csv"
                                name="csv"
                                type="file"
                                accept=".csv,text/csv"
                                className="mt-3 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-400"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
                        >
                            取り込む
                        </button>
                    </form>
                </section>

                <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                    <h2 className="text-lg font-semibold text-zinc-100">取り込みルール</h2>
                    <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-400">
                        <p>`信用返済売` と `信用返済買` の行だけを損益トレードとして保存します。</p>
                        <p>`現引` など損益集計に混ぜると壊れる行はスキップします。</p>
                        <p>CSV に含まれる日付は、その日の既存トレードをいったん削除してから上書きします。</p>
                        <p>取り込み後はダッシュボード、カレンダー、トレード一覧に即時反映されます。</p>
                    </div>
                </section>
            </div>
        </div>
    )
}
