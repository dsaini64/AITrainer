"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { TrendChart } from "@/components/insights/TrendChart"
import { CorrelationCard } from "@/components/insights/CorrelationCard"
import { WeeklyReport } from "@/components/insights/WeeklyReport"
import { CorrelationMatrix } from "@/components/analytics/CorrelationMatrix"
import { PredictiveInsights } from "@/components/analytics/PredictiveInsights"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, TrendingUp, BarChart3, FileText, Brain, Target, CheckCircle } from "lucide-react"
import { useSearchParams } from "next/navigation"

// Mock data
const mockTrendData = {
  sleep: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString(),
    value: 6.5 + Math.random() * 2,
  })),
  hrv: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString(),
    value: 35 + Math.random() * 15,
  })),
  steps: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString(),
    value: 6000 + Math.random() * 4000,
  })),
  mood: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString(),
    value: 3 + Math.random() * 2,
  })),
}

const mockCorrelations = [
  {
    metric1: "Sleep Duration",
    metric2: "HRV",
    correlation: 0.73,
    confidence: 'high' as const,
    insight: "Better sleep consistently leads to higher HRV the next day. Your 7+ hour nights show 15% higher recovery scores."
  },
  {
    metric1: "Alcohol Intake",
    metric2: "Sleep Efficiency",
    correlation: -0.68,
    confidence: 'high' as const,
    insight: "Alcohol significantly impacts sleep quality. Even 1-2 units reduce sleep efficiency by 12% on average."
  },
  {
    metric1: "Late Meals",
    metric2: "Sleep Quality",
    correlation: -0.45,
    confidence: 'medium' as const,
    insight: "Eating within 3 hours of bedtime appears to disrupt sleep. Consider earlier dinner timing."
  },
  {
    metric1: "Zone 2 Training",
    metric2: "Mood Score",
    correlation: 0.52,
    confidence: 'medium' as const,
    insight: "Regular Zone 2 sessions correlate with improved mood scores. The effect peaks 2-3 days post-workout."
  }
]

const mockWeeklyReport = {
  weekNumber: 6,
  dateRange: "Sep 23 - Sep 29, 2024",
  keyChanges: [
    {
      metric: "Sleep Consistency",
      change: 12,
      type: 'improvement' as const,
      description: "Bedtime variance reduced to 23 minutes. Great progress on your sleep schedule goal."
    },
    {
      metric: "HRV Trend",
      change: -8,
      type: 'decline' as const,
      description: "Average HRV dropped 3.2ms. Likely due to increased training load this week."
    },
    {
      metric: "Protein Intake",
      change: 15,
      type: 'improvement' as const,
      description: "Hit protein target 6/7 days. Excellent consistency with meal planning."
    }
  ],
  wins: [
    "Completed first 45-min Zone 2 session",
    "7-day sleep consistency streak",
    "No alcohol for 5 consecutive days",
    "Hit 10k steps 4 times this week"
  ],
  risks: [
    {
      title: "Training Load Accumulation",
      description: "HRV trending down with increased workout intensity. Consider a recovery day.",
      severity: 'medium' as const
    },
    {
      title: "Weekend Sleep Pattern",
      description: "Bedtime shifted 90+ minutes later on weekends. This may impact Monday recovery.",
      severity: 'low' as const
    }
  ],
  overallScore: 78
}

