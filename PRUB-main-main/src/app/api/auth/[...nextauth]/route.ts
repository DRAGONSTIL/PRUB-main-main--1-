import NextAuth from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

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
    const handler = NextAuth(authOptions)
    return await handler(request)
  } catch (error) {
    console.error('nextauth_route_error', error)
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
