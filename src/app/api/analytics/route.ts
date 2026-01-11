import { NextRequest, NextResponse } from 'next/server'
import { correlationEngine } from '@/lib/analytics/correlation-engine'
import { predictiveEngine } from '@/lib/analytics/predictive-engine'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    switch (type) {
      case 'correlations':
        const correlations = correlationEngine.getCorrelations()
        return NextResponse.json({ correlations })

      case 'insights':
        const insights = correlationEngine.getInsights()
        return NextResponse.json({ insights })

      case 'predictions':
        const predictions = predictiveEngine.getPredictions()
        return NextResponse.json({ predictions })

      case 'risks':
        const risks = predictiveEngine.getRiskAssessments()
        return NextResponse.json({ risks })

      case 'optimizations':
        const optimizations = predictiveEngine.getOptimizationSuggestions()
        return NextResponse.json({ optimizations })

      default:
        return NextResponse.json({
          correlations: correlationEngine.getCorrelations(),
          insights: correlationEngine.getInsights(),
          predictions: predictiveEngine.getPredictions(),
          risks: predictiveEngine.getRiskAssessments(),
          optimizations: predictiveEngine.getOptimizationSuggestions()
        })
    }
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to get analytics data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()

    switch (action) {
      case 'analyze':
        // Add data to correlation engine
        if (data.metrics) {
          correlationEngine.addData(data.metrics)
        }
        
        // Train predictive models
        if (data.metrics) {
          predictiveEngine.trainModels(data.metrics)
        }
        
        return NextResponse.json({ success: true })

      case 'generate_insights':
        // Generate insights for specific metrics
        const insights = correlationEngine.getInsights()
        return NextResponse.json({ insights })

      case 'assess_risks':
        // Get risk assessments
        const risks = predictiveEngine.getRiskAssessments()
        return NextResponse.json({ risks })

      case 'get_predictions':
        // Get predictions for specific timeframe
        const timeframe = data.timeframe || '1week'
        const predictions = predictiveEngine.getPredictionsByTimeframe(timeframe as any)
        return NextResponse.json({ predictions })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Analytics action failed:', error)
    return NextResponse.json(
      { error: 'Action failed' },
      { status: 500 }
    )
  }
}












