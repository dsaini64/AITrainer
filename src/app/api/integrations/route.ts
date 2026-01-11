import { NextRequest, NextResponse } from 'next/server'
import { deviceManager } from '@/lib/integrations/device-manager'

export async function GET(request: NextRequest) {
  try {
    const integrations = await deviceManager.getAvailableIntegrations()
    return NextResponse.json({ integrations })
  } catch (error) {
    console.error('Failed to get integrations:', error)
    return NextResponse.json(
      { error: 'Failed to get integrations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, integrationId, ...params } = await request.json()

    switch (action) {
      case 'initialize':
        const initialized = await deviceManager.initializeIntegration(integrationId)
        return NextResponse.json({ success: initialized })

      case 'requestPermissions':
        const granted = await deviceManager.requestPermissions(integrationId)
        return NextResponse.json({ success: granted })

      case 'sync':
        const data = await deviceManager.syncData(integrationId)
        return NextResponse.json({ data })

      case 'syncAll':
        const allData = await deviceManager.syncAllData()
        return NextResponse.json({ data: allData })

      case 'disable':
        await deviceManager.disableIntegration(integrationId)
        return NextResponse.json({ success: true })

      case 'status':
        const status = await deviceManager.getIntegrationStatus(integrationId)
        return NextResponse.json({ status })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Integration action failed:', error)
    return NextResponse.json(
      { error: 'Action failed' },
      { status: 500 }
    )
  }
}












