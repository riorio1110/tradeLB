import { describe, expect, it } from 'vitest'
import {
    buildTradeSignature,
    formatDateJP,
    formatPrice,
    formatSignedNumber,
    formatYen,
} from './trades'

describe('trade formatters', () => {
    it('adds a plus sign to positive yen amounts', () => {
        expect(formatYen(123456)).toBe('+¥123,456')
    })

    it('adds a minus sign to negative yen amounts', () => {
        expect(formatYen(-123456)).toBe('-¥123,456')
    })

    it('treats zero as a positive signed value', () => {
        expect(formatYen(0)).toBe('+¥0')
        expect(formatSignedNumber(0, '%')).toBe('+0%')
    })

    it('formats signed numbers with an optional suffix', () => {
        expect(formatSignedNumber(1234, '株')).toBe('+1,234株')
        expect(formatSignedNumber(-1234)).toBe('-1,234')
    })

    it('formats prices with up to four decimal places', () => {
        expect(formatPrice(1234.56789)).toBe('¥1,234.5679')
        expect(formatPrice(1234)).toBe('¥1,234')
    })

    it('formats ISO dates for Japanese display', () => {
        expect(formatDateJP('2026-05-03')).toBe('2026年5月3日')
    })
})

describe('buildTradeSignature', () => {
    it('creates a stable signature and normalizes nullable fields', () => {
        expect(
            buildTradeSignature({
                execution_date: '2026-05-01',
                settlement_date: null,
                symbol_code: ' 7203 ',
                market: null,
                trade_type: 'BUY',
                term_type: null,
                custody_type: null,
                quantity: 100,
                average_price: 1234.5,
                settlement_amount: 12345,
                source: 'csv',
            })
        ).toBe('2026-05-01||7203||BUY|||100|1234.5|12345|csv')
    })
})
