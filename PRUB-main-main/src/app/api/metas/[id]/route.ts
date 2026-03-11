import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { MetaUpdateSchema } from '@/lib/validations'
import { deriveMetaStatus } from '@/lib/workflow'

function canAccessMeta(session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>, empresaId?: string | null) {
  return session.user.rol === 'ADMIN' || empresaId === session.user.empresaId
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const meta = await db.meta.findUnique({
      where: { id },
      include: {
        reclutador: { select: { id: true, name: true, email: true, empresaId: true } },
      },
    })

    if (!meta) return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 })
    if (!canAccessMeta(session, meta.reclutador?.empresaId)) {
      return NextResponse.json({ error: 'No tienes acceso a esta meta' }, { status: 403 })
    }
    if (session.user.rol === 'RECLUTADOR' && meta.reclutadorId !== session.user.id) {
      return NextResponse.json({ error: 'No tienes acceso a esta meta' }, { status: 403 })
    }

    return NextResponse.json({ ...meta, estatus: deriveMetaStatus(meta) })
  } catch {
    return NextResponse.json({ error: 'Error al obtener meta' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const parsed = MetaUpdateSchema.parse(body)

    const metaExistente = await db.meta.findUnique({
      where: { id },
      include: { reclutador: { select: { empresaId: true } } },
    })
    if (!metaExistente) return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 })

    if (!canAccessMeta(session, metaExistente.reclutador?.empresaId)) {
      return NextResponse.json({ error: 'No tienes permiso para editar esta meta' }, { status: 403 })
    }

    if (session.user.rol === 'RECLUTADOR' && metaExistente.reclutadorId !== session.user.id) {
      return NextResponse.json({ error: 'No tienes permiso para editar esta meta' }, { status: 403 })
    }

    const safeUpdate = session.user.rol === 'RECLUTADOR'
      ? {
          valorActual: parsed.valorActual,
          notas: parsed.notas,
        }
      : parsed

    const merged = {
      valor: safeUpdate.valor ?? metaExistente.valor,
      valorActual: safeUpdate.valorActual ?? metaExistente.valorActual,
      fechaInicio: safeUpdate.fechaInicio ?? metaExistente.fechaInicio,
      fechaFin: safeUpdate.fechaFin ?? metaExistente.fechaFin,
    }

    const meta = await db.meta.update({
      where: { id },
      data: {
        ...safeUpdate,
        estatus: deriveMetaStatus(merged),
      },
      include: {
        reclutador: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(meta)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar meta' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (session.user.rol === 'RECLUTADOR') {
      return NextResponse.json({ error: 'No tienes permiso para eliminar metas' }, { status: 403 })
    }

    const { id } = await params
    const meta = await db.meta.findUnique({ where: { id }, include: { reclutador: true } })
    if (!meta) return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 })

    if (!canAccessMeta(session, meta.reclutador?.empresaId)) {
      return NextResponse.json({ error: 'No tienes permiso para eliminar esta meta' }, { status: 403 })
    }

    await db.meta.delete({ where: { id } })
    return NextResponse.json({ message: 'Meta eliminada correctamente' })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar meta' }, { status: 500 })
  }
}
