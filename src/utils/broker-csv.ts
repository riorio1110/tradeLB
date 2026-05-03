import { buildTradeSignature } from './trades'

type ParsedCsvRow = Record<string, string>

export const brokerCsvColumns = {
    tradeType: '取引',
    executionDate: '決済日',
    settlementDate: '受渡日',
    quantity: '決済数量',
    averagePrice: '建単価',
    settlementAmount: '受渡金額/決済損益',
    fee: '諸費用計',
    tax: '消費税',
    settlementMarket: '決済市場',
    builtMarket: '建市場',
    symbolCode: '銘柄コード',
    symbolName: '銘柄',
    termType: '期限',
    custodyType: '預り',
} as const

export const brokerCsvTradeTypeMarkers = {
    sell: '返済売',
    buy: '返済買',
} as const

export type ImportedTradeRow = {
    symbol_code: string
    symbol_name: string
    market: string | null
    trade_type: 'BUY' | 'SELL'
    term_type: string | null
    custody_type: string | null
    execution_date: string
    settlement_date: string | null
    quantity: number
    average_price: number
    fee: number
    tax: number
    settlement_amount: number
    intraday_amount: null
    source: 'csv'
}

export type ParseCsvResult = {
    trades: ImportedTradeRow[]
    skippedRows: number
    skippedReasons: string[]
}

function decodeCsv(buffer: ArrayBuffer) {
    const uint8 = new Uint8Array(buffer)
    const decodedShiftJis = new TextDecoder('shift_jis').decode(uint8)

    if (
        decodedShiftJis.includes(brokerCsvColumns.executionDate) &&
        decodedShiftJis.includes(brokerCsvColumns.settlementAmount)
    ) {
        return decodedShiftJis
    }

    return new TextDecoder().decode(uint8)
}

function parseCsvLine(line: string) {
    const cells: string[] = []
    let current = ''
    let inQuotes = false

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index]
        const nextChar = line[index + 1]

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"'
                index += 1
            } else {
                inQuotes = !inQuotes
            }
            continue
        }

        if (char === ',' && !inQuotes) {
            cells.push(current)
            current = ''
            continue
        }

        current += char
    }

    cells.push(current)
    return cells
}

function toRows(text: string) {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = normalized.split('\n').filter((line) => line.trim().length > 0)

    if (lines.length === 0) {
        return []
    }

    const headers = parseCsvLine(lines[0]).map((header) => header.trim())

    return lines.slice(1).map((line) => {
        const values = parseCsvLine(line)
        const row: ParsedCsvRow = {}

        headers.forEach((header, index) => {
            row[header] = (values[index] ?? '').trim()
        })

        return row
    })
}

function normalizeDate(value: string) {
    if (!value || value === '--') {
        return null
    }

    const [year, month, day] = value.split('/').map((part) => part.trim())
    if (!year || !month || !day) {
        return null
    }

    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function normalizeNumber(value: string) {
    if (!value || value === '--') {
        return 0
    }

    return Number(value.replace(/,/g, ''))
}

function normalizeNullableText(value: string) {
    if (!value || value === '--') {
        return null
    }

    return value.trim()
}

function mapTradeType(value: string) {
    if (value.includes(brokerCsvTradeTypeMarkers.sell)) {
        return 'SELL' as const
    }

    if (value.includes(brokerCsvTradeTypeMarkers.buy)) {
        return 'BUY' as const
    }

    return null
}

export function parseBrokerCsv(buffer: ArrayBuffer): ParseCsvResult {
    const text = decodeCsv(buffer)
    const rows = toRows(text)
    const trades: ImportedTradeRow[] = []
    const skippedReasons = new Set<string>()
    let skippedRows = 0

    rows.forEach((row) => {
        const tradeType = mapTradeType(row[brokerCsvColumns.tradeType] ?? '')

        if (!tradeType) {
            skippedRows += 1
            skippedReasons.add('損益トレードではない行をスキップしました')
            return
        }

        const executionDate = normalizeDate(row[brokerCsvColumns.executionDate] ?? '')
        const settlementDate = normalizeDate(row[brokerCsvColumns.settlementDate] ?? '')
        const quantity = normalizeNumber(row[brokerCsvColumns.quantity] ?? '')
        const averagePrice = normalizeNumber(row[brokerCsvColumns.averagePrice] ?? '')
        const settlementAmount = normalizeNumber(row[brokerCsvColumns.settlementAmount] ?? '')

        if (!executionDate || !quantity || Number.isNaN(averagePrice) || Number.isNaN(settlementAmount)) {
            skippedRows += 1
            skippedReasons.add('必須列を解釈できない行をスキップしました')
            return
        }

        const fee = normalizeNumber(row[brokerCsvColumns.fee] ?? '')
        const tax = normalizeNumber(row[brokerCsvColumns.tax] ?? '')
        const market =
            normalizeNullableText(row[brokerCsvColumns.settlementMarket] ?? '') ??
            normalizeNullableText(row[brokerCsvColumns.builtMarket] ?? '')

        trades.push({
            symbol_code: (row[brokerCsvColumns.symbolCode] ?? '').trim(),
            symbol_name: (row[brokerCsvColumns.symbolName] ?? '').trim(),
            market,
            trade_type: tradeType,
            term_type: normalizeNullableText(row[brokerCsvColumns.termType] ?? ''),
            custody_type: normalizeNullableText(row[brokerCsvColumns.custodyType] ?? ''),
            execution_date: executionDate,
            settlement_date: settlementDate,
            quantity,
            average_price: averagePrice,
            fee,
            tax,
            settlement_amount: settlementAmount,
            intraday_amount: null,
            source: 'csv',
        })
    })

    return {
        trades,
        skippedRows,
        skippedReasons: Array.from(skippedReasons),
    }
}

export function buildImportedTradeSignature(trade: ImportedTradeRow) {
    return buildTradeSignature(trade)
}
