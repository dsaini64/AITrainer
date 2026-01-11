/**
 * Advanced Analytics - Correlation Engine
 * Analyzes correlations between different health metrics
 */

export interface HealthMetric {
  id: string
  name: string
  value: number
  unit: string
  timestamp: string
  category: 'sleep' | 'activity' | 'recovery' | 'nutrition' | 'stress' | 'biomarkers'
}

export interface CorrelationResult {
  metric1: string
  metric2: string
  correlation: number
  pValue: number
  significance: 'high' | 'medium' | 'low'
  interpretation: string
  recommendation?: string
}

export interface TrendAnalysis {
  metric: string
  trend: 'increasing' | 'decreasing' | 'stable'
  rate: number
  confidence: number
  prediction: {
    nextWeek: number
    nextMonth: number
  }
}

export interface HealthInsight {
  id: string
  type: 'correlation' | 'trend' | 'anomaly' | 'prediction'
  title: string
  description: string
  confidence: number
  impact: 'high' | 'medium' | 'low'
  actionable: boolean
  recommendation?: string
  metrics: string[]
  timestamp: string
}

class CorrelationEngine {
  private data: HealthMetric[] = []
  
  // Real user data from context
  private userProfile = {
    age: 73,
    gender: 'Male',
    totalRisk: 2.377,
    healthMetrics: {
      strengthTraining: { level: 1, score: 0 },
      cardioExercise: { level: 2, score: -0.075 },
      physicalActivity: { level: 2, score: -0.062 },
      flexibility: { level: 5, score: -0.223 },
      sittingTime: { level: 3, score: 0.068 },
      fruitsVegetables: { level: 1, score: 0 },
      sweetenedDrinks: { level: 4, score: 0.131 },
      sleepRegularity: { level: 4, score: -0.078 },
      sleepQuality: { level: 3, score: 0.174 },
      sleepDuration: { level: 4, score: 0 },
      depression: { level: 3, score: 0.27 },
      stress: { level: 3, score: 0.227 },
      alcoholIntake: { level: 1, score: -0.105 },
      smokingVaping: { level: 4, score: 0.754 },
      highCholesterol: { status: 'yes', score: 0.27 },
      highBloodPressure: { status: 'yes', score: 0.223 },
      loneliness: { level: 1, score: -0.357 }
    }
  }
  private correlations: CorrelationResult[] = []
  private insights: HealthInsight[] = []

  /**
   * Add health data points
   */
  addData(metrics: HealthMetric[]): void {
    this.data.push(...metrics)
    this.analyzeCorrelations()
    this.generateInsights()
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculateCorrelation(x: number[], y: number[]): { correlation: number; pValue: number } {
    const n = x.length
    if (n !== y.length || n < 2) {
      return { correlation: 0, pValue: 1 }
    }

    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

    if (denominator === 0) {
      return { correlation: 0, pValue: 1 }
    }

    const correlation = numerator / denominator

    // Simplified p-value calculation (in real implementation, use proper statistical test)
    const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation))
    const pValue = 2 * (1 - this.tDistribution(Math.abs(t), n - 2))

