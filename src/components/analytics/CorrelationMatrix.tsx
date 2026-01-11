"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from "lucide-react"

interface CorrelationResult {
  metric1: string
  metric2: string
  correlation: number
  pValue: number
  significance: 'high' | 'medium' | 'low'
  interpretation: string
  recommendation?: string
}

export function CorrelationMatrix() {
  const [correlations, setCorrelations] = useState<CorrelationResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCorrelation, setSelectedCorrelation] = useState<CorrelationResult | null>(null)

  useEffect(() => {
    loadCorrelations()
  }, [])

  const loadCorrelations = async () => {
    try {
      const response = await fetch('/api/analytics?type=correlations')
      const data = await response.json()
      setCorrelations(data.correlations)
    } catch (error) {
      console.error('Failed to load correlations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCorrelationColor = (correlation: number) => {
    const abs = Math.abs(correlation)
    if (abs > 0.7) return 'text-red-600 dark:text-red-400'
    if (abs > 0.5) return 'text-orange-600 dark:text-orange-400'
    if (abs > 0.3) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-slate-600 dark:text-slate-400'
  }

  const getCorrelationIcon = (correlation: number) => {
    if (correlation > 0.3) return <TrendingUp className="h-4 w-4" />
    if (correlation < -0.3) return <TrendingDown className="h-4 w-4" />
    return <Minus className="h-4 w-4" />
  }

  const getSignificanceBadge = (significance: string) => {
    const variants = {
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    } as const

    return (
      <Badge variant={variants[significance as keyof typeof variants] || 'outline'}>
        {significance}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Correlation Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <span>Metric Correlations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {correlations.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">
                No correlation data available. Add more health data to see correlations.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {correlations
                .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
                .map((correlation, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedCorrelation(correlation)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`${getCorrelationColor(correlation.correlation)}`}>
                          {getCorrelationIcon(correlation.correlation)}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-slate-100">
                            {correlation.metric1} ↔ {correlation.metric2}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {correlation.interpretation}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-mono text-sm ${getCorrelationColor(correlation.correlation)}`}>
                          {correlation.correlation.toFixed(3)}
                        </span>
                        {getSignificanceBadge(correlation.significance)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Correlation Detail Modal */}
      {selectedCorrelation && (
        <Card className="border-teal-200 dark:border-teal-800">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Correlation Details</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCorrelation(null)}
              >
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                  {selectedCorrelation.metric1} ↔ {selectedCorrelation.metric2}
                </h3>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-500">Correlation:</span>
                    <span className={`font-mono text-lg ${getCorrelationColor(selectedCorrelation.correlation)}`}>
                      {selectedCorrelation.correlation.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-500">P-value:</span>
                    <span className="font-mono text-sm">
                      {selectedCorrelation.pValue.toFixed(4)}
                    </span>
                  </div>
                  {getSignificanceBadge(selectedCorrelation.significance)}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Interpretation
                </h4>
                <p className="text-slate-600 dark:text-slate-400">
                  {selectedCorrelation.interpretation}
                </p>
              </div>

              {selectedCorrelation.recommendation && (
                <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-teal-800 dark:text-teal-200 mb-1">
                        Recommendation
                      </h4>
                      <p className="text-sm text-teal-700 dark:text-teal-300">
                        {selectedCorrelation.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}












