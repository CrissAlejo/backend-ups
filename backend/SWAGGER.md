# Documentacion interactiva

Desde `backend`, inicia el servidor con `npm run dev` y abre:

- Swagger UI: http://localhost:3000/api/docs/
- Contrato OpenAPI JSON: http://localhost:3000/api/docs.json

La interfaz documenta GET y POST `/api/empleados`, PUT y DELETE
`/api/empleados/{id}`, parametros, ejemplos, codigos HTTP y el wrapper de respuesta.
Usa **Try it out** y **Execute** para enviar peticiones al backend actual.
Estas operaciones usan la base de datos configurada: POST crea, PUT modifica
y DELETE elimina el empleado indicado.

La definicion esta en `src/docs/openapi.ts`. Los esquemas del cuerpo e ID se
generan desde `src/dtos/employee.dto.ts` con Zod; las rutas y respuestas se
describen en el contrato. Si cambias un endpoint, actualiza esa definicion.

Integracion basada en [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express)
y [OpenAPI](https://swagger.io/specification/).
