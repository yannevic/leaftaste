import { PLACES, CONTINENT_NAMES, type Place } from './places'
import type { CountryStatus } from '../types/country'

export type ContinentProgress = {
  code: Place['continent'] // AF, AS, EU, NA, SA, OC ou AN
  nome: string
  total: number // quantos lugares tem no continente
  resolvidos: number // finalizados + pulados
  completo: boolean // true quando resolveu todos
}

// Conta, para cada continente, quantos lugares existem e quantos ja foram resolvidos
export function progressoPorContinente(
  statuses: Record<string, CountryStatus>,
): ContinentProgress[] {
  const contas = new Map<
    Place['continent'],
    { total: number; resolvidos: number }
  >()

  for (const lugar of PLACES) {
    const conta = contas.get(lugar.continent) ?? { total: 0, resolvidos: 0 }
    conta.total++
    const status = statuses[lugar.id]
    if (status === 'done' || status === 'skipped') conta.resolvidos++
    contas.set(lugar.continent, conta)
  }

  return [...contas.entries()].map(([code, conta]) => ({
    code,
    nome: CONTINENT_NAMES[code],
    total: conta.total,
    resolvidos: conta.resolvidos,
    completo: conta.resolvidos === conta.total,
  }))
}

// O mundo esta completo quando todos os lugares foram resolvidos
export function mundoCompleto(
  statuses: Record<string, CountryStatus>,
): boolean {
  return PLACES.every((lugar) => {
    const status = statuses[lugar.id]
    return status === 'done' || status === 'skipped'
  })
}
