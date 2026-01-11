"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, AlertTriangle, Target, Clock, Zap } from "lucide-react"

interface Prediction {
  id: string
  modelId: string
  targetMetric: string
  predictedValue: number
  confidence: number
  timeframe: '1day' | '3days' | '1week' | '1month'
  factors: string[]
  recommendation?: string
  timestamp: string
}

interface RiskAssessment {
  metric: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  probability: number
  timeframe: string
  factors: string[]
  mitigation: string[]
}

interface OptimizationSuggestion {
  id: string
  metric: string
  currentValue: number
  targetValue: number
  improvement: number
  actions: string[]
  timeframe: string
  priority: 'high' | 'medium' | 'low'
}

export function PredictiveInsights() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [risks, setRisks] = useState<RiskAssessment[]>([])
  const [optimizations, setOptimizations] = useState<OptimizationSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'predictions' | 'risks' | 'optimizations'>('predictions')

  useEffect(() => {
    loadPredictiveData()
  }, [])

  const loadPredictiveData = async () => {
    try {
      const [predictionsRes, risksRes, optimizationsRes] = await Promise.all([
        fetch('/api/analytics?type=predictions'),
        fetch('/api/analytics?type=risks'),
        fetch('/api/analytics?type=optimizations')
      ])

      const [predictionsData, risksData, optimizationsData] = await Promise.all([
        predictionsRes.json(),
        risksRes.json(),
        optimizationsRes.json()
      ])

      setPredictions(predictionsData.predictions || [])
      setRisks(risksData.risks || [])
      setOptimizations(optimizationsData.optimizations || [])
    } catch (error) {
      console.error('Failed to load predictive data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'text-red-600 dark:text-red-400'
      case 'high': return 'text-orange-600 dark:text-orange-400'
      case 'medium': return 'text-yellow-600 dark:text-yellow-400'
      default: return 'text-green-600 dark:text-green-400'
    }
  }

  const getRiskBadge = (riskLevel: string) => {
    const variants = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    } as const

    return (
      <Badge variant={variants[riskLevel as keyof typeof variants] || 'outline'}>
        {riskLevel}
      </Badge>
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-400'
      case 'medium': return 'text-yellow-600 dark:text-yellow-400'
      default: return 'text-green-600 dark:text-green-400'
    }
  }

  const getTimeframeIcon = (timeframe: string) => {
    switch (timeframe) {
      case '1day': return <Clock className="h-4 w-4" />
      case '3days': return <Clock className="h-4 w-4" />
      case '1week': return <Target className="h-4 w-4" />
      case '1month': return <Zap className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Predictive Insights</CardTitle>
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
            <span>Predictive Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-1 mb-6">
            {[
              { id: 'predictions', label: 'Predictions', count: predictions.length },
              { id: 'risks', label: 'Risk Assessment', count: risks.length },
              { id: 'optimizations', label: 'Optimizations', count: optimizations.length }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className="flex items-center space-x-2"
              >
                <span>{tab.label}</span>
                <Badge variant="outline">{tab.count}</Badge>
              </Button>
            ))}
          </div>

          {/* Predictions Tab */}
          {activeTab === 'predictions' && (
            <div className="space-y-4">
              {predictions.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">
                    No predictions available. Add more data to generate predictions.
                  </p>
                </div>
              ) : (
                predictions.map((prediction) => (
                  <div key={prediction.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getTimeframeIcon(prediction.timeframe)}
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-slate-100">
                            {prediction.targetMetric}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {prediction.timeframe} prediction
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                          {prediction.predictedValue.toFixed(0)}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {Math.round(prediction.confidence * 100)}% confidence
                        </div>
                      </div>
                    </div>
                    
                    {prediction.recommendation && (
                      <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-lg p-3">
                        <p className="text-sm text-teal-700 dark:text-teal-300">
                          {prediction.recommendation}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Risks Tab */}
          {activeTab === 'risks' && (
            <div className="space-y-4">
              {risks.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">
                    No risk assessments available. Continue tracking to identify potential risks.
                  </p>
                </div>
              ) : (
                risks.map((risk, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-slate-100">
                          {risk.metric}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {risk.timeframe} timeframe
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold ${getRiskColor(risk.riskLevel)}`}>
                          {Math.round(risk.probability * 100)}%
                        </span>
                        {getRiskBadge(risk.riskLevel)}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Contributing Factors:
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {risk.factors.map((factor, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Mitigation Strategies:
                        </h4>
                        <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                          {risk.mitigation.map((strategy, i) => (
                            <li key={i} className="flex items-start space-x-2">
                              <span className="text-teal-600 dark:text-teal-400 mt-1">•</span>
                              <span>{strategy}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Optimizations Tab */}
          {activeTab === 'optimizations' && (
            <div className="space-y-4">
              {optimizations.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">
                    No optimization suggestions available. Continue tracking to get personalized recommendations.
                  </p>
                </div>
              ) : (
                optimizations.map((optimization) => (
                  <div key={optimization.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-slate-100">
                          {optimization.metric}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {optimization.timeframe} to achieve target
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                          +{optimization.improvement.toFixed(0)}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          potential improvement
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Current: {optimization.currentValue.toFixed(0)}
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Target: {optimization.targetValue.toFixed(0)}
                        </span>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Recommended Actions:
                        </h4>
                        <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                          {optimization.actions.map((action, i) => (
                            <li key={i} className="flex items-start space-x-2">
                              <span className="text-teal-600 dark:text-teal-400 mt-1">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}












