# Actualización arquitectónica de Foliora: Web + Android + Local-First

Quiero actualizar la arquitectura de **Foliora** para que soporte dos clientes independientes:

- **Foliora Web:** React + Vite + TypeScript.
- **Foliora Mobile:** React Native + Expo, inicialmente Android.
- **Backend:** Python + FastAPI.
- **Base de datos principal:** SQLite en el equipo donde se ejecuta el backend.
- **Base de datos local móvil:** SQLite dentro de la aplicación Android.
- **Sin dependencia de Cloud:** Foliora debe estar diseñada principalmente como una aplicación local-first/LAN-first.

## Objetivo principal

La aplicación debe poder funcionar aunque no exista conexión a Internet.

El equipo principal del usuario puede actuar como servidor local de Foliora. Cuando el equipo esté encendido, FastAPI se ejecutará automáticamente como servicio y estará disponible dentro de la red local.

La aplicación Android podrá:

1. Crear documentos sin conexión.
2. Editar documentos sin conexión.
3. Guardar cambios localmente.
4. Consultar documentos localmente.
5. Sincronizar los cambios con el backend cuando vuelva a existir conectividad con el servidor local.
6. Permitir que esos documentos posteriormente sean visibles desde Foliora Web.

La conexión a Internet no debe ser un requisito para utilizar Foliora.

---

# 1. Separación estricta de responsabilidades

Revisar la arquitectura actual y eliminar progresivamente cualquier acoplamiento innecesario entre backend y renderizado de interfaz.

La arquitectura objetivo debe separar:

### Backend

FastAPI debe encargarse principalmente de:

- API.
- Persistencia.
- Reglas de negocio.
- Validación de datos.
- Gestión de documentos.
- Sincronización.
- Resolución de conflictos.
- Generación/exportación de documentos cuando corresponda.
- Operaciones que deban ejecutarse de forma centralizada.

El backend **no debe ser responsable de renderizar la interfaz visual de React**.

### Web

React + Vite debe ser responsable de:

- Renderizado de la interfaz.
- Editor.
- Vista A4.
- Toolbars contextuales.
- Paneles.
- Navegación.
- Interacciones.
- Estado visual.
- Responsive layouts.

Nota: Actualmente la interfaz web esta terminada, no modificar este a menos que sea en terminos de ui ux para mejorar la experiencia.

### Mobile

React Native + Expo debe ser responsable de:

- Interfaz móvil.
- Experiencia táctil.
- Navegación móvil.
- Editor móvil.
- Controles adaptados a dispositivos pequeños.
- Persistencia local.
- Funcionamiento offline.
- Sincronización con FastAPI cuando esté disponible.

---

# 2. Separar el modelo de documento de la interfaz

El modelo de datos de Foliora debe ser independiente de React y React Native.

No debemos diseñar el documento dependiendo de HTML, componentes React o CSS específicos.

Debe existir un modelo de documento compartido conceptualmente entre plataformas.

Ejemplo conceptual:

```text
Document
 ├── id
 ├── type
 ├── title
 ├── metadata
 ├── sections
 ├── content
 ├── theme
 ├── settings
 ├── created_at
 ├── updated_at
 └── revision
```

El mismo modelo debe poder utilizarse desde:

```text
React Web
React Native
FastAPI
SQLite
PDF generator
Synchronization layer
```

La representación visual puede ser completamente diferente entre Web y Mobile.

---

# 3. Arquitectura recomendada

Evaluar y adaptar el proyecto hacia una estructura similar a:

```text
foliora/
├── apps/
│   ├── web/
│   │   ├── React
│   │   ├── Vite
│   │   └── TypeScript
│   │
│   ├── mobile/
│   │   ├── React Native
│   │   ├── Expo
│   │   └── TypeScript
│   │
│   └── backend/
│       ├── FastAPI
│       ├── Python
│       └── SQLite
│
├── packages/
│   ├── document-model/
│   ├── document-logic/
│   ├── validation/
│   └── sync/
│
└── docs/
```

No asumir que esta estructura debe implementarse literalmente.

Primero analizar la estructura actual del proyecto y determinar cómo incorporar estos límites arquitectónicos con el menor impacto posible.

No realizar una reescritura innecesaria.

---

