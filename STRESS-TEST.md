# Fase B: estrés concurrente con Artillery

El escenario `stress-test.yml` usa la ruta real del proyecto, `/api/empleados`,
y el puerto predeterminado 3000. Cada usuario crea un empleado válido, espera
un segundo y envía un empleado inválido (nombre corto y sueldo negativo).
Los empleados válidos permanecen en la base de datos configurada por el backend.

## Ejecución

Si Artillery no está instalado:

```powershell
npm.cmd install -g artillery
```

En una terminal, desde la raíz del proyecto:

```powershell
cd backend
npm.cmd run dev
```

Espera a que aparezcan la conexión a MongoDB y el servidor escuchando en 3000.
En otra terminal, desde la raíz del proyecto:

```powershell
# Verificación con un usuario (también crea un empleado).
artillery.cmd run --environment smoke stress-test.yml

# Carga completa: 20 segundos a 5 usuarios/s y 30 segundos de 15 a 50 usuarios/s.
artillery.cmd run --output stress-results.json stress-test.yml
```

Si estás situado en `backend`, utiliza `../stress-test.yml`.

## Interpretación

- `http.codes.201`: altas válidas; `http.codes.400`: rechazos esperados de Zod.
- `plugins.expect.failed`: incumplimientos de los estados esperados (201 y 400).
- `http.response_time.p99`: debe ser menor de 200 ms; `ensure` falla el proceso si se supera.
- `maxErrorRate: 1`: tolera hasta 1% de usuarios virtuales que no completan el flujo,
  incluidos fallos de transporte o de las aserciones; no es exclusivamente una tasa de sockets.
- `metrics-by-endpoint` separa las latencias de `crear_valido` y `rechazo_dto`.

El p99 global incluye ambos POST. Para estudiar el rechazo perimetral, revisa
también la latencia de `rechazo_dto`. La ausencia de escrituras ante datos inválidos
se verifica en las pruebas unitarias con `repository.create` sin llamadas;
Artillery mide el comportamiento HTTP bajo carga, no las llamadas internas a MongoDB.

Referencias oficiales: [ensure](https://www.artillery.io/docs/reference/extensions/ensure),
[expect](https://www.artillery.io/docs/reference/extensions/expect).

## Resultado observado (17 de octubre de 2026)

Ejecución completa con Artillery 2.0.34 contra `http://localhost:3000`:

| Métrica | Resultado |
| --- | --- |
| Usuarios creados / completados | 1075 / 1075 |
| Usuarios fallidos | 0 (0%) |
| Peticiones HTTP | 2150 |
| Creaciones 201 | 1075 |
| Rechazos 400 | 1075 |
| p99 global | 144 ms |
| p99 de creación válida | 190.6 ms |
| p99 de rechazo DTO | 2 ms |
| SLA de latencia y tasa de fallos | Ambos aprobados |

Informe completo: `stress-results.json`. Estos resultados describen esta ejecución
y dependen del equipo, la red y la base de datos utilizados. La ejecución completa
creó 1075 empleados; las verificaciones previas también crearon registros de prueba.
