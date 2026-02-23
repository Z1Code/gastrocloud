import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";
import { db } from "@/lib/db";
import { restaurants } from "@/db/schema";
import { eq } from "drizzle-orm";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [restaurant] = await db
    .select({ logoUrl: restaurants.logoUrl, name: restaurants.name })
    .from(restaurants)
    .where(eq(restaurants.organizationId, session.user.organizationId));

  if (!restaurant) {
    return NextResponse.json({ logoUrl: null, name: "" });
  }

  return NextResponse.json({ logoUrl: restaurant.logoUrl, name: restaurant.name });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No se envió archivo" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "El archivo excede el límite de 5MB" },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const result = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `gastrocloud/${session.user.organizationId}/brand`,
            transformation: [
              { width: 400, height: 400, crop: "pad", background: "transparent" },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error || !result) reject(error);
            else resolve({ secure_url: result.secure_url, public_id: result.public_id });
          },
        )
        .end(buffer);
    },
  );

  await db
    .update(restaurants)
    .set({ logoUrl: result.secure_url, updatedAt: new Date() })
    .where(eq(restaurants.organizationId, session.user.organizationId));

  return NextResponse.json(result);
}
