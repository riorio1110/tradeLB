import { buildTradeSignature } from './trades'

type ParsedCsvRow = Record<string, string>

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

    if (decodedShiftJis.includes('決済日') && decodedShiftJis.includes('受渡金額/決済損益')) {
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
    if (value.includes('返済売')) {
        return 'SELL' as const
    }

    if (value.includes('返済買')) {
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
        const tradeType = mapTradeType(row['取引'] ?? '')

        if (!tradeType) {
            skippedRows += 1
            skippedReasons.add('損益トレードではない行をスキップしました')
            return
        }

        const executionDate = normalizeDate(row['決済日'] ?? '')
        const settlementDate = normalizeDate(row['受渡日'] ?? '')
        const quantity = normalizeNumber(row['決済数量'] ?? '')
        const averagePrice = normalizeNumber(row['建単価'] ?? '')
        const settlementAmount = normalizeNumber(row['受渡金額/決済損益'] ?? '')

        if (!executionDate || !quantity || Number.isNaN(averagePrice) || Number.isNaN(settlementAmount)) {
            skippedRows += 1
            skippedReasons.add('必須列を解釈できない行をスキップしました')
            return
        }

        const fee = normalizeNumber(row['諸費用計'] ?? '')
        const tax = normalizeNumber(row['消費税'] ?? '')
        const market = normalizeNullableText(row['決済市場'] ?? '') ?? normalizeNullableText(row['建市場'] ?? '')

        trades.push({
            symbol_code: (row['銘柄コード'] ?? '').trim(),
            symbol_name: (row['銘柄'] ?? '').trim(),
            market,
            trade_type: tradeType,
            term_type: normalizeNullableText(row['期限'] ?? ''),
            custody_type: normalizeNullableText(row['預り'] ?? ''),
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
