// ATLAS GSE - API de Meta por ID

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { MetaUpdateSchema } from '@/lib/validations'

// GET - Obtener meta por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const meta = await db.meta.findUnique({
      where: { id },
      include: {
        reclutador: { select: { id: true, name: true, email: true } },
      },
    })

    if (!meta) {
      return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 })
    }

    // Verificar permisos
    if (session.user.rol === 'RECLUTADOR' && meta.reclutadorId !== session.user.id) {
      return NextResponse.json({ error: 'No tienes acceso a esta meta' }, { status: 403 })
    }

    return NextResponse.json(meta)
  } catch (error) {
    console.error('Error obteniendo meta:', error)
    return NextResponse.json({ error: 'Error al obtener meta' }, { status: 500 })
  }
}

// PUT - Actualizar meta
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = MetaUpdateSchema.parse(body)

    const metaExistente = await db.meta.findUnique({
      where: { id },
    })

    if (!metaExistente) {
      return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 })
    }

    // Verificar permisos
    if (session.user.rol === 'RECLUTADOR' && metaExistente.reclutadorId !== session.user.id) {
      return NextResponse.json({ error: 'No tienes permiso para editar esta meta' }, { status: 403 })
    }

    const meta = await db.meta.update({
      where: { id },
      data,
      include: {
        reclutador: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(meta)
  } catch (error) {
    console.error('Error actualizando meta:', error)
    return NextResponse.json({ error: 'Error al actualizar meta' }, { status: 500 })
  }
}

// DELETE - Eliminar meta
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (session.user.rol === 'RECLUTADOR') {
      return NextResponse.json({ error: 'No tienes permiso para eliminar metas' }, { status: 403 })
    }

    const { id } = await params

    const meta = await db.meta.findUnique({
      where: { id },
    })

    if (!meta) {
      return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 })
    }

    await db.meta.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Meta eliminada correctamente' })
  } catch (error) {
    console.error('Error eliminando meta:', error)
    return NextResponse.json({ error: 'Error al eliminar meta' }, { status: 500 })
  }
}
