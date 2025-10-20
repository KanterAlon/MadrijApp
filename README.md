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

   No hace falta definir ningún ID de planilla: la aplicación consulta siempre
   la planilla institucional única
   `https://docs.google.com/spreadsheets/d/1u3KFbCBItK5oN5VEl55Kq7tlRxTb3qJ2FSMl9tS0Cjs`
   (pestanas `Madrijim` y `Janijim`). No hay overrides por variables de entorno
   ni desde la UI, así que cualquier ajuste se hace directamente en esa hoja
   compartida.

   Asegurate de compartir esa planilla con el correo de la cuenta de servicio
   configurada en `GOOGLE_SERVICE_ACCOUNT_EMAIL` con al menos permisos de
   lectura.

3. Ejecutá la migración de Supabase para habilitar el flujo desde la planilla:

   ```bash
   supabase db execute --file sql/migrations/20250218_adjust_madrij_onboarding.sql
   ```

4. Iniciá el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abrí `http://localhost:3000` para usar la app.

## Estructura de las hojas de cálculo

La aplicación lee automáticamente dos pestanas:

- **Madrijim**: columnas `Nombre`, `Apellido`, `Email`, `Grupo`.
- **Janijim**: columnas `Nombre`, `Apellido`, `Telefono Madre`, `Telefono Padre`, `Grupo`.

Para evitar errores durante la sincronización:

1. Usa exactamente el mismo texto en la columna `Grupo` de ambas pestañas.
2. Cada email en la pestaña de madrijim debe ser único y debe coincidir con la cuenta de Google que usará el madrij.
3. Si falta un dato (por ejemplo un teléfono) dejá la celda vacía, sin guiones ni texto auxiliar.
4. No cambies los nombres de las pestañas: dejá `Madrijim` y `Janijim` tal como están.

Columnas sugeridas:

| Hoja | Columnas obligatorias | Uso |
| --- | --- | --- |
| Madrijim | `Nombre`, `Apellido`, `Email`, `Grupo` | Vincula cada email con un grupo y genera el perfil de acceso. |
| Janijim | `Nombre`, `Apellido`, `Grupo`, `Telefono Madre`, `Telefono Padre` | Construye el padrón del grupo visible en la app. |

Cada fila debe tener el nombre del grupo exactamente como querés que aparezca en
la app. La sincronización normaliza mayúsculas/minúsculas y acentos, pero es
recomendable mantener la ortografía consistente.

## Flujo anual administrado

1. El administrador nacional ingresa a la interfaz `/admin/sync`.
2. Genera una vista previa con los datos actuales de Google Sheets y revisa los
   cambios detectados grupo por grupo.
3. Confirma la importación para aplicar altas, actualizaciones y bajas en
   Supabase. Sólo después de este paso quedan habilitados los proyectos,
   grupos, madrijim y janijim del nuevo ciclo.

Durante el año se puede repetir el proceso cuando la planilla se actualiza; las
ejecuciones anteriores quedan registradas en la tabla `admin_sync_runs` para su
auditoría.

## Flujo de onboarding

1. El madrij, coordinador o director inicia sesión con la cuenta que figura en
   la planilla.
2. La app verifica sus roles y le muestra un panel para confirmar la identidad.
3. Una vez confirmado, sólo obtiene acceso de lectura a los proyectos y grupos
   asignados. Las ediciones siguen dependiendo del administrador.

Si el email no está en la hoja, el usuario verá un mensaje para contactar al
administrador y solicitar la actualización de la planilla antes de volver a
ingresar.

## Sincronización manual

La importación de datos desde Google Sheets es exclusiva del administrador.
Puede ejecutarla desde `/admin/sync`, donde se muestran los cambios detectados
y un resumen del impacto antes de confirmar. En cada proyecto el botón
"Sincronizar ahora" sólo está disponible para el administrador y sirve como
atajo para refrescar un grupo puntual después de revisar la planilla.

## Desarrollo

- Los proyectos, grupos y miembros se gestionan únicamente desde la planilla.
- La tabla `madrijim_grupos` mantiene los vínculos entre madrijim (por email) y
  grupos; al reclamar el perfil se guarda el `clerk_id` correspondiente.
- Si necesitás depurar la sincronización revisá la respuesta JSON del endpoint
  `POST /api/grupos/:id/sync`.

Con esta configuración el flujo queda completamente automatizado a partir de las
hojas de cálculo institucionales.
