import { NextRequest, NextResponse } from 'next/server'
import { proactiveCoachScheduler } from '@/lib/scheduler/scheduled-jobs'

export async function GET(request: NextRequest) {
  try {
    const status = proactiveCoachScheduler.getJobStatus()
    
    return NextResponse.json({
      scheduler: {
        isRunning: true,
        jobs: status
      }
    })

  } catch (error) {
    console.error('Error getting scheduler status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, jobId, isActive } = await request.json()

    switch (action) {
      case 'toggle':
        if (!jobId || typeof isActive !== 'boolean') {
          return NextResponse.json(
            { error: 'jobId and isActive are required for toggle action' },
            { status: 400 }
          )
        }
        proactiveCoachScheduler.toggleJob(jobId, isActive)
        break

      case 'start':
        proactiveCoachScheduler.start()
        break

      case 'stop':
        proactiveCoachScheduler.stop()
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `Scheduler ${action} completed`
    })

  } catch (error) {
    console.error('Error in scheduler control:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}








