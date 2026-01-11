import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return new NextResponse(
        `<script>
          window.opener.postMessage({
            type: 'FITBIT_AUTH_ERROR',
            error: '${error}'
          }, window.location.origin);
          window.close();
        </script>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    if (!code) {
      return new NextResponse(
        `<script>
          window.opener.postMessage({
            type: 'FITBIT_AUTH_ERROR',
            error: 'No authorization code received'
          }, window.location.origin);
          window.close();
        </script>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://api.fitbit.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`
        ).toString('base64')}`
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID || '',
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/fitbit/callback`,
        code
      })
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens')
    }

    const tokens = await tokenResponse.json()

    return new NextResponse(
      `<script>
        window.opener.postMessage({
          type: 'FITBIT_AUTH_SUCCESS',
          accessToken: '${tokens.access_token}',
          refreshToken: '${tokens.refresh_token}'
        }, window.location.origin);
        window.close();
      </script>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (error) {
    console.error('Fitbit callback error:', error)
    return new NextResponse(
      `<script>
        window.opener.postMessage({
          type: 'FITBIT_AUTH_ERROR',
          error: 'Authentication failed'
        }, window.location.origin);
        window.close();
      </script>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}












