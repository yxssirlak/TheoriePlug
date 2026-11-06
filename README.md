This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Km declaratie

1. Apply the Supabase migration `supabase/migrations/20261106170000_create_business_trips.sql` to the project's database. The table is protected by RLS and accessible only to users in `public.admins`.
2. Create an [openrouteservice](https://openrouteservice.org/dev/) API key with access to geocoding and directions. Add `OPENROUTESERVICE_API_KEY=your-key` to `.env.local` and to the server environment in production. Do not use a `NEXT_PUBLIC_` prefix or commit the key. Restart/redeploy after configuring it.
3. Open **Beheer → Km declaratie**, enter full addresses, calculate the route, verify the resolved locations and save the trip. The addresses are sent to openrouteservice; its API limits and terms apply. The CSV export includes all loaded trips and uses semicolons, decimal commas and UTF-8 for Excel.

The route is an estimate based on today's map, not a record of the actual distance driven. Return trips double the outgoing route. Amounts use a fixed €0.23/km rate for 2026 and are rounded to the nearest cent per trip; verify the rate for other years and circumstances. This feature alone is **not** a complete Belastingdienst mileage log: retain additional required information separately, including vehicle details, odometer readings and deviations from the usual route.

Run the mileage calculation, routing mock and CSV tests with `node --test tests/kilometers.test.mjs` (Node.js 22.18 or newer).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
