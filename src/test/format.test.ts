import { describe, expect, it } from 'vitest'
import { eventText, limitText, money, percent, relative } from '../lib/format'

describe('formatação', () => {
    it('dinheiro em centavos, sem casas quando inteiro', () => {
        expect(money(184300).replace(/\s/g, ' ')).toBe('R$ 1.843')
        expect(money(4990).replace(/\s/g, ' ')).toBe('R$ 49,90')
    })

    it('limites e percentuais', () => {
        expect(limitText(3, -1)).toBe('3')
        expect(limitText(2, 3)).toBe('2 / 3')
        expect(percent(4, 31)).toBe('13%')
        expect(percent(1, 0)).toBe('0%')
    })

    it('datas relativas', () => {
        const now = new Date(2026, 9, 8, 15, 0)
        expect(relative(new Date(2026, 9, 8, 14, 30), now)).toBe('há 30 min')
        expect(relative(new Date(2026, 9, 7, 9, 0), now)).toBe('ontem')
        expect(relative(new Date(2026, 9, 5, 9, 0), now)).toBe('há 3 dias')
    })

    it('histórico da empresa em português', () => {
        const base = { id: '1', createdAt: '2026-10-08T00:00:00Z' }
        expect(eventText({ ...base, type: 'PLAN_CHANGED', detail: { from: 'STARTER', to: 'PRO' } })).toBe('Mudou de Essencial para Profissional')
        expect(eventText({ ...base, type: 'COURTESY_GRANTED', detail: { planTier: 'AGENCY', note: 'Parceiro' } })).toBe('Cortesia concedida (Equipe) — Parceiro')
        expect(eventText({ ...base, type: 'PAYMENT_DISPUTED', detail: { amountCents: 9900, reason: 'fraudulent' } }).replace(/\s/g, ' ')).toBe('Contestação aberta no cartão (R$ 99) — motivo: fraudulent')
        expect(eventText({ ...base, type: 'PAYMENT_REFUNDED', detail: { refundedCents: 4950, fullyRefunded: false } }).replace(/\s/g, ' ')).toBe('Reembolso parcial (R$ 49,50)')
        expect(eventText({ ...base, type: 'FRAUD_WARNING', detail: { fraudType: 'unauthorized_use_of_card' } })).toBe('Alerta de fraude do banco emissor — unauthorized_use_of_card')
    })
})