# 4. Arquitectura de datos

Debe existir una diferencia explícita entre:

## SQLite principal

Ubicada en el equipo que ejecuta FastAPI.

```text
FastAPI
   ↓
SQLite principal
```

Esta representa la fuente de datos central dentro de la red local.

## SQLite móvil

La aplicación Android tendrá su propia persistencia local:

```text
React Native
      ↓
SQLite local
```

No copiar toda la base de datos del servidor al teléfono.

La base de datos móvil debe contener únicamente los datos necesarios para utilizar Foliora offline.

---

# 5. Funcionamiento offline

El móvil NO debe requerir una petición HTTP para cada operación.

Ejemplo:

```text
Usuario crea documento
        ↓
SQLite móvil
        ↓
Documento disponible inmediatamente
```

Incluso sin Wi-Fi ni Internet:

```text
Android
  ↓
SQLite local
  ↓
trabajo completamente offline
```

La interfaz debe continuar funcionando normalmente para las operaciones soportadas offline.

---

# 6. Sincronización

Diseñar una capa de sincronización explícita.

Flujo esperado:

```text
                    ┌─────────────┐
                    │   FastAPI   │
                    │   SQLite    │
                    └──────┬──────┘
                           │
                     red local LAN
                           │
                    ┌──────▼──────┐
                    │   Android   │
                    │   SQLite    │
                    └─────────────┘
```

Cuando Android detecte que el backend local está disponible:

```text
Cambios locales
      ↓
cola de sincronización
      ↓
FastAPI
      ↓
SQLite principal
      ↓
confirmación
      ↓
marcar cambios como sincronizados
```

La sincronización debe ser tolerante a desconexiones.

Si la conexión se pierde durante una sincronización, el sistema debe poder continuar posteriormente sin perder cambios.

---

# 7. Metadatos necesarios para sincronización

Evaluar agregar campos como:

```text
document_id
revision
updated_at
device_id
sync_status
last_synced_revision
```

No implementar estos campos únicamente como decoración.

Determinar cuáles son realmente necesarios según la estrategia de sincronización elegida.

También analizar cómo detectar:

- cambios nuevos;
- cambios pendientes;
- documentos eliminados;
- modificaciones concurrentes;
- conflictos.

Para la primera versión puede utilizarse una estrategia sencilla como last-write-wins cuando sea razonable, pero la arquitectura debe permitir mejorar posteriormente el manejo de conflictos.

---

# 8. Servidor local

El backend FastAPI debe poder ejecutarse como servicio en el equipo principal.

Objetivo:

```text
Encender PC
    ↓
iniciar FastAPI automáticamente
    ↓
servidor disponible en LAN
```

El backend no debe quedar limitado únicamente a:

```text
localhost
```

Debe poder aceptar conexiones de dispositivos autorizados dentro de la red local.

Analizar también:

- configuración del host;
- puerto;
- firewall;
- seguridad;
- autenticación;
- descubrimiento del servidor local;
- posibilidad de utilizar un hostname local en lugar de depender exclusivamente de una IP fija.

No exponer innecesariamente el backend a Internet.

---

# 9. Web

Foliora Web debe continuar funcionando correctamente cuando esté conectada al backend local.

Ejemplo:

```text
Browser
   ↓
React
   ↓
FastAPI local
   ↓
SQLite
```

La interfaz web debe poder mostrar los documentos creados desde Android una vez sincronizados.

No asumir que Web y Mobile necesitan compartir exactamente la misma interfaz.

Compartir:

- modelo de datos;
- validaciones;
- lógica de dominio;
- reglas de negocio reutilizables cuando sea viable.

No intentar compartir innecesariamente:

- componentes visuales;
- HTML;
- CSS;
- layouts;
- elementos exclusivos de React DOM.

---

# 10. Renderizado y generación de documentos

Actualmente existen partes donde el backend participa en procesos relacionados con el renderizado del frontend.

Revisar cuidadosamente esta implementación.

Objetivo:

```text
Backend
    └── no renderiza la UI de Foliora
```

Sin embargo, esto NO significa eliminar la generación de documentos.

Debe mantenerse una separación entre:

### Renderizado de interfaz

Responsabilidad de:

```text
React Web
React Native
```

