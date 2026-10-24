# Retos 1 y 2

Express depende de `IEmployeeRepository` (dominio), no de Mongoose. El adaptador
`MongooseEmployeeRepository` traduce documentos a entidades simples. `index.ts`
es el punto de composicion: conecta MongoDB e inyecta el adaptador en `createApp`.
Las pruebas inyectan un repositorio en memoria sin importar ni conectar Mongoose.

Los DTO de Zod validan cuerpo y parametros antes de invocar persistencia.
Nombre: 3 a 120 caracteres; cargo y departamento: 1 a 120; sueldo: numero
finito mayor o igual a cero. Se rechazan campos desconocidos. PUT reemplaza
los cuatro campos editables; los campos de identificacion y fechas no son editables.

| Metodo | Ruta | Respuesta |
| --- | --- | --- |
| GET | /api/empleados | 200, arreglo en data |
| POST | /api/empleados | 201, empleado creado en data |
| PUT | /api/empleados/:id | 200, empleado actualizado en data |
| DELETE | /api/empleados/:id | 200, data null |

Todas las respuestas usan `{ success, data, message, errors }`. Validacion y JSON
invalido devuelven 400; identificador valido sin empleado y rutas desconocidas,
404; errores inesperados, 500 con un mensaje publico generico. Express 5 propaga
rechazos asincronos al middleware global.

El frontend existente debe leer `response.data` en vez de un arreglo directo,
y usar `response.message` en vez de `response.status`. PUT y DELETE requieren
el ID en la URL. Esta carpeta no contiene el proyecto Angular: los retos 3 y 4
requieren integrar estos contratos en ese proyecto.

Ejecutar `npm run typecheck` y `npm test` desde backend. Las pruebas HTTP verifican
CRUD, DTO, ausencia de escrituras invalidas, 404 y errores sin detalles internos.
No acceden a la base de datos real.

Referencias: [validacion con Zod](https://zod.dev/basics) y
[errores asincronos en Express 5](https://expressjs.com/en/5x/guide/error-handling/).
