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

Run the SQL scripts under `sql/migrations` on your Supabase instance to keep the schema up to date. Each file is idempotent, so you can execute them in order (for example `20250208_add_sheets_columns_to_grupos.sql` and `20250218_adjust_madrij_onboarding.sql`) to ensure the schema supports the Google Sheets onboarding flow.

## Sincronización con Google Sheets

La aplicación espera que la información viva en una única hoja de cálculo de Google con dos pestañas principales:

- **Janijim** (lectura obligatoria). Debe incluir, como mínimo, las columnas `Nombre y Apellido`, `DNI`, `Número socio`, `Grupo`, `Tel Madre` y `Tel Padre`. Los encabezados son flexibles, pero se recomienda usar esos nombres para facilitar el mapeo automático.
- **Madrijim** (lectura obligatoria). Debe contener `Nombre`, `Email`, `Rol` y cualquier dato adicional que quieras sincronizar. El email es el dato clave para vincular la cuenta de Google del madrij.

Para vincular la hoja con la aplicación:

1. Creá o identificá el registro del grupo en la tabla `grupos` de Supabase.
2. Completá los campos `spreadsheet_id`, `janij_sheet` y `madrij_sheet` con el ID del documento y el nombre exacto de cada pestaña.
3. Ejecutá el endpoint `POST /api/grupos/{id}/sync` (o utilizá el botón “Sincronizar ahora” en la UI) para importar janijim y madrijim desde la hoja. La sincronización crea o actualiza las filas y marca los madrijim que aún no iniciaron sesión para que puedan reclamarse luego.

## Onboarding de madrijim

Cuando un madrij inicia sesión con Google por primera vez, la aplicación busca su email en la pestaña de madrijim. Si encuentra una coincidencia sin reclamar, le solicitará confirmación para vincular su cuenta y lo asociará automáticamente al proyecto correspondiente. Si el email no está en la hoja, el usuario verá un aviso para que el equipo actualice la planilla antes de volver a intentar.

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
