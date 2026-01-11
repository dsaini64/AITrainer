import { NextRequest, NextResponse } from 'next/server'
import { imageAnalysisManager } from '@/lib/ai/image-analysis'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const analysisType = formData.get('type') as string

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Analyze the image
    const result = await imageAnalysisManager.analyzeImage(
      imageFile, 
      analysisType as any
    )

    // Save to history
    imageAnalysisManager.saveAnalysis(result)

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Image analysis API error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze image' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const history = imageAnalysisManager.getAnalysisHistory()
    
    if (type) {
      const filteredHistory = history.filter(analysis => analysis.type === type)
      return NextResponse.json({ analyses: filteredHistory })
    }

    return NextResponse.json({ analyses: history })
  } catch (error) {
    console.error('Failed to get analysis history:', error)
    return NextResponse.json(
      { error: 'Failed to get analysis history' },
      { status: 500 }
    )
  }
}












