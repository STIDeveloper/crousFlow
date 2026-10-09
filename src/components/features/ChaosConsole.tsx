'use client'

import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Play, CheckCircle2, XCircle } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

type CaseResult = {
  caseId: string
  expected: string
  actual: string
  passed: boolean
  durationMs: number
}

// Extracted from cases.ts to avoid importing server-only code
const CASES = [
  { id: 'C-01', description: 'Quantité négative', expected: '422 QTY_INVALID' },
  { id: 'C-02', description: 'Quantité 999999', expected: '422 QTY_INVALID' },
  { id: 'C-03', description: 'Date 3024', expected: '422 DATE_OUT_OF_RANGE' },
  { id: 'C-04', description: 'Date passée', expected: '422 DATE_IN_PAST' },
  { id: 'C-05', description: 'Même idempotencyKey', expected: '200 OK' },
  { id: 'C-06', description: 'Même réservation, autre clé', expected: '409 DUPLICATE_RESERVATION' },
  { id: 'C-07', description: 'Créneau complet', expected: '409 SLOT_FULL' },
  { id: 'C-08', description: '50 requêtes simultanées', expected: '1 succès, 49 refus' },
  { id: 'C-09', description: 'Texte 10 000 caractères', expected: '422 FIELD_TOO_LONG' },
  { id: 'C-10', description: 'Balise <script>', expected: '422 CONTENT_NOT_ALLOWED' },
  { id: 'C-11', description: 'Injection SQL', expected: '422 VALIDATION_ERROR' },
  { id: 'C-12', description: 'JSON malformé', expected: '400 BAD_JSON' },
  { id: 'C-13', description: 'Mauvais type', expected: '422 VALIDATION_ERROR' },
  { id: 'C-14', description: 'Emojis / RTL / invisibles', expected: '422 VALIDATION_ERROR' },
  { id: 'C-15', description: 'ID inexistant', expected: '404 NOT_FOUND' },
  { id: 'C-16', description: "Accès réservation d'autrui", expected: '403 FORBIDDEN' },
  { id: 'C-17', description: 'Étudiant appelle route cuisine', expected: '403 FORBIDDEN' },
  { id: 'C-18', description: '100 requêtes rapides', expected: '429 RATE_LIMITED' },
  { id: 'C-19', description: 'QR falsifié ou expiré', expected: '400 QR_INVALID' },
  { id: 'C-20', description: 'QR déjà consommé', expected: '409 ALREADY_CONSUMED' },
  { id: 'C-21', description: 'Réservation hors fenêtre', expected: '409 WINDOW_CLOSED' },
  { id: 'C-22', description: 'Corps > 1 Mo', expected: '413 PAYLOAD_TOO_LARGE' },
  { id: 'C-23', description: 'Gemini indisponible', expected: 'repli STAT, aucun crash' },
  { id: 'C-24', description: 'Base indisponible (simulée)', expected: '503 SERVICE_UNAVAILABLE' },
]

