This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Gebruikersbeheer

Apply `supabase/migrations/20261108040000_admin_user_management.sql`, `supabase/migrations/20261108050000_admin_student_packages.sql` and `supabase/migrations/20261108060000_delete_student_accounts.sql` in that order after the existing migrations. Set `SUPABASE_SERVICE_ROLE_KEY` on the server and `NEXT_PUBLIC_SITE_URL` to the canonical public application URL. Add the exact `<site URL>/uitnodiging` to the Supabase Auth redirect allowlist and ensure the invitation email template uses the standard `{{ .ConfirmationURL }}` link. The standard Supabase invitation link redirects with `#type=invite` and access/refresh tokens; the activation page exchanges them for a cookie-backed session before the invitee sets a password. Email delivery and Supabase's invitation rate limits must be configured for the project. Restart or redeploy after changing environment variables.

Administrators select an active package and expiry when inviting a user: START (7 days), BOOST (14 days), or MAX (31 days). The invitation template can display its uppercase name with `{{ .Data.pakket }}`; the same package and expiry are assigned to the invited account. The suggested expiry can be changed. The authenticated, same-origin admin endpoint `POST /api/admin/gebruikers` accepts `{ "email": "leerling@example.com", "pakket": "START" }` and optionally `firstName`, `lastName`, and an ISO 8601 `expiresAt`; without an expiry, it uses the durations above. Each package name must correspond to exactly one active database package. The migration adjusts database package durations without changing existing access or inactive status. Checkout retains its separate MAX duration of 30 days. Invitees choose their own password; no password is exposed to administrators. Administrators can also edit profile names and add or change individual package access records. Choosing **Actief / betaald** grants access but does not create an order, charge or payment; other active access records remain valid. Existing statuses can be changed to revoke that record's access. Admin roles and email addresses are not managed here.

Administrators can permanently delete a student account after confirmation. The Supabase Auth account, profile, access, progress, orders and that student's mutation history are deleted; this cannot be undone. Check financial record-retention obligations before deleting orders. Admin accounts and the current account cannot be deleted here. Other database or storage references can prevent deletion; the operation reports failures rather than removing data in separate partial steps.

The mutation log records successful changes made through users management, including the administrator, target, time and previous/new values. It does not record checkout, user self-service or changes elsewhere. Profile/access changes and their audit entry are saved in one database transaction. Email delivery and database changes cannot be atomic: if an invitation is sent but saving the profile and package fails or its result is unknown, the interface reports that the account and access must be checked manually. Logs are visible only to administrators.

Run the validation tests with `node --test tests/admin-users.test.mjs tests/invitation-session.test.mjs tests/delete-student.test.mjs` (Node.js 22.18 or newer).

## Km declaratie

1. Apply the Supabase migration `supabase/migrations/20261106170000_create_business_trips.sql` to the project's database. The table is protected by RLS and accessible only to users in `public.admins`.
2. Create an [openrouteservice](https://openrouteservice.org/dev/) API key with access to geocoding and directions. Add `OPENROUTESERVICE_API_KEY=your-key` to `.env.local` and to the server environment in production. Do not use a `NEXT_PUBLIC_` prefix or commit the key. Restart/redeploy after configuring it.
3. Open **Beheer → Km declaratie**, enter full addresses, calculate the route, verify the resolved locations and save the trip. The addresses are sent to openrouteservice; its API limits and terms apply. The CSV export includes all loaded trips and uses semicolons, decimal commas and UTF-8 for Excel.

The route is an estimate based on today's map, not a record of the actual distance driven. Return trips double the outgoing route. Amounts use a fixed €0.23/km rate for 2026 and are rounded to the nearest cent per trip; verify the rate for other years and circumstances. This feature alone is **not** a complete Belastingdienst mileage log: retain additional required information separately, including vehicle details, odometer readings and deviations from the usual route.

Run the mileage calculation, routing mock and CSV tests with `node --test tests/kilometers.test.mjs` (Node.js 22.18 or newer).

## Flashcards

Apply `supabase/migrations/20261107000000_flashcard_system.sql` after the existing migrations. Existing flashcards are retained and grouped by their previous category (or **Overig**). In **Beheer → Flashcards**, create or edit subjects, optionally link a video lesson, and publish cards for learners. Lesson links only open published lessons available to the learner. Uploaded images use the existing public `course-media` bucket.

Apply `supabase/migrations/20261107010000_reset_flashcard_category.sql` to enable restarting completed subjects.

Apply `supabase/migrations/20261107020000_bulk_delete_flashcards.sql` for bulk deletion. In the card overview, select individual or all visible cards and confirm deletion; selections remain active when filtering, and deletion also removes the selected cards' learner progress. Upload an image by dragging it into the editor or choosing a file, then save the card. Removing an image from a card does not delete the file from the public storage bucket.

Learners with an active package can practise published cards under **Flashcards**, either across all subjects or in one chosen subject. A subject is marked complete when every currently published card has a saved mastery assessment; empty subjects are not marked complete. Completed subjects are excluded from **Alle kaarten**. New published cards reopen a subject. Selecting a completed subject and choosing **Opnieuw oefenen** clears that learner's saved assessments for the subject, including unpublished cards, and makes it available again. Session counters count assessments, including repetitions; when a subject is completed during an all-cards session, previously mastered cards from it are credited and removed from the remaining queue. A linked lesson that is unavailable displays a warning in the video course. Deleting a card also deletes its saved learner progress; a subject containing cards cannot be deleted.

Run the session queue tests with `node --test tests/flashcards.test.mjs` (Node.js 22.18 or newer).

## Cheat sheet boek

Apply `supabase/migrations/20261107220000_cheat_sheet_pages.sql`, `supabase/migrations/20261108020000_cheat_sheet_chapter_number.sql` and `supabase/migrations/20261108030000_cheat_sheet_rows.sql` after the existing migrations. In **Beheer → Cheat sheet**, set the chapter number, name, subtitle, page order and colours. Add rows and choose one to three columns independently for each row. Drag text, images, highlighted notes or interactive answer cards onto the page, or add them using the plus buttons. Rearrange blocks by dragging their handle or using the arrow buttons; reducing a row's columns moves its blocks into the remaining columns. Deleting a row moves its blocks into the first remaining row. Upload JPG, PNG, WebP or GIF images up to 10 MB, add an accessible description, and save and publish the page. Use **Bekijk als leerling** to preview unsaved changes. Existing legacy cheat sheet items remain visible to learners, but their separate editor has been removed.

Published pages are available to authenticated learners with an active package; administrators can also see drafts. Images use a separate private bucket and temporary signed links, with database and storage policies enforcing access. Signed links remain usable until they expire, and anyone who can view content can still copy it or make screenshots: this is not copy protection. Deleting a page or replacing an image does not remove previously uploaded files from storage.

Run the ordering tests with `node --test tests/cheat-sheet.test.mjs` (Node.js 22.18 or newer).

## Getting Started

The admin and learner routes use page-specific `loading.tsx` fallbacks for navigation and shared skeletons in `src/components/ui/PageSkeleton.tsx` while client-side data loads. Keep skeletons aligned with the corresponding page layout when changing a page. Navigation links use Next.js prefetching and show a small pending indicator if a transition has to wait; authentication and database access checks remain unchanged. Skeleton animation respects the reduced-motion preference.
Run `node --test tests/page-skeleton.test.mjs` to check portal fallback coverage and key skeleton layouts.

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
