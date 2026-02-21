import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { restaurants } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { themes } from '@/lib/themes';

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId || !['super_admin', 'owner', 'admin'].includes(session.user.role!)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { themeKey } = await request.json();

  if (!themeKey || !themes[themeKey]) {
    return NextResponse.json({ error: 'Tema invalido' }, { status: 400 });
  }

  const [restaurant] = await db.select().from(restaurants)
    .where(eq(restaurants.organizationId, session.user.organizationId!));

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
  }

  await db.update(restaurants)
    .set({ theme: themeKey, updatedAt: new Date() })
    .where(eq(restaurants.id, restaurant.id));

  return NextResponse.json({ success: true, theme: themes[themeKey] });
}
