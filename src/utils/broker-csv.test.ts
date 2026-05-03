import { describe, expect, it } from 'vitest'
import {
    brokerCsvColumns,
    brokerCsvTradeTypeMarkers,
    buildImportedTradeSignature,
    parseBrokerCsv,
    type ImportedTradeRow,
} from './broker-csv'

const columns = [
    brokerCsvColumns.tradeType,
    brokerCsvColumns.executionDate,
    brokerCsvColumns.settlementDate,
    brokerCsvColumns.quantity,
    brokerCsvColumns.averagePrice,
    brokerCsvColumns.settlementAmount,
    brokerCsvColumns.fee,
    brokerCsvColumns.tax,
    brokerCsvColumns.settlementMarket,
    brokerCsvColumns.builtMarket,
    brokerCsvColumns.symbolCode,
    brokerCsvColumns.symbolName,
    brokerCsvColumns.termType,
    brokerCsvColumns.custodyType,
]

function csvCell(value: string) {
    if (value.includes(',') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`
    }

    return value
}

function buildCsv(rows: string[][]) {
    return [columns, ...rows]
        .map((row) => row.map(csvCell).join(','))
        .join('\n')
}

function toArrayBuffer(text: string) {
    return new TextEncoder().encode(text).buffer
}

function validRow(overrides: Partial<Record<(typeof columns)[number], string>> = {}) {
    const row: Record<(typeof columns)[number], string> = {
        [brokerCsvColumns.tradeType]: brokerCsvTradeTypeMarkers.buy,
        [brokerCsvColumns.executionDate]: '2026/5/1',
        [brokerCsvColumns.settlementDate]: '2026/5/7',
        [brokerCsvColumns.quantity]: '1,000',
        [brokerCsvColumns.averagePrice]: '123.45',
        [brokerCsvColumns.settlementAmount]: '12,345',
        [brokerCsvColumns.fee]: '100',
        [brokerCsvColumns.tax]: '10',
        [brokerCsvColumns.settlementMarket]: '--',
        [brokerCsvColumns.builtMarket]: 'TSE',
        [brokerCsvColumns.symbolCode]: ' 7203 ',
        [brokerCsvColumns.symbolName]: 'Toyota, Inc.',
        [brokerCsvColumns.termType]: '--',
        [brokerCsvColumns.custodyType]: '特定',
        ...overrides,
    }

    return columns.map((column) => row[column])
}

describe('parseBrokerCsv', () => {
    it('imports a valid BUY row', () => {
        const result = parseBrokerCsv(toArrayBuffer(buildCsv([validRow()])))

        expect(result.skippedRows).toBe(0)
        expect(result.trades).toEqual([
            {
                symbol_code: '7203',
                symbol_name: 'Toyota, Inc.',
                market: 'TSE',
                trade_type: 'BUY',
                term_type: null,
                custody_type: '特定',
                execution_date: '2026-05-01',
                settlement_date: '2026-05-07',
                quantity: 1000,
                average_price: 123.45,
                fee: 100,
                tax: 10,
                settlement_amount: 12345,
                intraday_amount: null,
                source: 'csv',
            },
        ])
    })

    it('imports a valid SELL row', () => {
        const result = parseBrokerCsv(
            toArrayBuffer(
                buildCsv([
                    validRow({
                        [brokerCsvColumns.tradeType]: brokerCsvTradeTypeMarkers.sell,
                        [brokerCsvColumns.settlementAmount]: '-2,500',
                    }),
                ])
            )
        )

        expect(result.trades[0]).toMatchObject({
            trade_type: 'SELL',
            settlement_amount: -2500,
        })
    })

    it('treats empty and placeholder values as zero or null', () => {
        const result = parseBrokerCsv(
            toArrayBuffer(
                buildCsv([
                    validRow({
                        [brokerCsvColumns.settlementDate]: '--',
                        [brokerCsvColumns.fee]: '',
                        [brokerCsvColumns.tax]: '--',
                        [brokerCsvColumns.settlementMarket]: '',
                        [brokerCsvColumns.builtMarket]: '--',
                        [brokerCsvColumns.custodyType]: '',
                    }),
                ])
            )
        )

        expect(result.trades[0]).toMatchObject({
            settlement_date: null,
            fee: 0,
            tax: 0,
            market: null,
            custody_type: null,
        })
    })

    it('skips rows with unknown trade types or invalid required values', () => {
        const result = parseBrokerCsv(
            toArrayBuffer(
                buildCsv([
                    validRow({ [brokerCsvColumns.tradeType]: '新規買' }),
                    validRow({ [brokerCsvColumns.quantity]: '--' }),
                    validRow({ [brokerCsvColumns.settlementAmount]: 'invalid' }),
                ])
            )
        )

        expect(result.trades).toEqual([])
        expect(result.skippedRows).toBe(3)
        expect(result.skippedReasons.length).toBe(2)
    })

    it('imports valid rows and counts skipped rows in the same file', () => {
        const result = parseBrokerCsv(
            toArrayBuffer(
                buildCsv([
                    validRow(),
                    validRow({ [brokerCsvColumns.tradeType]: '入金' }),
                    validRow({ [brokerCsvColumns.executionDate]: '2026/5/2' }),
                ])
            )
        )

        expect(result.trades).toHaveLength(2)
        expect(result.skippedRows).toBe(1)
    })
})

describe('buildImportedTradeSignature', () => {
    it('delegates to the shared trade signature format', () => {
        const trade: ImportedTradeRow = {
            symbol_code: ' 7203 ',
            symbol_name: 'Toyota',
            market: null,
            trade_type: 'BUY',
            term_type: null,
            custody_type: null,
            execution_date: '2026-05-01',
            settlement_date: null,
            quantity: 100,
            average_price: 1234,
            fee: 0,
            tax: 0,
            settlement_amount: 5000,
            intraday_amount: null,
            source: 'csv',
        }

        expect(buildImportedTradeSignature(trade)).toBe('2026-05-01||7203||BUY|||100|1234|5000|csv')
    })
})
