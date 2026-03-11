// ATLAS GSE - API de Tareas

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const TareaCreateSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  prioridad: z.string().optional(),
  estatus: z.string().optional(),
  fechaLimite: z.string().transform(v => v ? new Date(v) : undefined).optional(),
  entidad: z.string().optional(),
  entidadId: z.string().optional(),
  asignadoAId: z.string().optional(),
})

// GET - Listar tareas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const estatus = searchParams.get('estatus')
    const asignadoAId = searchParams.get('asignadoAId')

    const where: any = {}
    if (estatus) where.estatus = estatus
    if (asignadoAId) where.asignadoAId = asignadoAId

    const tareas = await db.tarea.findMany({
      where,
      include: {
        asignadoA: { select: { id: true, name: true, email: true } },
        creadoPor: { select: { id: true, name: true, email: true } },
      },
      orderBy: [
        { prioridad: 'desc' },
        { fechaLimite: 'asc' },
      ],
      take: 100,
    })

    return NextResponse.json({ tareas })
  } catch (error) {
    console.error('Error al obtener tareas:', error)
    return NextResponse.json({ error: 'Error al obtener tareas' }, { status: 500 })
  }
}

// POST - Crear tarea
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const data = TareaCreateSchema.parse(body)

    const tarea = await db.tarea.create({
      data: {
        ...data,
        creadoPorId: session.user.id,
      },
      include: {
        asignadoA: { select: { id: true, name: true, email: true } },
        creadoPor: { select: { id: true, name: true, email: true } },
      },
    })

    // Crear notificación si hay asignado
    if (data.asignadoAId) {
      await db.notificacion.create({
        data: {
          usuarioId: data.asignadoAId,
          titulo: 'Nueva tarea asignada',
          mensaje: data.titulo,
          tipo: 'info',
          entidad: 'tarea',
          entidadId: tarea.id,
        },
      })
    }

    return NextResponse.json(tarea, { status: 201 })
  } catch (error) {
    console.error('Error al crear tarea:', error)
    return NextResponse.json({ error: 'Error al crear tarea' }, { status: 500 })
  }
}

// PUT - Actualizar tarea
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { id, ...data } = body

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    // Si se marca como completada, registrar fecha
    if (data.estatus === 'COMPLETADA' && !data.completedAt) {
      data.completedAt = new Date()
    }

    const tarea = await db.tarea.update({
      where: { id },
      data,
      include: {
        asignadoA: { select: { id: true, name: true, email: true } },
        creadoPor: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(tarea)
  } catch (error) {
    console.error('Error al actualizar tarea:', error)
    return NextResponse.json({ error: 'Error al actualizar tarea' }, { status: 500 })
  }
}

// DELETE - Eliminar tarea
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    await db.tarea.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar tarea:', error)
    return NextResponse.json({ error: 'Error al eliminar tarea' }, { status: 500 })
  }
}
