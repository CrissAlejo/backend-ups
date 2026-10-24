# Autenticacion JWT

Implementacion del backend de PDA05-JWT, adaptada a las rutas y al wrapper existentes.

- `POST /api/auth/login`: recibe `{ "email": "ana@example.com", "password": "clave-segura" }`.
- Retorna `{ success, data: { token, user: { email, rol } }, message, errors }`.
- JWT firmado con HS256; expira en dos horas. El servidor valida firma, vencimiento e identidad.
- `POST`, `PUT` y `DELETE /api/empleados` requieren `Authorization: Bearer <token>`.
- `GET /api/empleados` permanece publico como en el ejemplo de la guia.
- Sin cabecera Bearer: 401. Token invalido o vencido: 403. Credenciales incorrectas: 401.
- Los DTO Zod rechazan entradas invalidas con 400 y detalles en `errors`.

## Configuracion y primer usuario

En `backend/.env` configura `PORT` y `JWT_SECRET` (minimo 32 caracteres). Se genero un secreto aleatorio local y el archivo esta excluido de Git. `.env.example` es una plantilla: reemplaza su valor si la usas en otro entorno. No existe un secreto predeterminado en el codigo.

Desde PowerShell, dentro de `backend`:

```powershell
$env:USER_PASSWORD = Read-Host 'Contraseña del nuevo usuario' -MaskInput
npm.cmd run user:create -- ana@example.com
Remove-Item Env:USER_PASSWORD
npm.cmd run dev
```

`-MaskInput` requiere PowerShell 7. El comando usa la conexion MongoDB existente, crea un usuario con rol `alumno` y almacena solo el hash bcrypt (costo 12). No hay registro publico ni usuarios creados automaticamente. Las contraseñas admiten de 6 caracteres a 72 bytes UTF-8.

## Probar con PowerShell

```powershell
$password = Read-Host 'Contraseña' -MaskInput
$body = @{ email = 'ana@example.com'; password = $password } | ConvertTo-Json
$session = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/login -ContentType 'application/json' -Body $body
$headers = @{ Authorization = "Bearer $($session.data.token)" }
# Usa $headers con Invoke-RestMethod para POST, PUT y DELETE de empleados.
```

Swagger esta en `/api/docs`: ejecuta el login y pega `data.token` en **Authorize**.

Para el stress test existente, configura `$env:JWT_TOKEN = $session.data.token` antes de ejecutar Artillery. Los resultados anteriores corresponden al backend previo a JWT; no se regeneraron contra la base de datos.

`npm.cmd test` ejecuta pruebas unitarias y HTTP sin MongoDB, incluyendo autenticacion y CRUD.

El frontend queda pendiente: debe consumir el login, enviar el Bearer token y proteger su navegacion a empleados. El rol se incluye como contexto; esta implementacion no agrega reglas de autorizacion por rol.
