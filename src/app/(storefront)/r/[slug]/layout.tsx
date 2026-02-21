import { db } from '@/lib/db';
import { restaurants } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getTheme } from '@/lib/themes';
import { StorefrontThemeProvider } from '@/components/storefront/ThemeProvider';
import { StorefrontShell } from '@/components/storefront/StorefrontShell';

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch restaurant from DB
  const [restaurant] = await db.select().from(restaurants)
    .where(eq(restaurants.slug, slug));

  const theme = getTheme(restaurant?.theme);
  const restaurantName = restaurant?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Determine Google Font link if needed
  const fontLinks: Record<string, string> = {
    'Nunito': 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap',
    'Poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
    'Lora': 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap',
    'Roboto Condensed': 'https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;500;600;700&display=swap',
    'Noto Sans JP': 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap',
  };

  const fontUrl = fontLinks[theme.font];

  return (
    <>
      {fontUrl && (
        <link rel="stylesheet" href={fontUrl} />
      )}
      <StorefrontThemeProvider theme={theme}>
        <StorefrontShell slug={slug} restaurantName={restaurantName}>
          {children}
        </StorefrontShell>
      </StorefrontThemeProvider>
    </>
  );
}
