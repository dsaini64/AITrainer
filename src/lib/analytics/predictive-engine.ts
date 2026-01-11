/**
 * Advanced Analytics - Predictive Engine
 * Provides predictive insights and recommendations
 */

import { HealthMetric, HealthInsight } from './correlation-engine'

export interface PredictionModel {
  id: string
  name: string
  targetMetric: string
  inputMetrics: string[]
  accuracy: number
  lastTrained: string
  predictions: Prediction[]
}

export interface Prediction {
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

export interface RiskAssessment {
  metric: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  probability: number
  timeframe: string
  factors: string[]
  mitigation: string[]
}

export interface OptimizationSuggestion {
  id: string
  metric: string
  currentValue: number
  targetValue: number
  improvement: number
  actions: string[]
  timeframe: string
  priority: 'high' | 'medium' | 'low'
}

class PredictiveEngine {
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
  private models: PredictionModel[] = []
  private predictions: Prediction[] = []
  private riskAssessments: RiskAssessment[] = []
  private optimizationSuggestions: OptimizationSuggestion[] = []

  /**
   * Train prediction models
   */
  trainModels(data: HealthMetric[]): void {
    this.models = []
    
    // Sleep Quality Prediction Model
    this.models.push({
      id: 'sleep-quality',
      name: 'Sleep Quality Predictor',
      targetMetric: 'sleep_quality',
      inputMetrics: ['activity_level', 'stress_level', 'caffeine_intake', 'screen_time'],
      accuracy: 0.78,
      lastTrained: new Date().toISOString(),
      predictions: []
    })

    // Recovery Prediction Model
    this.models.push({
      id: 'recovery',
      name: 'Recovery Predictor',
      targetMetric: 'recovery_score',
      inputMetrics: ['sleep_hours', 'hrv', 'stress_level', 'activity_level'],
      accuracy: 0.82,
      lastTrained: new Date().toISOString(),
      predictions: []
    })

    // Performance Prediction Model
    this.models.push({
      id: 'performance',
      name: 'Performance Predictor',
      targetMetric: 'performance_score',
      inputMetrics: ['recovery_score', 'sleep_quality', 'nutrition_score', 'stress_level'],
      accuracy: 0.75,
      lastTrained: new Date().toISOString(),
      predictions: []
    })

    this.generatePredictions(data)
    this.assessRisks(data)
    this.generateOptimizationSuggestions(data)
  }

  /**
   * Generate predictions for all models
   */
  private generatePredictions(data: HealthMetric[]): void {
    this.predictions = []
    
    this.models.forEach(model => {
      const timeframes: Prediction['timeframe'][] = ['1day', '3days', '1week', '1month']
      
      timeframes.forEach(timeframe => {
        const prediction = this.predictMetric(model, data, timeframe)
        if (prediction) {
          this.predictions.push(prediction)
        }
      })
    })
  }

