export type TradeRecord = {
    id: string
    symbol_code: string
    symbol_name: string
    market: string | null
    trade_type: string
    term_type: string | null
    custody_type: string | null
    execution_date: string
    settlement_date: string | null
    quantity: number
    average_price: number
    fee: number | null
    tax: number | null
    settlement_amount: number
    source: string
}

export function formatYen(amount: number) {
    const prefix = amount >= 0 ? '+' : '-'
    return `${prefix}¥${Math.abs(amount).toLocaleString()}`
}

export function formatSignedNumber(value: number, suffix = '') {
    const prefix = value >= 0 ? '+' : '-'
    return `${prefix}${Math.abs(value).toLocaleString()}${suffix}`
}

export function formatPrice(value: number) {
    return `¥${value.toLocaleString('ja-JP', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
    })}`
}

export function formatDateJP(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

export function getTradeLabel(tradeType: string) {
    return tradeType === 'BUY' ? '買い戻し' : '売却'
}

export function getTradeBadgeClass(tradeType: string) {
    return tradeType === 'BUY'
        ? 'bg-blue-900/40 text-blue-300'
        : 'bg-pink-900/40 text-pink-300'
}

export function buildTradeSignature(trade: Pick<
    TradeRecord,
    | 'execution_date'
    | 'settlement_date'
    | 'symbol_code'
    | 'market'
    | 'trade_type'
    | 'term_type'
    | 'custody_type'
    | 'quantity'
    | 'average_price'
    | 'settlement_amount'
    | 'source'
>) {
    return [
        trade.execution_date,
        trade.settlement_date ?? '',
        trade.symbol_code.trim(),
        trade.market ?? '',
        trade.trade_type,
        trade.term_type ?? '',
        trade.custody_type ?? '',
        String(trade.quantity),
        String(trade.average_price),
        String(trade.settlement_amount),
        trade.source,
    ].join('|')
}
