import NextAuth from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { assertRuntimeSecurity } from '@/lib/bootstrap'

async function runAuthHandler(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
    return NextResponse.json(
      {
        error: 'Auth misconfigured: NEXTAUTH_SECRET is required in production',
        code: 'AUTH_CONFIG_ERROR',
      },
      { status: 500 }
    )
  }

  try {
    assertRuntimeSecurity()
    const handler = NextAuth(authOptions)
    return await handler(request)
  } catch (error) {
    console.error('nextauth_route_error', error)
    if (error instanceof Error && /DEMO_MODE/.test(error.message)) {
      return NextResponse.json(
        {
          error: 'Security boot guard: DEMO_MODE no puede estar habilitado en producción',
          code: 'AUTH_DEMO_MODE_FORBIDDEN',
        },
        { status: 500 }
      )
    }
    return NextResponse.json(
      {
        error: 'Internal auth error',
        code: 'AUTH_INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return runAuthHandler(request)
}

export async function POST(request: NextRequest) {
  return runAuthHandler(request)
}
