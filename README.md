This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Deployment

### Vercel

Push the repository to [Vercel](https://vercel.com) and select **Next.js** as the framework. All scripts and configuration are ready to go. The build will run `npm run build` and start the server automatically.

### Render

Create a new **Web Service** on [Render](https://render.com) using this repository. Set the build command to `npm run build` and the start command to `npm run start`. Make sure the required environment variables are configured in the dashboard.

## Database

Run the SQL scripts under `sql/migrations` on your Supabase instance to keep the schema up to date. The file `20240411_add_activo_to_janijim.sql` adds a column used for soft deleting janijim.

## Environment Variables

The application requires the following variables to be defined, usually in a
`.env.local` file:

- `NEXT_PUBLIC_SUPABASE_URL` – URL of your Supabase instance.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – public anon key provided by Supabase.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` – email of the Google Cloud service account with access to the spreadsheet.
- `GOOGLE_SERVICE_ACCOUNT_KEY` – private key for the service account. You can paste the PEM value directly or provide it base64 encoded.



##CONFIGS PARA EL COLE

set NODE_TLS_REJECT_UNAUTHORIZED=0
git config --global user.name "KanterAlon"
git config --global user.email "kanter.alon@gmail.com"
