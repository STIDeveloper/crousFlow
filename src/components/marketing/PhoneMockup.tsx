'use client'

import { Check, QrCode, UtensilsCrossed } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

/** Aperçu de l'application étudiante, construit en HTML (aucune image). */
export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[17.5rem] select-none sm:w-[19rem]" aria-hidden="true">
      <div className="rounded-[2.9rem] bg-deep p-2.5 shadow-float ring-1 ring-ink/10">
        <div className="relative overflow-hidden rounded-[2.4rem] bg-canvas">
          <div className="absolute left-1/2 top-2.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-deep" />
          <div className="sky-gradient relative px-5 pb-24 pt-10 text-ink">
            <div className="ripple absolute -right-24 -top-24 size-64 rounded-full" />
            <p className="relative text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/80">
              Ticket de retrait
            </p>
            <p className="relative mt-1 font-display text-lg font-extrabold leading-tight">
              Curry de légumes et riz
            </p>
            <p className="relative text-xs font-semibold text-ink/80">Lundi 12 · 12:00 — 12:15</p>
          </div>
          <div className="relative z-10 -mt-20 flex flex-col items-center px-5">
            <div className="grid size-40 place-items-center rounded-full bg-surface shadow-float ring-8 ring-surface/70">
              <QRCodeSVG value="https://crousflow.onrender.com" size={92} level="M" />
            </div>
            <p className="mt-3 font-mono text-xs font-bold tracking-[0.25em] text-ink">UVRSFA</p>
            <p className="mt-1 rounded-full bg-brand-soft px-3 py-1 text-[10px] font-bold text-ink">
              1,00 € à payer sur place
            </p>
          </div>
          <ul className="mt-4 space-y-2 px-4 pb-4">
            {[
              ['Poisson sauce citron', 'Mar. 13 · 12:15'],
              ['Poulet rôti', 'Mer. 14 · 12:00'],
            ].map(([name, when]) => (
              <li
                key={name}
                className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2 shadow-card"
              >
                <span className="grid size-8 place-items-center rounded-full border-2 border-leaf bg-leaf/15 text-ok">
                  <Check className="size-4" strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-extrabold text-ink">{name}</span>
                  <span className="block text-[10px] font-medium text-ink-soft">{when}</span>
                </span>
                <span className="text-[10px] font-extrabold text-primary">Réservé</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-around bg-deep px-6 pb-4 pt-2.5">
            <span className="flex flex-col items-center gap-1 text-[9px] font-bold text-surface/80">
              <span className="grid size-7 place-items-center rounded-full border-2 border-surface/35">
                <UtensilsCrossed className="size-3.5" />
              </span>
              Menu
            </span>
            <span className="flex flex-col items-center gap-1 text-[9px] font-bold text-brand-light">
              <span className="grid size-7 place-items-center rounded-full bg-brand-light text-deep">
                <QrCode className="size-3.5" />
              </span>
              Mes tickets
            </span>
          </div>
        </div>
      </div>
      <div className="absolute -left-14 top-52 z-20 hidden items-center gap-2 rounded-2xl bg-surface px-3 py-2.5 shadow-float sm:flex">
        <span className="grid size-8 place-items-center rounded-full bg-leaf text-ink">
          <Check className="size-4" strokeWidth={3} />
        </span>
        <span className="text-xs font-extrabold text-ink">
          Réservation
          <br />
          confirmée
        </span>
      </div>
      <div className="absolute -right-10 bottom-24 z-20 hidden rounded-2xl bg-surface px-3 py-2.5 shadow-float sm:block">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
          Créneau 12:00
        </p>
        <p className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
          <span className="size-2 rounded-full bg-leaf" /> Affluence calme
        </p>
      </div>
    </div>
  )
}