export function ChaosConsole() {
  const [results, setResults] = useState<Record<string, CaseResult>>({})
  const [isRunning, setIsRunning] = useState(false)
  const [activeCase, setActiveCase] = useState<string | null>(null)
  const shouldReduceMotion = useReducedMotion()
  const [isOnline, setIsOnline] = useState(true)
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const runAllMutation = useMutation({
    mutationFn: async () => {
      setIsRunning(true)
      setResults({})
      const res = await fetch('/api/admin/chaos/run', { method: 'POST' })
      if (!res.ok) throw new Error('La console est indisponible. Relancez l’exécution.')
      const data = await res.json()

      const newResults: Record<string, CaseResult> = {}
      data.results.forEach((r: CaseResult) => {
        newResults[r.caseId] = r
      })
      setResults(newResults)
      return data
    },
    onSettled: () => {
      setIsRunning(false)
      setActiveCase(null)
    },
  })

  const runCaseMutation = useMutation({
    mutationFn: async (caseId: string) => {
      setActiveCase(caseId)
      const res = await fetch('/api/admin/chaos/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      })
      if (!res.ok) throw new Error('Ce scénario n’a pas pu être exécuté. Réessayez.')
      const data = await res.json()
      if (data.results?.[0]) {
        setResults((prev) => ({ ...prev, [caseId]: data.results[0] }))
      }
      return data
    },
    onSettled: () => {
      setActiveCase(null)
    },
  })

  const passedCount = Object.values(results).filter((r) => r.passed).length
  const totalCount = CASES.length

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 font-mono text-sm">
      {!isOnline && (
        <div role="alert" className="rounded-2xl border border-warn/40 bg-warn/10 p-4 text-warn">
          Hors ligne · reconnectez-vous pour exécuter les scénarios.
        </div>
      )}
      {(runAllMutation.isError || runCaseMutation.isError) && (
        <div
          role="alert"
          className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-paper"
        >
          {runAllMutation.error?.message ?? runCaseMutation.error?.message}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-night-2 border border-sage/30 p-6 sm:p-8 rounded-[2rem] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, var(--color-sage) 2px, var(--color-sage) 4px)',
          }}
        ></div>
        <div className="z-10">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-sage">CrousFlow / système</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-glow mb-2">
            À l’épreuve du réel.
          </h1>
          <p className="text-sage">Exécution des scénarios d&apos;anomalies (C-01 à C-24)</p>
        </div>
        <div className="z-10 flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-sage mb-1">PROGRÈS</p>
            <p className="text-2xl font-bold text-paper">
              {Object.keys(results).length}{' '}
              <span className="text-sage text-base">/ {totalCount}</span>
            </p>
          </div>
          <button
            disabled={
              !isOnline || isRunning || runAllMutation.isPending || runCaseMutation.isPending
            }
            onClick={() => runAllMutation.mutate()}
            className="flex min-h-12 items-center gap-2 px-5 py-3 bg-glow text-night font-bold rounded-full hover:bg-glow/80 disabled:opacity-50 transition-colors motion-reduce:transition-none"
          >
            {isRunning ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            TOUT LANCER
          </button>
        </div>
      </div>

      {/* Console List */}
      {Object.keys(results).length === 0 && !isRunning && (
        <p className="rounded-2xl border border-dashed border-sage/25 p-5 text-sage">
          Prêt à démarrer · 24 scénarios, aucun résultat pour le moment.
        </p>
      )}
      <div className="bg-night border border-sage/30 rounded-[1.5rem] overflow-hidden flex flex-col">
        <div className="hidden lg:grid grid-cols-12 gap-4 p-4 border-b border-sage/30 bg-night-2 font-bold text-sage text-xs">
          <div className="col-span-1">ID</div>
          <div className="col-span-4">DESCRIPTION</div>
          <div className="col-span-3">ATTENDU</div>
          <div className="col-span-2">RÉEL</div>
          <div className="col-span-1 text-center">VERDICT</div>
          <div className="col-span-1 text-right">ACTION</div>
        </div>

        <div className="flex flex-col divide-y divide-sage/10 max-h-[60vh] overflow-y-auto">
          {CASES.map((c) => {
            const result = results[c.id]
            const isExecuting = activeCase === c.id || (isRunning && !result)

            return (
              <div
                key={c.id}
                className="grid grid-cols-2 lg:grid-cols-12 gap-3 lg:gap-4 p-5 items-center hover:bg-night-2/50 transition-colors motion-reduce:transition-none"
              >
                <div className="col-span-2 lg:col-span-1 text-glow">{c.id}</div>
                <div
                  className="col-span-2 lg:col-span-4 text-paper font-bold"
                  title={c.description}
                >
                  {c.description}
                </div>
                <div className="col-span-2 lg:col-span-3 text-sage break-words" title={c.expected}>
                  {c.expected}
                </div>

                <div className="col-span-2 flex items-center gap-2 break-all">
                  {isExecuting ? (
                    <span className="text-glow flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> ...
                    </span>
                  ) : result ? (
                    <motion.span
                      initial={shouldReduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={result.passed ? 'text-ok' : 'text-danger'}
                    >
                      {result.actual}
                    </motion.span>
                  ) : (
                    <span className="text-sage/30">-</span>
                  )}
                </div>

                <div className="col-span-1 flex justify-center">
                  {result ? (
                    result.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-ok" />
                    ) : (
                      <XCircle className="w-5 h-5 text-danger" />
                    )
                  ) : null}
                </div>

                <div className="col-span-1 flex justify-end items-center gap-2">
                  {result && <span className="text-xs text-sage">{result.durationMs}ms</span>}
                  <button
                    aria-label={`Lancer ${c.id} : ${c.description}`}
                    disabled={!isOnline || isRunning || isExecuting || runCaseMutation.isPending}
                    onClick={() => runCaseMutation.mutate(c.id)}
                    className="grid min-h-11 min-w-11 place-items-center rounded-full bg-sage/20 hover:bg-sage/40 disabled:opacity-50 text-paper"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      {Object.keys(results).length === totalCount && !isRunning && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-night-2 border border-glow/50 p-6 rounded-xl flex items-center justify-between"
        >
          <div>
            <h2 className="text-xl font-bold text-paper mb-1">Test terminé</h2>
            <p className="text-sage">
              {passedCount === totalCount
                ? 'Tous les scénarios ont passé leur vérification.'
                : `${totalCount - passedCount} scénario(s) demandent votre attention.`}
            </p>
          </div>
          <div className="text-4xl font-bold text-glow">
            {passedCount}/{totalCount}
          </div>
        </motion.div>
      )}
    </div>
  )
}
