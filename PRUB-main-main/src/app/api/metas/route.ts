// ATLAS GSE - API de Metas

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { MetaCreateSchema, MetaFilterSchema, MetaUpdateSchema } from '@/lib/validations'

// GET - Listar metas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters = MetaFilterSchema.parse({
      reclutadorId: searchParams.get('reclutadorId') || undefined,
      tipo: searchParams.get('tipo') || undefined,
      periodo: searchParams.get('periodo') || undefined,
      estatus: searchParams.get('estatus') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
    })

    const skip = (filters.page - 1) * filters.limit

    // Construir filtros
    const where: any = {}

    if (session.user.rol === 'RECLUTADOR') {
      where.reclutadorId = session.user.id
    } else if (session.user.rol === 'GERENTE') {
      // Ver reclutadores de su empresa
      const reclutadores = await db.user.findMany({
        where: { empresaId: session.user.empresaId, rol: 'RECLUTADOR' },
        select: { id: true },
      })
      where.reclutadorId = { in: [...reclutadores.map(r => r.id), session.user.id] }
    }

    if (filters.reclutadorId) where.reclutadorId = filters.reclutadorId
    if (filters.tipo) where.tipo = filters.tipo
    if (filters.periodo) where.periodo = filters.periodo
    if (filters.estatus) where.estatus = filters.estatus

    const [metas, total] = await Promise.all([
      db.meta.findMany({
        where,
        include: {
          reclutador: { select: { id: true, name: true, email: true } },
        },
        orderBy: { fechaFin: 'asc' },
        skip,
        take: filters.limit,
      }),
      db.meta.count({ where }),
    ])

    return NextResponse.json({
      metas,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    })
  } catch (error) {
    console.error('Error obteniendo metas:', error)
    return NextResponse.json(
      { error: 'Error al obtener metas', details: String(error) },
      { status: 500 }
    )
  }
}

// POST - Crear meta
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo GERENTE y ADMIN pueden crear metas
    if (session.user.rol === 'RECLUTADOR') {
      return NextResponse.json({ error: 'No tienes permiso para crear metas' }, { status: 403 })
    }

    const body = await request.json()
    const data = MetaCreateSchema.parse(body)

    // Verificar que el reclutador existe y pertenece a la misma empresa
    const reclutador = await db.user.findUnique({
      where: { id: data.reclutadorId },
    })

    if (!reclutador) {
      return NextResponse.json({ error: 'Reclutador no encontrado' }, { status: 404 })
    }

    if (session.user.rol === 'GERENTE' && reclutador.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No puedes asignar metas a este reclutador' }, { status: 403 })
    }

    const meta = await db.meta.create({
      data,
      include: {
        reclutador: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(meta, { status: 201 })
  } catch (error) {
    console.error('Error creando meta:', error)
    return NextResponse.json(
      { error: 'Error al crear meta', details: String(error) },
      { status: 500 }
    )
  }
}
