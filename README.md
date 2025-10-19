# MadrijApp

Aplicación para gestionar kvutzot y janijim sincronizada con Google Sheets. El
flujo completo depende de dos hojas de cálculo mantenidas por el equipo
institucional, por lo que no es necesario que los usuarios creen proyectos ni
configuren hojas manualmente.

## Requisitos previos

1. Node.js 18 o superior.
2. Una instancia de Supabase con el esquema de la carpeta `sql/migrations` ya
   ejecutado.
3. Una cuenta de servicio de Google Cloud con acceso de lectura a las hojas de
   cálculo institucionales.

## Configuración

1. Instalá dependencias y copia el archivo de entorno:

   ```bash
   npm install
   cp .env.example .env.local # si existe
   ```

2. Definí las variables necesarias en `.env.local`:

   | Variable | Descripción |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL de tu instancia de Supabase. |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública de Supabase. |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email de la cuenta de servicio con acceso a las hojas. |
   | `GOOGLE_SERVICE_ACCOUNT_KEY` | Clave privada (PEM o base64) de la cuenta de servicio. |

   No hace falta definir ningún ID de planilla: la aplicación apunta
   directamente a las hojas institucionales oficiales:

   - Madrijim: `https://docs.google.com/spreadsheets/d/1lVMJx9lCH3O-oypWGXWZ9RD4YQVctZlmppV3Igqge64`
   - Janijim: `https://docs.google.com/spreadsheets/d/1u3KFbCBItK5oN5VEl55Kq7tlRxTb3qJ2FSMl9tS0Cjs`

3. Corré las migraciones de Supabase en orden para asegurar que la base esté al
   día:

   ```bash
   supabase db execute --file sql/migrations/20250208_add_sheets_columns_to_grupos.sql
   supabase db execute --file sql/migrations/20250218_adjust_madrij_onboarding.sql
   ```

4. Iniciá el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abrí `http://localhost:3000` para usar la app.

## Estructura de las hojas de cálculo

La aplicación lee automáticamente dos pestañas:

- **Madrijim**: columnas `Nombre`, `Apellido`, `Email`, `Grupo`.
- **Janijim**: columnas `Nombre`, `Apellido`, `Telefono Madre`, `Telefono Padre`, `Grupo`.

Cada fila debe tener el nombre del grupo exactamente como querés que aparezca en
la app. La sincronización normaliza mayúsculas/minúsculas y acentos, pero es
recomendable mantener la ortografía consistente.

## Flujo de onboarding

1. El madrij inicia sesión con la misma cuenta de Google que figura en la hoja
   de madrijim.
2. La app busca su email en la planilla, sincroniza el grupo correspondiente y
   muestra un panel para confirmar su identidad.
3. Al confirmar, se vincula la cuenta de Clerk con el registro del madrij y se
   habilita el acceso al proyecto del grupo. No existe la opción de crear
   proyectos manualmente: todo proviene de la planilla.

Si el email no está en la hoja, el usuario verá un mensaje para contactar al
administrador y actualizar la planilla antes de volver a ingresar.

## Sincronización manual

En la vista de janijim de cada proyecto hay un botón "Sincronizar ahora". Al
presionarlo se reimportan los datos de ambas hojas para el grupo actual. Los
madrijim y janijim que dejan de figurar en la planilla se marcan como inactivos
sin eliminar su historial.

## Desarrollo

- Los proyectos, grupos y miembros se gestionan únicamente desde la planilla.
- La tabla `madrijim_grupos` mantiene los vínculos entre madrijim (por email) y
  grupos; al reclamar el perfil se guarda el `clerk_id` correspondiente.
- Si necesitás depurar la sincronización revisá la respuesta JSON del endpoint
  `POST /api/grupos/:id/sync`.

Con esta configuración el flujo queda completamente automatizado a partir de las
hojas de cálculo institucionales.