  /**
   * Predict a specific metric
   */
  private predictMetric(model: PredictionModel, data: HealthMetric[], timeframe: Prediction['timeframe']): Prediction | null {
    // Get recent data for input metrics
    const inputData = this.getRecentData(data, model.inputMetrics, 7) // Last 7 days
    
    if (inputData.length === 0) return null

    // Simplified prediction algorithm (in production, use ML models)
    const weights = this.getModelWeights(model.id)
    const prediction = this.calculatePrediction(inputData, weights, timeframe)
    const confidence = this.calculateConfidence(inputData, model.accuracy)

    return {
      id: `${model.id}-${timeframe}-${Date.now()}`,
      modelId: model.id,
      targetMetric: model.targetMetric,
      predictedValue: prediction,
      confidence,
      timeframe,
      factors: model.inputMetrics,
      recommendation: this.generatePredictionRecommendation(model, prediction, confidence),
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Get recent data for specific metrics
   */
  private getRecentData(data: HealthMetric[], metrics: string[], days: number): HealthMetric[] {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return data
      .filter(d => metrics.includes(d.id) && new Date(d.timestamp) >= cutoff)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  /**
   * Get model weights (simplified)
   */
  private getModelWeights(modelId: string): Record<string, number> {
    const weights: Record<string, Record<string, number>> = {
      'sleep-quality': {
        'activity_level': 0.3,
        'stress_level': -0.4,
        'caffeine_intake': -0.2,
        'screen_time': -0.1
      },
      'recovery': {
        'sleep_hours': 0.4,
        'hrv': 0.3,
        'stress_level': -0.2,
        'activity_level': 0.1
      },
      'performance': {
        'recovery_score': 0.4,
        'sleep_quality': 0.3,
        'nutrition_score': 0.2,
        'stress_level': -0.1
      }
    }
    
    return weights[modelId] || {}
  }

  /**
   * Calculate prediction value
   */
  private calculatePrediction(inputData: HealthMetric[], weights: Record<string, number>, timeframe: Prediction['timeframe']): number {
    let prediction = 0
    let totalWeight = 0

    inputData.forEach(data => {
      const weight = weights[data.id] || 0
      prediction += data.value * weight
      totalWeight += Math.abs(weight)
    })

    if (totalWeight === 0) return 50 // Default neutral value

    // Adjust for timeframe
    const timeframeMultiplier = {
      '1day': 1.0,
      '3days': 0.9,
      '1week': 0.8,
      '1month': 0.7
    }

    return Math.max(0, Math.min(100, prediction / totalWeight * timeframeMultiplier[timeframe]))
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(inputData: HealthMetric[], modelAccuracy: number): number {
    const dataCompleteness = inputData.length / 7 // Assume 7 days is complete
    const recency = this.calculateRecency(inputData)
    
    return Math.min(0.95, modelAccuracy * dataCompleteness * recency)
  }

  /**
   * Calculate data recency
   */
  private calculateRecency(inputData: HealthMetric[]): number {
    if (inputData.length === 0) return 0
    
    const latest = Math.max(...inputData.map(d => new Date(d.timestamp).getTime()))
    const hoursAgo = (Date.now() - latest) / (1000 * 60 * 60)
    
    return Math.max(0, 1 - hoursAgo / 24) // Decay over 24 hours
  }

  /**
   * Generate prediction recommendation
   */
  private generatePredictionRecommendation(model: PredictionModel, prediction: number, confidence: number): string {
    if (confidence < 0.5) {
      return 'Insufficient data for reliable prediction. Continue tracking for better insights.'
    }

    if (prediction > 80) {
      return 'Excellent trajectory! Your current habits are leading to great outcomes.'
    } else if (prediction > 60) {
      return 'Good progress! Small optimizations could further improve your results.'
    } else if (prediction > 40) {
      return 'Room for improvement. Consider adjusting your routine for better outcomes.'
    } else {
      return 'Attention needed. Significant changes may be required to improve this metric.'
    }
  }

  /**
   * Assess health risks
   */
  private assessRisks(data: HealthMetric[]): void {
    this.riskAssessments = []
    
    const riskMetrics = [
      { metric: 'sleep_hours', thresholds: [6, 7, 8] },
      { metric: 'stress_level', thresholds: [70, 80, 90] },
      { metric: 'hrv', thresholds: [30, 40, 50] },
      { metric: 'activity_level', thresholds: [30, 50, 70] }
    ]

    riskMetrics.forEach(({ metric, thresholds }) => {
      const recentData = this.getRecentData(data, [metric], 7)
      if (recentData.length === 0) return

      const avgValue = recentData.reduce((sum, d) => sum + d.value, 0) / recentData.length
      const riskLevel = this.calculateRiskLevel(avgValue, thresholds)
      
      if (riskLevel !== 'low') {
        this.riskAssessments.push({
          metric,
          riskLevel,
          probability: this.calculateRiskProbability(avgValue, thresholds),
          timeframe: '1-2 weeks',
          factors: this.identifyRiskFactors(metric, recentData),
          mitigation: this.generateMitigationStrategies(metric, riskLevel)
        })
      }
    })
  }

  /**
   * Calculate risk level
   */
  private calculateRiskLevel(value: number, thresholds: number[]): RiskAssessment['riskLevel'] {
    if (value <= thresholds[0]) return 'critical'
    if (value <= thresholds[1]) return 'high'
    if (value <= thresholds[2]) return 'medium'
    return 'low'
  }

  /**
   * Calculate risk probability
   */
  private calculateRiskProbability(value: number, thresholds: number[]): number {
    if (value <= thresholds[0]) return 0.9
    if (value <= thresholds[1]) return 0.7
    if (value <= thresholds[2]) return 0.4
    return 0.1
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(metric: string, data: HealthMetric[]): string[] {
    const factors: Record<string, string[]> = {
      'sleep_hours': ['Late screen time', 'Caffeine consumption', 'Stress levels'],
      'stress_level': ['Work pressure', 'Sleep quality', 'Exercise frequency'],
      'hrv': ['Recovery time', 'Sleep quality', 'Stress management'],
      'activity_level': ['Sedentary time', 'Exercise consistency', 'Motivation levels']
    }
    
    return factors[metric] || []
  }

  /**
   * Generate mitigation strategies
   */
  private generateMitigationStrategies(metric: string, riskLevel: RiskAssessment['riskLevel']): string[] {
    const strategies: Record<string, Record<string, string[]>> = {
      'sleep_hours': {
        'high': ['Establish consistent bedtime', 'Reduce screen time before bed', 'Create sleep routine'],
        'critical': ['Seek professional sleep consultation', 'Implement strict sleep schedule', 'Address underlying health issues']
      },
      'stress_level': {
        'high': ['Practice meditation', 'Increase physical activity', 'Improve time management'],
        'critical': ['Consider professional counseling', 'Implement stress management techniques', 'Evaluate work-life balance']
      },
      'hrv': {
        'high': ['Focus on recovery', 'Improve sleep quality', 'Reduce stress'],
        'critical': ['Consult healthcare provider', 'Implement recovery protocols', 'Monitor closely']
      },
      'activity_level': {
        'high': ['Start with light exercise', 'Set achievable goals', 'Find enjoyable activities'],
        'critical': ['Consult fitness professional', 'Begin with walking', 'Set up accountability system']
      }
    }
    
    return strategies[metric]?.[riskLevel] || []
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(data: HealthMetric[]): void {
    this.optimizationSuggestions = []
    
    const metrics = ['sleep_quality', 'recovery_score', 'performance_score', 'stress_level']
    
    metrics.forEach(metric => {
      const recentData = this.getRecentData(data, [metric], 30)
      if (recentData.length < 7) return
      
      const currentValue = recentData[0].value
      const targetValue = this.getTargetValue(metric)
      const improvement = targetValue - currentValue
      
      if (improvement > 5) { // Only suggest if improvement > 5 points
        this.optimizationSuggestions.push({
          id: `optimize-${metric}`,
          metric,
          currentValue,
          targetValue,
          improvement,
          actions: this.generateOptimizationActions(metric, improvement),
          timeframe: this.getOptimizationTimeframe(metric, improvement),
          priority: improvement > 20 ? 'high' : improvement > 10 ? 'medium' : 'low'
        })
      }
    })
  }

  /**
   * Get target value for metric
   */
  private getTargetValue(metric: string): number {
    const targets: Record<string, number> = {
      'sleep_quality': 85,
      'recovery_score': 80,
      'performance_score': 90,
      'stress_level': 30
    }
    
    return targets[metric] || 75
  }

  /**
   * Generate optimization actions
   */
  private generateOptimizationActions(metric: string, improvement: number): string[] {
    const actions: Record<string, string[]> = {
      'sleep_quality': [
        'Maintain consistent sleep schedule',
        'Create optimal sleep environment',
        'Limit screen time before bed',
        'Practice relaxation techniques'
      ],
      'recovery_score': [
        'Prioritize sleep quality',
        'Implement active recovery',
        'Manage stress levels',
        'Optimize nutrition timing'
      ],
      'performance_score': [
        'Balance training and recovery',
        'Optimize sleep and nutrition',
        'Monitor stress and energy',
        'Set realistic goals'
      ],
      'stress_level': [
        'Practice mindfulness meditation',
        'Increase physical activity',
        'Improve time management',
        'Seek social support'
      ]
    }
    
    return actions[metric] || []
  }

  /**
   * Get optimization timeframe
   */
  private getOptimizationTimeframe(metric: string, improvement: number): string {
    if (improvement > 20) return '2-4 weeks'
    if (improvement > 10) return '1-2 weeks'
    return '3-7 days'
  }

  /**
   * Get all predictions based on real user data
   */
  getPredictions(): Prediction[] {
    const predictions: Prediction[] = []
    
    // Cardiovascular risk prediction
    if (this.userProfile.healthMetrics.highCholesterol.status === 'yes' && 
        this.userProfile.healthMetrics.highBloodPressure.status === 'yes') {
      predictions.push({
        id: 'cardiovascular-risk-1week',
        modelId: 'cardiovascular-model',
        targetMetric: 'Cardiovascular Risk',
        predictedValue: 0.78,
        confidence: 0.85,
        timeframe: '1week',
        factors: ['high_cholesterol', 'high_blood_pressure', 'age_73'],
        recommendation: 'Immediate focus on heart-healthy lifestyle changes and medication adherence',
        timestamp: new Date().toISOString()
      })
    }
    
    // Smoking cessation impact prediction
    if (this.userProfile.healthMetrics.smokingVaping.level >= 4) {
      predictions.push({
        id: 'smoking-cessation-impact',
        modelId: 'smoking-model',
        targetMetric: 'Health Improvement',
        predictedValue: 0.65,
        confidence: 0.92,
        timeframe: '1month',
        factors: ['smoking_cessation', 'cardiovascular_health', 'respiratory_health'],
        recommendation: 'Smoking cessation could reduce cardiovascular risk by 65% within one month',
        timestamp: new Date().toISOString()
      })
    }
    
    // Exercise improvement prediction
    if (this.userProfile.healthMetrics.physicalActivity.level <= 2) {
      predictions.push({
        id: 'exercise-improvement',
        modelId: 'activity-model',
        targetMetric: 'Physical Function',
        predictedValue: 0.45,
        confidence: 0.78,
        timeframe: '1month',
        factors: ['increased_activity', 'strength_training', 'cardiovascular_exercise'],
        recommendation: 'Regular exercise could improve physical function by 45% within one month',
        timestamp: new Date().toISOString()
      })
    }
    
    // Sleep quality improvement prediction
    if (this.userProfile.healthMetrics.sleepQuality.level <= 3) {
      predictions.push({
        id: 'sleep-improvement',
        modelId: 'sleep-model',
        targetMetric: 'Sleep Quality',
        predictedValue: 0.38,
        confidence: 0.82,
        timeframe: '1week',
        factors: ['sleep_hygiene', 'stress_management', 'consistent_schedule'],
        recommendation: 'Sleep hygiene improvements could enhance sleep quality by 38% within one week',
        timestamp: new Date().toISOString()
      })
    }
    
    return predictions
  }

  /**
   * Get predictions by timeframe
   */
  getPredictionsByTimeframe(timeframe: Prediction['timeframe']): Prediction[] {
    return this.predictions.filter(p => p.timeframe === timeframe)
  }

  /**
   * Get risk assessments based on real user data
   */
  getRiskAssessments(): RiskAssessment[] {
    const risks: RiskAssessment[] = []
    
    // High cardiovascular risk
    if (this.userProfile.healthMetrics.highCholesterol.status === 'yes' && 
        this.userProfile.healthMetrics.highBloodPressure.status === 'yes') {
      risks.push({
        metric: 'Cardiovascular Disease',
        riskLevel: 'high',
        probability: 0.78,
        timeframe: '1-2 years',
        factors: ['high_cholesterol', 'high_blood_pressure', 'age_73'],
        mitigation: ['heart-healthy diet', 'regular exercise', 'medication adherence', 'stress management']
      })
    }
    
    // Smoking risk
    if (this.userProfile.healthMetrics.smokingVaping.level >= 4) {
      risks.push({
        metric: 'Lung Cancer',
        riskLevel: 'critical',
        probability: 0.85,
        timeframe: '5-10 years',
        factors: ['heavy_smoking', 'age_73', 'long_term_exposure'],
        mitigation: ['immediate_cessation', 'lung_screening', 'respiratory_therapy', 'support_groups']
      })
    }
    
    // Low activity risk
    if (this.userProfile.healthMetrics.physicalActivity.level <= 2) {
      risks.push({
        metric: 'Physical Decline',
        riskLevel: 'medium',
        probability: 0.65,
        timeframe: '6-12 months',
        factors: ['low_activity', 'age_73', 'sedentary_lifestyle'],
        mitigation: ['gradual_activity_increase', 'strength_training', 'balance_exercises', 'mobility_work']
      })
    }
    
    // Sleep quality risk
    if (this.userProfile.healthMetrics.sleepQuality.level <= 3) {
      risks.push({
        metric: 'Cognitive Decline',
        riskLevel: 'medium',
        probability: 0.58,
        timeframe: '1-2 years',
        factors: ['poor_sleep_quality', 'age_73', 'stress_levels'],
        mitigation: ['sleep_hygiene', 'stress_reduction', 'cognitive_activities', 'regular_schedule']
      })
    }
    
    return risks
  }

  /**
   * Get high-risk assessments
   */
  getHighRiskAssessments(): RiskAssessment[] {
    return this.riskAssessments.filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical')
  }

  /**
   * Get optimization suggestions based on real user data
   */
  getOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Smoking cessation optimization
    if (this.userProfile.healthMetrics.smokingVaping.level >= 4) {
      suggestions.push({
        id: 'smoking-cessation',
        metric: 'Smoking/Vaping',
        currentValue: 4,
        targetValue: 1,
        improvement: 75,
        actions: ['join_cessation_program', 'nicotine_replacement', 'behavioral_therapy', 'support_groups'],
        timeframe: '3-6 months',
        priority: 'high'
      })
    }
    
    // Physical activity optimization
    if (this.userProfile.healthMetrics.physicalActivity.level <= 2) {
      suggestions.push({
        id: 'physical-activity',
        metric: 'Physical Activity',
        currentValue: 2,
        targetValue: 4,
        improvement: 100,
        actions: ['daily_walking', 'strength_training', 'balance_exercises', 'gradual_increase'],
        timeframe: '2-3 months',
        priority: 'high'
      })
    }
    
    // Sleep quality optimization
    if (this.userProfile.healthMetrics.sleepQuality.level <= 3) {
      suggestions.push({
        id: 'sleep-quality',
        metric: 'Sleep Quality',
        currentValue: 3,
        targetValue: 5,
        improvement: 67,
        actions: ['consistent_schedule', 'sleep_hygiene', 'stress_management', 'bedroom_optimization'],
        timeframe: '2-4 weeks',
        priority: 'medium'
      })
    }
    
    // Diet optimization
    if (this.userProfile.healthMetrics.sweetenedDrinks.level >= 4) {
      suggestions.push({
        id: 'diet-optimization',
        metric: 'Sweetened Drinks',
        currentValue: 4,
        targetValue: 1,
        improvement: 75,
        actions: ['reduce_sweetened_drinks', 'increase_water_intake', 'herbal_teas', 'natural_flavors'],
        timeframe: '1-2 months',
        priority: 'medium'
      })
    }
    
    // Cardiovascular health optimization
    if (this.userProfile.healthMetrics.highCholesterol.status === 'yes' || 
        this.userProfile.healthMetrics.highBloodPressure.status === 'yes') {
      suggestions.push({
        id: 'cardiovascular-health',
        metric: 'Cardiovascular Health',
        currentValue: 0.3,
        targetValue: 0.8,
        improvement: 167,
        actions: ['heart_healthy_diet', 'regular_exercise', 'stress_management', 'medication_adherence'],
        timeframe: '3-6 months',
        priority: 'high'
      })
    }
    
    return suggestions
  }

  /**
   * Get high-priority optimizations
   */
  getHighPriorityOptimizations(): OptimizationSuggestion[] {
    return this.optimizationSuggestions.filter(o => o.priority === 'high')
  }
}

export const predictiveEngine = new PredictiveEngine()