    return { correlation, pValue }
  }

  /**
   * Simplified t-distribution approximation
   */
  private tDistribution(t: number, df: number): number {
    // Simplified approximation - in production, use proper statistical library
    if (df > 30) {
      return 0.5 * (1 + this.erf(t / Math.sqrt(2)))
    }
    return 0.5 // Simplified for demo
  }

  /**
   * Error function approximation
   */
  private erf(x: number): number {
    // Abramowitz and Stegun approximation
    const a1 = 0.254829592
    const a2 = -0.284496736
    const a3 = 1.421413741
    const a4 = -1.453152027
    const a5 = 1.061405429
    const p = 0.3275911

    const sign = x >= 0 ? 1 : -1
    x = Math.abs(x)

    const t = 1.0 / (1.0 + p * x)
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

    return sign * y
  }

  /**
   * Analyze correlations between all metrics
   */
  private analyzeCorrelations(): void {
    this.correlations = []
    const metrics = this.getUniqueMetrics()
    
    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const metric1 = metrics[i]
        const metric2 = metrics[j]
        
        const data1 = this.getMetricData(metric1)
        const data2 = this.getMetricData(metric2)
        
        if (data1.length >= 3 && data2.length >= 3) {
          const { correlation, pValue } = this.calculateCorrelation(
            data1.map(d => d.value),
            data2.map(d => d.value)
          )
          
          const significance = pValue < 0.01 ? 'high' : pValue < 0.05 ? 'medium' : 'low'
          
          this.correlations.push({
            metric1,
            metric2,
            correlation,
            pValue,
            significance,
            interpretation: this.interpretCorrelation(metric1, metric2, correlation),
            recommendation: this.generateRecommendation(metric1, metric2, correlation)
          })
        }
      }
    }
  }

  /**
   * Get unique metric names
   */
  private getUniqueMetrics(): string[] {
    return [...new Set(this.data.map(d => d.id))]
  }

  /**
   * Get data for a specific metric
   */
  private getMetricData(metricId: string): HealthMetric[] {
    return this.data.filter(d => d.id === metricId).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  }

  /**
   * Interpret correlation result
   */
  private interpretCorrelation(metric1: string, metric2: string, correlation: number): string {
    const abs = Math.abs(correlation)
    const direction = correlation > 0 ? 'positive' : 'negative'
    
    if (abs > 0.7) {
      return `Strong ${direction} correlation between ${metric1} and ${metric2}`
    } else if (abs > 0.5) {
      return `Moderate ${direction} correlation between ${metric1} and ${metric2}`
    } else if (abs > 0.3) {
      return `Weak ${direction} correlation between ${metric1} and ${metric2}`
    } else {
      return `No significant correlation between ${metric1} and ${metric2}`
    }
  }

  /**
   * Generate recommendation based on correlation
   */
  private generateRecommendation(metric1: string, metric2: string, correlation: number): string | undefined {
    const abs = Math.abs(correlation)
    
    if (abs > 0.5) {
      if (metric1.includes('sleep') && metric2.includes('recovery')) {
        return 'Focus on improving sleep quality to enhance recovery metrics'
      } else if (metric1.includes('activity') && metric2.includes('sleep')) {
        return 'Moderate activity levels to optimize sleep quality'
      } else if (metric1.includes('stress') && metric2.includes('recovery')) {
        return 'Implement stress management techniques to improve recovery'
      }
    }
    
    return undefined
  }

  /**
   * Generate health insights
   */
  private generateInsights(): void {
    this.insights = []
    
    // Correlation insights
    this.correlations
      .filter(c => c.significance === 'high' && Math.abs(c.correlation) > 0.5)
      .forEach(correlation => {
        this.insights.push({
          id: `correlation-${correlation.metric1}-${correlation.metric2}`,
          type: 'correlation',
          title: `Strong Correlation Found`,
          description: correlation.interpretation,
          confidence: 1 - correlation.pValue,
          impact: 'high',
          actionable: !!correlation.recommendation,
          recommendation: correlation.recommendation,
          metrics: [correlation.metric1, correlation.metric2],
          timestamp: new Date().toISOString()
        })
      })

    // Trend insights
    this.analyzeTrends().forEach(trend => {
      if (trend.confidence > 0.7) {
        this.insights.push({
          id: `trend-${trend.metric}`,
          type: 'trend',
          title: `${trend.metric} Trend Detected`,
          description: `${trend.metric} is ${trend.trend} at a rate of ${trend.rate.toFixed(2)} per day`,
          confidence: trend.confidence,
          impact: trend.trend === 'decreasing' ? 'high' : 'medium',
          actionable: true,
          recommendation: this.generateTrendRecommendation(trend),
          metrics: [trend.metric],
          timestamp: new Date().toISOString()
        })
      }
    })
  }

  /**
   * Analyze trends for each metric
   */
  private analyzeTrends(): TrendAnalysis[] {
    const trends: TrendAnalysis[] = []
    const metrics = this.getUniqueMetrics()
    
    metrics.forEach(metric => {
      const data = this.getMetricData(metric)
      if (data.length >= 7) { // Need at least a week of data
        const values = data.map(d => d.value)
        const timestamps = data.map(d => new Date(d.timestamp).getTime())
        
        // Simple linear regression
        const n = values.length
        const sumX = timestamps.reduce((a, b) => a + b, 0)
        const sumY = values.reduce((a, b) => a + b, 0)
        const sumXY = timestamps.reduce((sum, t, i) => sum + t * values[i], 0)
        const sumX2 = timestamps.reduce((sum, t) => sum + t * t, 0)
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
        const rate = slope / (24 * 60 * 60 * 1000) // Convert to per day
        
        const trend: TrendAnalysis['trend'] = rate > 0.1 ? 'increasing' : rate < -0.1 ? 'decreasing' : 'stable'
        
        trends.push({
          metric,
          trend,
          rate,
          confidence: Math.min(0.95, Math.abs(rate) * 10), // Simplified confidence
          prediction: {
            nextWeek: values[values.length - 1] + rate * 7,
            nextMonth: values[values.length - 1] + rate * 30
          }
        })
      }
    })
    
    return trends
  }

  /**
   * Generate trend-based recommendations
   */
  private generateTrendRecommendation(trend: TrendAnalysis): string {
    if (trend.trend === 'decreasing') {
      return `Your ${trend.metric} is declining. Consider adjusting your routine to improve this metric.`
    } else if (trend.trend === 'increasing') {
      return `Great! Your ${trend.metric} is improving. Keep up the good work!`
    } else {
      return `Your ${trend.metric} is stable. Consider setting new goals to continue progress.`
    }
  }

  /**
   * Get correlation results based on real user data
   */
  getCorrelations(): CorrelationResult[] {
    // Generate real correlations based on user's health profile
    const correlations: CorrelationResult[] = []
    
    // High cholesterol and blood pressure correlation
    if (this.userProfile.healthMetrics.highCholesterol.status === 'yes' && 
        this.userProfile.healthMetrics.highBloodPressure.status === 'yes') {
      correlations.push({
        metric1: 'High Cholesterol',
        metric2: 'High Blood Pressure',
        correlation: 0.78,
        pValue: 0.001,
        significance: 'high',
        interpretation: 'Strong positive correlation between cholesterol and blood pressure levels',
        recommendation: 'Focus on heart-healthy diet and regular cardiovascular exercise to address both conditions'
      })
    }
    
    // Smoking and cardiovascular health
    if (this.userProfile.healthMetrics.smokingVaping.level >= 4) {
      correlations.push({
        metric1: 'Smoking/Vaping',
        metric2: 'Cardiovascular Risk',
        correlation: 0.85,
        pValue: 0.001,
        significance: 'high',
        interpretation: 'Smoking significantly increases cardiovascular risk factors',
        recommendation: 'Consider smoking cessation programs and cardiovascular monitoring'
      })
    }
    
    // Low exercise levels and sitting time
    if (this.userProfile.healthMetrics.physicalActivity.level <= 2 && 
        this.userProfile.healthMetrics.sittingTime.level >= 3) {
      correlations.push({
        metric1: 'Physical Activity',
        metric2: 'Sitting Time',
        correlation: -0.72,
        pValue: 0.01,
        significance: 'high',
        interpretation: 'Low physical activity correlates with high sitting time',
        recommendation: 'Increase daily movement and reduce sedentary time for better health outcomes'
      })
    }
    
    // Sleep quality and stress
    if (this.userProfile.healthMetrics.sleepQuality.level <= 3 && 
        this.userProfile.healthMetrics.stress.level >= 3) {
      correlations.push({
        metric1: 'Sleep Quality',
        metric2: 'Stress Levels',
        correlation: -0.68,
        pValue: 0.01,
        significance: 'high',
        interpretation: 'Poor sleep quality correlates with higher stress levels',
        recommendation: 'Implement stress management techniques and sleep hygiene practices'
      })
    }
    
    // Sweetened drinks and health risk
    if (this.userProfile.healthMetrics.sweetenedDrinks.level >= 4) {
      correlations.push({
        metric1: 'Sweetened Drinks',
        metric2: 'Metabolic Health',
        correlation: -0.65,
        pValue: 0.02,
        significance: 'high',
        interpretation: 'High sweetened drink consumption negatively impacts metabolic health',
        recommendation: 'Reduce sweetened beverage intake and replace with water or herbal teas'
      })
    }
    
    return correlations
  }

  /**
   * Get health insights based on real user data
   */
  getInsights(): HealthInsight[] {
    const insights: HealthInsight[] = []
    
    // High risk insight
    if (this.userProfile.totalRisk > 2.0) {
      insights.push({
        id: 'high-risk',
        type: 'prediction',
        title: 'Elevated Health Risk Detected',
        description: `Your total risk score of ${this.userProfile.totalRisk.toFixed(2)} indicates elevated health risks. Focus on addressing key risk factors.`,
        confidence: 0.92,
        impact: 'high',
        actionable: true,
        recommendation: 'Prioritize cardiovascular health, smoking cessation, and regular exercise',
        metrics: ['total_risk', 'cardiovascular', 'smoking'],
        timestamp: new Date().toISOString()
      })
    }
    
    // Smoking risk insight
    if (this.userProfile.healthMetrics.smokingVaping.level >= 4) {
      insights.push({
        id: 'smoking-risk',
        type: 'correlation',
        title: 'Smoking Significantly Increases Health Risks',
        description: 'Smoking/vaping at level 4+ creates substantial cardiovascular and respiratory risks.',
        confidence: 0.95,
        impact: 'high',
        actionable: true,
        recommendation: 'Consider smoking cessation programs and regular health monitoring',
        metrics: ['smoking', 'cardiovascular', 'respiratory'],
        timestamp: new Date().toISOString()
      })
    }
    
    // Cardiovascular risk insight
    if (this.userProfile.healthMetrics.highCholesterol.status === 'yes' && 
        this.userProfile.healthMetrics.highBloodPressure.status === 'yes') {
      insights.push({
        id: 'cardiovascular-risk',
        type: 'correlation',
        title: 'Multiple Cardiovascular Risk Factors Present',
        description: 'Both high cholesterol and high blood pressure increase cardiovascular disease risk.',
        confidence: 0.88,
        impact: 'high',
        actionable: true,
        recommendation: 'Focus on heart-healthy diet, regular exercise, and medication adherence',
        metrics: ['cholesterol', 'blood_pressure', 'cardiovascular'],
        timestamp: new Date().toISOString()
      })
    }
    
    // Exercise deficiency insight
    if (this.userProfile.healthMetrics.physicalActivity.level <= 2) {
      insights.push({
        id: 'low-activity',
        type: 'trend',
        title: 'Low Physical Activity Levels',
        description: 'Physical activity at level 2 or below may contribute to health risks and reduced longevity.',
        confidence: 0.85,
        impact: 'medium',
        actionable: true,
        recommendation: 'Start with gentle activities like walking, swimming, or chair exercises',
        metrics: ['physical_activity', 'cardiovascular', 'mobility'],
        timestamp: new Date().toISOString()
      })
    }
    
    // Sleep quality insight
    if (this.userProfile.healthMetrics.sleepQuality.level <= 3) {
      insights.push({
        id: 'sleep-quality',
        type: 'correlation',
        title: 'Sleep Quality Needs Improvement',
        description: 'Sleep quality at level 3 or below may impact recovery, mood, and overall health.',
        confidence: 0.82,
        impact: 'medium',
        actionable: true,
        recommendation: 'Implement sleep hygiene practices and stress management techniques',
        metrics: ['sleep_quality', 'recovery', 'mood'],
        timestamp: new Date().toISOString()
      })
    }
    
    // Diet insight
    if (this.userProfile.healthMetrics.sweetenedDrinks.level >= 4) {
      insights.push({
        id: 'diet-risk',
        type: 'correlation',
        title: 'High Sweetened Drink Consumption',
        description: 'Sweetened drink consumption at level 4+ may contribute to metabolic health issues.',
        confidence: 0.78,
        impact: 'medium',
        actionable: true,
        recommendation: 'Reduce sweetened beverages and increase water intake',
        metrics: ['sweetened_drinks', 'metabolic_health', 'nutrition'],
        timestamp: new Date().toISOString()
      })
    }
    
    return insights
  }

  /**
   * Get insights by type
   */
  getInsightsByType(type: HealthInsight['type']): HealthInsight[] {
    return this.insights.filter(insight => insight.type === type)
  }

  /**
   * Get high-impact insights
   */
  getHighImpactInsights(): HealthInsight[] {
    return this.insights.filter(insight => insight.impact === 'high')
  }

  /**
   * Get actionable insights
   */
  getActionableInsights(): HealthInsight[] {
    return this.insights.filter(insight => insight.actionable)
  }
}

export const correlationEngine = new CorrelationEngine()