### Renderizado/exportación del documento final

Puede seguir siendo responsabilidad del backend cuando tenga sentido, por ejemplo:

```text
Document Model
      ↓
PDF generation
      ↓
archivo PDF
```

Determinar exactamente qué partes actuales deben mantenerse, mover o desacoplar.

No realizar cambios destructivos sin analizar primero cómo funciona la implementación existente.

---

# 11. Compatibilidad entre plataformas

El objetivo no es crear dos aplicaciones completamente independientes.

Debe existir una arquitectura de producto común:

```text
               Foliora Domain
                    │
          ┌─────────┴─────────┐
          │                   │
       Web Client        Mobile Client
          │                   │
       React              React Native
```

Ambos clientes deben trabajar sobre el mismo concepto de documentos.

---

# 12. Exportación

La exportación a PDF debe funcionar de forma coherente independientemente de si el documento fue creado:

```text
Web
```

o:

```text
Android
```

El documento debe mantener su estructura, contenido, configuración y tema de forma consistente.

Evaluar especialmente cómo se transferirán imágenes, fotografías, firmas y otros recursos asociados al documento durante la sincronización y exportación.

---

# 13. Seguridad

Aunque Foliora no utilizará Cloud, no asumir que la red local es automáticamente segura.

Evaluar:

- autenticación;
- autorización;
- identificación del dispositivo;
- tokens o mecanismo equivalente;
- protección del API;
- restricciones del firewall;
- validación de solicitudes;
- manejo seguro de archivos.

No convertir el servidor local en un endpoint público.

---

# 14. Testing

Mantener la estrategia actual de desarrollo:

1. Escribir primero los tests.
2. Implementar la funcionalidad.
3. Ejecutar tests.
4. Ejecutar linters.
5. Corregir cualquier error.
6. Verificar nuevamente.

Los tests deben ser funcionales.

No limitarse a comprobar:

```text
"el endpoint existe"
"el botón existe"
```

También probar comportamientos reales como:

```text
crear documento offline
guardar documento localmente
editar documento
recuperar documento
sincronizar documento
perder conexión durante sincronización
volver a conectar
recibir cambios del servidor
detectar conflictos
exportar documento
```

Para cada nueva capacidad de sincronización, agregar pruebas específicas de comportamiento.

Mantener:

- **oxlint** para frontend;
- **ruff** para backend.

---

# 15. Restricciones importantes

No convertir este cambio en una reescritura completa de Foliora.

Primero:

1. Analizar la arquitectura actual.
2. Identificar acoplamientos actuales entre frontend y backend.
3. Identificar qué código puede reutilizarse.
4. Identificar qué debe desacoplarse.
5. Proponer una migración incremental.
6. Implementar únicamente los cambios necesarios.

Preservar las funcionalidades existentes.

No eliminar funcionalidades actuales únicamente para simplificar la arquitectura.

---

# Resultado arquitectónico deseado

La arquitectura final debe aproximarse conceptualmente a:

```text
                         FOLIORA
                            │
              ┌─────────────┴─────────────┐
              │                           │
          WEB CLIENT                 MOBILE CLIENT
          React/Vite                React Native/Expo
              │                           │
              │                      SQLite local
              │                           │
              └──────────────┬────────────┘
                             │
                       LAN / local API
                             │
                        ┌────▼────┐
                        │ FastAPI │
                        └────┬────┘
                             │
                         SQLite DB
```

Y cuando Android esté sin conexión:

```text
Android
   ↓
SQLite local
   ↓
Foliora continúa funcionando
```

Cuando vuelva a existir conectividad con el servidor local:

```text
SQLite local
      ↓
Synchronization Layer
      ↓
FastAPI
      ↓
SQLite principal
```

## Instrucción final

Antes de modificar código, analiza el repositorio actual y genera una evaluación arquitectónica de:

- cómo funciona actualmente el renderizado;
- qué partes del backend dependen de la UI web;
- qué partes deben desacoplarse;
- cómo introducir el modelo de documento compartido;
- cómo introducir persistencia local móvil;
- cómo implementar sincronización;
- cómo mantener la compatibilidad con la aplicación web existente.

Después de ese análisis, propone una estrategia de migración incremental por fases.

No rehagas Foliora desde cero.