export default function InsightsPage() {
  const searchParams = useSearchParams()
  const [selectedTimeframe, setSelectedTimeframe] = useState('2weeks')
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [completedActions, setCompletedActions] = useState<any[]>([])
  const [optimizations, setOptimizations] = useState<any[]>([])
  const [isGeneratingOptimizations, setIsGeneratingOptimizations] = useState(false)
  const [isComparing, setIsComparing] = useState(false)
  const [comparisonData, setComparisonData] = useState<any[]>([])

  // Load completed actions from localStorage
  useEffect(() => {
    const userPreferences = JSON.parse(localStorage.getItem('userPreferences') || '{}')
    const actions = userPreferences.completedActions || []
    setCompletedActions(actions)
  }, [])

  // Handle generate optimizations
  const handleGenerateOptimizations = async () => {
    setIsGeneratingOptimizations(true)
    try {
      const response = await fetch('/api/analytics?type=optimizations')
      const data = await response.json()
      setOptimizations(data.optimizations || [])
    } catch (error) {
      console.error('Error generating optimizations:', error)
    } finally {
      setIsGeneratingOptimizations(false)
    }
  }

  // Handle start comparing
  const handleStartComparing = async () => {
    setIsComparing(true)
    try {
      // Fetch multiple analytics data for comparison
      const [correlations, predictions, risks] = await Promise.all([
        fetch('/api/analytics?type=correlations').then(r => r.json()),
        fetch('/api/analytics?type=predictions').then(r => r.json()),
        fetch('/api/analytics?type=risks').then(r => r.json())
      ])
      
      setComparisonData([
        { type: 'correlations', data: correlations.correlations || [] },
        { type: 'predictions', data: predictions.predictions || [] },
        { type: 'risks', data: risks.risks || [] }
      ])
    } catch (error) {
      console.error('Error starting comparison:', error)
    } finally {
      setIsComparing(false)
    }
  }

  // Handle goal parameter from URL
  useEffect(() => {
    const goalId = searchParams.get('goal')
    if (goalId) {
      setSelectedGoal(goalId)
      // In a real app, you would filter the data based on the goal
      console.log('Filtering insights for goal:', goalId)
    }
  }, [searchParams])

  const handleCorrelationDetails = (metric1: string, metric2: string) => {
    console.log(`Show correlation details: ${metric1} vs ${metric2}`)
    // In real app, open detailed correlation view
  }

  const timeframeOptions = [
    { value: '1week', label: '1 Week' },
    { value: '2weeks', label: '2 Weeks' },
    { value: '1month', label: '1 Month' },
    { value: '3months', label: '3 Months' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Insights
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Understand your patterns and progress
            </p>
          </div>
          <div className="flex gap-2">
            {timeframeOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedTimeframe === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTimeframe(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <div className="px-4 py-6">
        {/* Goal Filter Indicator */}
        {selectedGoal && (
          <div className="mb-4 p-3 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span className="text-sm font-medium text-teal-800 dark:text-teal-200">
                  Viewing insights for selected goal
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedGoal(null)}
                className="text-teal-600 dark:text-teal-400"
              >
                Clear filter
              </Button>
            </div>
          </div>
        )}

        {/* Action Progress Summary */}
        {completedActions.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                Action Completion Summary
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {completedActions.length}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  Total Actions
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {completedActions.filter(a => new Date(a.completedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  This Week
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {Math.round((completedActions.length / Math.max(1, Math.ceil((Date.now() - new Date(completedActions[0]?.completedAt || Date.now()).getTime()) / (24 * 60 * 60 * 1000)))) * 7)}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  Actions/Week
                </div>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Trends</span>
            </TabsTrigger>
            <TabsTrigger value="correlations" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Correlations</span>
            </TabsTrigger>
            <TabsTrigger value="predictions" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Predictions</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="optimize" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Optimize</span>
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Compare</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <TrendChart
                title="Sleep Duration"
                data={mockTrendData.sleep}
                color="#8b5cf6"
                unit="h"
              />
              <TrendChart
                title="Heart Rate Variability"
                data={mockTrendData.hrv}
                color="#06b6d4"
                unit="ms"
              />
              <TrendChart
                title="Daily Steps"
                data={mockTrendData.steps}
                color="#10b981"
                unit=""
              />
              <TrendChart
                title="Mood Score"
                data={mockTrendData.mood}
                color="#f59e0b"
                unit="/5"
              />
            </div>
          </TabsContent>

          <TabsContent value="correlations" className="space-y-6">
            <CorrelationMatrix />
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            <PredictiveInsights />
          </TabsContent>

          <TabsContent value="optimize" className="space-y-6">
            <div className="space-y-6">
              <div className="text-center py-8">
                <Target className="h-16 w-16 text-teal-600 dark:text-teal-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  Optimization Engine
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  AI-powered recommendations to optimize your health and longevity
                </p>
                <Button 
                  size="lg" 
                  onClick={handleGenerateOptimizations}
                  disabled={isGeneratingOptimizations}
                >
                  <Brain className="h-5 w-5 mr-2" />
                  {isGeneratingOptimizations ? 'Generating...' : 'Generate Optimizations'}
                </Button>
                
                {/* Display optimizations */}
                {optimizations.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                      Your Personalized Optimizations
                    </h3>
                    {optimizations.map((opt, index) => (
                      <div key={index} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-slate-800 dark:text-slate-200">
                            {opt.metric}
                          </h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            opt.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            opt.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            {opt.priority} priority
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          Current: {opt.currentValue} → Target: {opt.targetValue} ({opt.improvement}% improvement)
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          Timeline: {opt.timeframe}
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Recommended Actions:
                          </div>
                          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                            {opt.actions.map((action: string, actionIndex: number) => (
                              <li key={actionIndex} className="flex items-center">
                                <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                                {action.replace(/_/g, ' ')}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <WeeklyReport {...mockWeeklyReport} />
            
            {/* Previous weeks placeholder */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Previous Reports
              </h2>
              <div className="grid gap-4">
                {[5, 4, 3].map((week) => (
                  <div
                    key={week}
                    className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-slate-100">
                          Week {week} Report
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {week === 5 ? "Sep 16 - Sep 22" : week === 4 ? "Sep 9 - Sep 15" : "Sep 2 - Sep 8"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {week === 5 ? "82" : week === 4 ? "75" : "79"}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Score
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="compare" className="space-y-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                Compare Tool
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                Overlay multiple metrics to discover patterns and relationships
              </p>
              <Button 
                onClick={handleStartComparing}
                disabled={isComparing}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {isComparing ? 'Comparing...' : 'Start Comparing'}
              </Button>
              
              {/* Display comparison data */}
              {comparisonData.length > 0 && (
                <div className="mt-6 space-y-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    Health Analytics Comparison
                  </h3>
                  {comparisonData.map((section, index) => (
                    <div key={index} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                      <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-3 capitalize">
                        {section.type} Analysis
                      </h4>
                      {section.data.length > 0 ? (
                        <div className="space-y-2">
                          {section.data.map((item: any, itemIndex: number) => (
                            <div key={itemIndex} className="text-sm text-slate-600 dark:text-slate-400 p-2 bg-slate-50 dark:bg-slate-700 rounded">
                              {section.type === 'correlations' && (
                                <div>
                                  <strong>{item.metric1}</strong> ↔ <strong>{item.metric2}</strong>
                                  <span className="ml-2 text-xs">({item.correlation > 0 ? '+' : ''}{item.correlation.toFixed(2)})</span>
                                  {item.recommendation && (
                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                      💡 {item.recommendation}
                                    </div>
                                  )}
                                </div>
                              )}
                              {section.type === 'predictions' && (
                                <div>
                                  <strong>{item.targetMetric}</strong>: {item.predictedValue > 0 ? '+' : ''}{(item.predictedValue * 100).toFixed(0)}% 
                                  <span className="ml-2 text-xs">({item.timeframe})</span>
                                  {item.recommendation && (
                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                      💡 {item.recommendation}
                                    </div>
                                  )}
                                </div>
                              )}
                              {section.type === 'risks' && (
                                <div>
                                  <strong>{item.metric}</strong>: {item.riskLevel} risk ({Math.round(item.probability * 100)}%)
                                  <span className="ml-2 text-xs">({item.timeframe})</span>
                                  {item.mitigation.length > 0 && (
                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                      🛡️ Mitigation: {item.mitigation.slice(0, 2).join(', ')}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          No {section.type} data available
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}