# TEMAZO

Plataforma privada y local para que un grupo de personas comparta música propia, escuche la de los demás, vote cada tema y descubra cuál es el TEMAZO del grupo.

Funciona 100 % local: base de datos SQLite en un archivo, archivos de audio en el disco y sin servicios externos.

## Requisitos

- **Node.js 24 o superior** (usa el módulo nativo `node:sqlite`).
- **npm** (incluido con Node.js).
- **FFmpeg** (opcional pero recomendado): se usa para calcular la duración y validar el audio. Sin FFmpeg la app funciona igual: la duración se estima y la reproducción no se ve afectada.

## Instalación de Node.js

Desde [nodejs.org](https://nodejs.org) instalá la versión LTS (24+).

Para verificar:

```bash
node --version
npm --version
```

## Instalación de FFmpeg

- **Windows (winget):** `winget install ffmpeg` o descargalo desde la web oficial y agregalo al `PATH`.
- **macOS (Homebrew):** `brew install ffmpeg`
- **Ubuntu/Debian:** `sudo apt install ffmpeg`

Para verificar:

```bash
ffmpeg -version
```

Si no está instalado, TEMAZO muestra un aviso en la pantalla de subida y sigue funcionando.

## Instalación de dependencias

```bash
npm install
```

## Inicio en desarrollo

```bash
npm run dev
```

Abrí la aplicación en:

```
http://localhost:3000
```

La base de datos (`data/temazo.db`), sus tablas, índices y el directorio `uploads/` se crean automáticamente en el primer arranque. No hace falta configurar nada.

## Compilación de producción

```bash
npm run build
npm run start
```

## Estructura de directorios

```
temazo/
│
├── app/                       # Rutas de Next.js (App Router)
│   ├── page.tsx               # Inicio (ingresar, crear/unirse a grupo)
│   ├── login/                 # Página de ingreso
│   ├── groups/                # Mis grupos
│   │   └── [groupId]/         # Canciones, Ranking, Integrantes, Subida
│   ├── ranking/               # Ranking global de grupos (público)
│   │   └── [groupId]/         # Información pública de un grupo
│   ├── resenas/               # Reseñas públicas de la canción destacada
│   └── api/tracks/[trackId]/  # Servido de audio/video (con soporte de rangos)
│       └── play/              # Registro de escuchas
│   └── api/background/        # Banda sonora de fondo (público, sin auth)
│
├── components/                # Componentes de interfaz
├── lib/                       # Acceso a datos, auth, lógica de negocio
│   ├── db.ts                  # Conexión SQLite (node:sqlite)
│   ├── auth.ts                # Sesión por cookie firmada
│   ├── config.ts              # Variables de configuración (background track, etc.)
│   ├── groups.ts / tracks.ts / votes.ts
│   ├── duration.ts            # Duración sin FFmpeg (fallback)
│   └── ffmpeg.ts              # Detección de FFmpeg/ffprobe
├── actions/                   # Server Actions (todas las escrituras)
│   ├── users.ts / groups.ts / tracks.ts / votes.ts / reviews.ts
├── db/migrations.ts           # Esquema y migraciones
├── scripts/seed.ts            # Datos de prueba
├── data/temazo.db             # Base de datos (se crea sola)
├── uploads/                   # Archivos de audio (se crea solo)
│   └── <groupId>/<trackId>.ext
└── ...
```

## Base de datos

SQLite mediante el módulo nativo `node:sqlite` (sin ORM ni librerías externas). El archivo vive en `data/temazo.db`.

Tablas:

- `users` — integrantes (sin contraseñas: identificación por cookie).
- `groups` — grupos con `invite_code` único (formato `TEMAZO-XXXXX`) y `hidden_from_ranking` para excluirlos del ranking global.
- `group_members` — relación usuario↔grupo (UNIQUE por par), con un `name` de pantalla propio del grupo (si es NULL se usa el nombre de la cuenta).
- `tracks` — canciones (metadatos y ruta del archivo, no el audio).
- `votes` — puntuaciones 1 a 10 (UNIQUE por `track_id`+`user_id`).
- `plays` — escuchas: una fila por reproducción real iniciada (con `track_id`+`user_id`).
- `reviews` — reseñas públicas de la canción destacada (sin login: se guarda el nombre que escribe la persona).
- `schema_migrations` — versión del esquema.

El promedio se calcula con `AVG(score)` y los votos con `COUNT(*)`, sin campos cacheados.

## Ranking de grupos

En `/ranking` (público, sin necesidad de login) se muestra la posición de cada grupo. El puntaje es el **promedio de dos componentes en escala 0–10**, cada uno relativo al mejor grupo:

- **Votos** del público: `10 × votos del grupo / votos máximos entre grupos`.
- **Escuchas** públicas: `10 × escuchas del grupo / escuchas máximas entre grupos`.

Una escucha se registra cuando un miembro inicia la reproducción de una canción (evento `play` del reproductor, con un máximo de una por minuto y por canción para evitar recargas).

Al hacer clic en un grupo del ranking se abre su página pública (`/ranking/[groupId]`) con integrantes, canciones, promedios, votos y escuchas. Los grupos marcados con `hidden_from_ranking = 1` (como el grupo de datos de prueba) no aparecen en el ranking.

## Reseñas

En `/resenas` (público, sin login) se destaca la **canción más votada de toda la app** (mismo criterio que el ranking de grupo: promedio desc, votos desc) y cualquier persona puede dejar una reseña con su nombre. Cada reseña guarda nombre y texto (máximo 60 y 500 caracteres); no se requiere cuenta.

## Banda sonora de fondo

Si definís `TEMAZO_BACKGROUND_TRACK_ID` con el ID de un track, TEMAZO reproduce ese audio como banda sonora de fondo en todas las páginas. El audio se sirve por una ruta pública (`/api/background/[trackId]`) sin necesidad de login, pero solo sirve el track configurado.

El usuario puede pausar/reanudar la música con el botón flotante (esquina inferior derecha). La preferencia se guarda en `localStorage` y persiste entre sesiones. La música arranca automáticamente en la primera interacción del usuario (requerido por los navegadores).

En la pantalla de inicio, el logo de TEMAZO vibra suavemente de forma continua como efecto visual.

## Almacenamiento de audio

Los archivos se guardan fuera de SQLite, en `uploads/<groupId>/<trackId>.<ext>`, con nombres internos generados por el servidor (nunca el nombre original del usuario). Cada subida valida en el servidor: extensión, MIME, tamaño y firma de los primeros bytes.

Formatos permitidos: **audio MP3, WAV, OGG, M4A** (hasta **50 MB**) y **video MP4, WEBM, MOV** (hasta **70 MB**). El reproductor elige `<audio>` o `<video>` según el tipo del archivo. Ambos tamaños son configurables.

## Variables de entorno

Opcionales. Creá un archivo `.env` a partir de `.env.example` si querés cambiarlas:

| Variable                   | Descripción                                             | Por defecto |
| -------------------------- | ------------------------------------------------------- | ----------- |
| `TEMAZO_MAX_UPLOAD_MB`     | Tamaño máximo de subida de audio en MB                  | `50`        |
| `TEMAZO_MAX_VIDEO_MB`      | Tamaño máximo de subida de video en MB                  | `70`        |
| `TEMAZO_UPLOAD_DIR`        | Directorio de archivos de audio/video                   | `uploads`   |
| `TEMAZO_SESSION_SECRET`    | Clave para firmar la cookie de sesión                    | aleatoria   |
| `TEMAZO_COOKIE_SECURE`     | Marcar la cookie como `Secure` (`true` solo si servís por HTTPS) | `false` |
| `TEMAZO_BACKGROUND_TRACK_ID` | ID del track que suena como banda sonora de fondo     | sin fondo   |

> Si no definís `TEMAZO_SESSION_SECRET`, se genera una clave aleatoria en cada arranque y las sesiones se invalidan al reiniciar el servidor. Para una clave fija: `openssl rand -hex 32`.

## Migraciones

Las migraciones viven en `db/migrations.ts` y se aplican automáticamente al arrancar. Cada migración tiene un número de versión registrado en `schema_migrations`. Para agregar una nueva, sumá un objeto con `version: <n+1>` al array `migrations`. Nunca se borran datos existentes.

## Datos de prueba

```bash
npm run seed
```

Crea usuarios (Nicolás, Pedro, Juan, María), un grupo "Los del viernes" con código de invitación, cuatro canciones ficticias (WAV generados, sin copyright) y votos. Es re-ejecutable sin romper nada.

## Seguridad

- Toda escritura pasa por Server Actions; la identidad siempre se resuelve en el servidor (nunca se confía en IDs enviados por el navegador).
- Consultas SQL parametrizadas (sin concatenación).
- Una canción solo se sirve a miembros del grupo.
- Un usuario no puede votar dos veces la misma canción (el voto se actualiza al volver a votar).
- Solo el administrador puede eliminar canciones ajenas, quitar integrantes, regenerar el código o eliminar el grupo.
- En la pestaña Integrantes, el administrador agrega integrantes escribiendo su nombre (se crea o vincula la cuenta) y puede renombrar a cualquiera; cada integrante puede renombrarse a sí mismo. El nombre mostrado es por grupo e independiente de la cuenta de login de cada persona.

## Scripts de npm

| Script     | Descripción                              |
| ---------- | ---------------------------------------- |
| `npm run dev`    | Desarrollo en `http://localhost:3000` |
| `npm run build`  | Compilación de producción                 |
| `npm run start`  | Servidor de producción                    |
| `npm run lint`   | ESLint                                    |
| `npm run seed`   | Cargar datos de prueba                    |
