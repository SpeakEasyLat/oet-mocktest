# OET Full Mock Test (mocktest.speakeasy.lat)

Sitio separado del Assessment 360. Solo habla con las funciones `mock-api` / `mock-report`
de Supabase, que usan el esquema `mock` (no toca nada de FULL_360 ni English only).

## Archivos
- `index.html`: la única página (login con `?code=`, Listening, Reading A, Reading B+C, Writing).
- `css/mock.css`, `js/mock.js`.
- `CNAME`: dominio `mocktest.speakeasy.lat`.

## Link para la estudiante
`https://mocktest.speakeasy.lat/?code=OETF-XXXXX`

## Crear una estudiante (Supabase → SQL Editor)
```sql
select * from mock.create_student('Nombre Apellido', 'correo@estudiante.com');
```
Devuelve el código y el link.

## Reenviar un reporte
```sql
update mock.attempts set partial_report_sent_at = null where id = '<attempt_id>';  -- o report_sent_at para el final
```
y volver a llamar a `mock-report` con `{ "attempt_id": "...", "kind": "partial" | "final" }`.
