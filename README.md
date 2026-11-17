# OET Full Mock Test (mocktest.speakeasy.lat)

Sitio separado del Assessment 360. Solo habla con las funciones `mock-api`, `mock-admin` y `mock-report`
de Supabase, que usan el esquema `mock` (no toca nada de FULL_360 ni English only).

## Mocks disponibles
| test_id | Nombre | Writing |
|---|---|---|
| `OET_FULL_1` | ClearPath OET Full Mock Test 1 | Carta de remisión a psiquiatría (Dr Ben Hinds) |
| `OET_FULL_2` | ClearPath OET Full Mock Test 2 | Medicina, carta de remisión (Alan Fletcher) |

El panel de admin solo muestra los mocks que tienen audios cargados en `mock.audio_tracks`.

## Archivos
- `admin.html`: panel de Diana y Liza (elegir mock, crear estudiante + correo automático, ver avance).
- `index.html`: la página de la estudiante (login con `?code=`, Listening, Reading A, Reading B+C, Writing).
  Carga `js/mock.js?v=5`: al cambiar `mock.js`, subir el número de versión para que el navegador no use la copia vieja.
- `css/mock.css`, `js/mock.js`.
- `CNAME`: dominio `mocktest.speakeasy.lat`.

## Link para la estudiante
`https://mocktest.speakeasy.lat/?code=OETF-XXXXX`

## Crear una estudiante
Lo normal: https://mocktest.speakeasy.lat/admin.html (login de Diana o Liza). Se elige el mock y le llega el correo solo.

Alternativa (Supabase → SQL Editor, sin correo):
```sql
select * from mock.create_student('Nombre Apellido', 'correo@estudiante.com', 'OET_FULL_2');  -- sin el tercer dato usa OET_FULL_1
```
Devuelve el código y el link.

## Listening (cómo funciona el audio)
- Modo "en vivo", como el examen real: los 5 tracks suenan seguidos, una sola vez, sin pausa ni repetición.
- El reloj arranca al empezar la sección; el audio 1 empieza 8 s después (`content.lead_in_seconds = 8`) y entre tracks hay 3 s.
- El navegador precarga cada track unos 8 s antes de que le toque, para que arranque desde el segundo 0.
  Si la estudiante recarga la página a mitad de un track, el audio retoma en el punto donde va el reloj.
- Si el navegador bloquea el audio, aparece el botón "Toca aquí para continuar el audio".
- Al terminar el último track, la sección se entrega sola.

## Audios (bucket `mock-audio` en Supabase Storage)
- Mock 1: en la raíz del bucket (`Track1_PartA_Extract1.mp3` … `Track5_PartC_Extract2.mp3`).
- Mock 2: en la carpeta `OET_FULL_2/`, mismos nombres. Copia local: `CLEARPATH OET MOCK TEST/audio_mock2/`.

Para cambiar un audio: subirlo encima con el mismo nombre y actualizar su duración, más la duración total del Listening
(suma de los 5 tracks + 12 s de pausas + 8 s de inicio + unos segundos de margen):
```sql
update mock.audio_tracks set duration_seconds = 344.29 where test_id = 'OET_FULL_2' and track_no = 1;
update mock.sections set duration_seconds = 1877 where test_id = 'OET_FULL_2' and section = 'listening';
```

## Reenviar un reporte
```sql
update mock.attempts set partial_report_sent_at = null where id = '<attempt_id>';  -- o report_sent_at para el final
```
y volver a llamar a `mock-report` con `{ "attempt_id": "...", "kind": "partial" | "final" }`.

## Fuentes
Contenido, scripts y copias de las funciones del Mock 2: `CLEARPATH OET MOCK TEST/_fuente_mock2/`.
