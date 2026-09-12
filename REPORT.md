# Auditoría Completa — Patty Apuntes · Impeccable + UI-UX Pro Max

> **Method:** dual-agent (A: design-review general · B: detector+browser general) + verificación parent con `detect.mjs`, `curl` a servidores live y `rg` estático.
> **Fecha:** 2026-09-12 · **Alcance:** toda la app, todo completo P0-P3 · **Dirección:** Operar eficiente + Accesibilidad AA, mantener identidad `papel/tinta/menta`.
> **Servidores verificados:** frontend `http://localhost:5173` → 200 OK (`<title>Patty Apuntes — Tus números, en orden</title>`, `#root`, Vite dev) · backend `http://localhost:8000/docs` → 200 Swagger · `/api/auth/me` → 401 esperado sin token.
> **Stack:** Vite + React 19 + TS + Router 7 + Zustand + TanStack Query + Tailwind 3.4 + Bun · FastAPI + SQLAlchemy + SQLite.

---

## 1. Scores

### Design Health Score (Nielsen, 10 heurísticas × 4)

| # | Heurística | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibilidad del estado | 2 | `saveAll` solo hace refetch pero se etiqueta "Validar y guardar"; export sin progreso; "Sincronizado" siempre verde con `animate-pulse` (`Inicio.tsx:45`) |
| 2 | Match sistema / mundo real | 3 | Metáfora papel/hoja/tinta sólida; lastra sinonimia archivo = records = revisión = file |
| 3 | Control y libertad | 3 | Undo/redo 50 con labels + preview con Esc; Ctrl+Z muerto dentro de inputs (`Editor.tsx:486`) |
| 4 | Consistencia y estándares | 1 | 3 lenguajes: app temizada vs login violeta fijo vs hoja blanca; `alert()` vs modal; ajustes en 2 casas |
| 5 | Prevención de errores | 1 | Validación tardía (modal "Faltan campos" al guardar/exportar); fila sin empresa permitida al crear |
| 6 | Reconocimiento > memoria | 2 | CompanyPicker con search + undo etiquetado; RowMenu/drag/tema escondidos exigen memoria |
| 7 | Flexibilidad y eficiencia | 2 | Zoom/orientación/drag/densidad; sin atajos de marcado/guardado/export ni bulk-actions |
| 8 | Estética minimalista | 2 | Inicio limpio; Editor sobrecargado (toolbar ~13 controles + hasta 240 checks + panel) |
| 9 | Recuperación de errores | 2 | Mensajes ES con fila+nombre; pero `alert()` en Records, `catch noop` en Settings, sin retry ni jump-to-error |
| 10 | Ayuda y documentación | 1 | Solo tooltips `title` y placeholders; hint "clic derecho colorea" desactualizado; sin guía empresa→fila→mes |
| **Total** | | **19/40** | **Poor (30-47% banda: overhaul focalizado, núcleo rescatable)** |

Media ≈ 1.9/4. El núcleo (hoja contable) es usable; el chrome necesita coherencia.

### Audit Health Score (técnico × 4)

| # | Dimensión | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2 | Targets 28px/16px masivos, trigger RowMenu `w-0 h-0` solo-hover, meses 1 letra, amarillo `#F0E442` ~1.2:1 sobre blanco, `alert()` bloqueante |
| 2 | Performance | 2 | Cero `isLoading/isError` en queries; listas sin paginar/virtualizar; `undo` clona snapshot completo; `style={{zoom}}` no-estándar |
| 3 | Theming | 2 | Sistema de tokens real ×3 temas con `color-mix` + fallback OK; pero `input.tsx`/`card.tsx`/auth hardcodean `slate-200/bg-white/#6366F1/violet-600/#F8FAFC` |
| 4 | Responsive | 1 | `Inicio grid-cols-3` fijo rompe <640px; panel Editor `hidden xl:flex` inexistente en tablet/laptop pequeña; hoja 900px fijos; tablas `min-w-520/600` (mitigado con scroll-x) |
| 5 | Implementation Integrity | 2 | Varias decisiones intencionales (hoja siempre clara, Tol colorblind-safe, ARIA en menús) + drift repetido (3 marcas, settings split, save fantasma) |
| **Total** | | **9/20** | **Poor (6-9: overhaul mayor por dimensiones, no rewrite)** |

### UI-UX Pro Max — 10 prioridades (veredicto por categoría)

| Pri | Categoría | Estado | Falla principal |
|-----|-----------|--------|-----------------|
| 1 | Accessibility (CRÍTICO) | ❌ | Contraste amarillo, targets <44px, labels sin `htmlFor/id`, meses 1 letra, `alert()` |
| 2 | Touch & Interaction (CRÍTICO) | ❌ | Toolbar `w-7 h-7` (28px), checks `w-4 h-4` (16px), RowMenu inaccesible en táctil, drag-handles 9px solo-hover |
| 3 | Performance (ALTO) | ⚠️ | Sin skeletons, sin lazy/virtualización, `zoom` CSS Chromium-only, re-suscripción Ctrl+Z |
| 4 | Style Selection (ALTO) | ⚠️ | Login violeta ≠ sistema; `Inter` ubicuo (detector); `Card/Input` fuera del sistema |
| 5 | Layout & Responsive (ALTO) | ❌ | `grid-cols-3` fijo, panel `<xl` ausente, `100dvh flex-col` auth OK pero tablas con scroll-x forzado |
| 6 | Typography & Color (MEDIO) | ⚠️ | 1 letra por mes colisiona (M/A); `Geist` ofertada sin importar; sinonimia de entidades; hex crudo en componentes |
| 7 | Animation (MEDIO) | ⚠️ | 150-300ms OK parcial; `transition-all duration-300` hoja + `animate-pulse` permanente sin `motion-reduce` (solo 1 sitio en `Layout.tsx:141`) |
| 8 | Forms & Feedback (MEDIO) | ❌ | Errores zod nunca renderizados; `save` sin pending real; `alert()` nativo; swatch duplicado `#EC4899/#ec4899` |
| 9 | Navigation (ALTO) | ⚠️ | 4 items OK (≤5) + icon+label OK; pero `/editor` sin `:id` autocrea basura; tema a 2 clics; fila clicable entera causa misclicks |
| 10 | Charts & Data (BAJO) | ➖ | No hay charts; barras de progreso sin `role=progressbar`/`aria-valuenow` |

---

## 2. Veredictos

### Design Specificity Verdict
**Cromo genérico + núcleo distintivo (60% intercambiable / 40% propio).** Si tapas el Editor, es cualquier SaaS (sidebar 240→68px, cards `surface/border/rounded-xl`, tablas uppercase 11px). Si miras solo la hoja, sí es contable: papel siempre legible sobre chrome temático (`Editor.tsx:757`, vars `--sheet-*` con `color-mix` en `index.css:84-92`), matriz Año×Meses con sellos `P1..Pn` y paleta Tol, lenguaje "marcar/remarcar", temas con voz ("Papel timbrado / Tinta nocturna / Menta clínica"). El login violeta es una tercera marca que no comparte ningún token.

### Deterministic scan (`detect.mjs --json frontend/src`)
**Total 6, todos `warning/slop`, cero `error`.** `overused-font` ×2 (`index.css:1` Google Fonts inter, `:98` font-family Inter) · `ai-color-palette` ×4 (`Login.tsx:34,94`, `Register.tsx:32,89`, `from-violet-600 gradient`). Matices verificados: Inter es solo body (el HTML carga también Fraunces/DM Sans/JetBrains Mono); el violeta está confinado a auth, no es paleta global. El detector **no** captura lo grave (targets, validación tardía, save fantasma) — lo aportó Assessment A y el grep.

### Overall Impression
Lo mejor (hoja + tokens + undo etiquetado + i18n real) convive con lo peor (validación tardía + `alert()` + panel que desaparece + guardado que no guarda). El usuario recordará (peak-end) el modal "Faltan campos" y el `alert()`, no la paleta. Todo es arreglable sin rewrite: unificar marcas, validar al crear, eliminar `alert()`, llevar panel a `lg` + drawer, subir targets, meses a 3 letras.

### What's Working (mantener y replicar)
1. **Hoja contable con identidad:** papel siempre claro + Año×Meses + sellos por persona + undo con etiqueta de acción. Diferenciador real.
2. **Tokens temáticos + i18n + ARIA base:** 3 temas coherentes, `color-mix` con fallback plano correcto, `focus-visible`, ES/EN completo, `menu/menuitemradio`, `aria-pressed`, `aria-sort`, `aria-label` en mayoría de icon-only.
3. **Confirmaciones de borrado:** inline 2 pasos en Companies/Records y modal con nombre en Editor ("Se borrarán sus meses"). Reassurance adecuada — extender ese patrón a guardar/exportar.

---

## 3. Priority Issues (top 5)

### [P0] Acciones fantasma de la fila (RowMenu + empresa vacía)
- **Location:** `Editor.tsx:60-67` (trigger `w-0 h-0 opacity-0 group-hover`), `:803-804` (botón empresa vacío `" "`).
- **Why:** la tarea core (elegir/mover/borrar empresa) es invisible en touch y teclado; clic a ciegas = primera fricción + abandono Jordan/Casey/Sam.
- **Fix:** hit-area 28px siempre visible en `hover/focus-visible`, placeholder "Elegir empresa ▾", menú focuseable con Esc.
- **Suggested command:** `/impeccable harden` (y `/impeccable adapt` para touch).

### [P0] Panel y toolbar desaparecen en <xl
- **Location:** `Editor.tsx:854` (`hidden xl:flex`), toolbar colapsa a `More` sin señal (`:629-743`).
- **Why:** laptops 1280 y tablets se quedan sin Tabla/Diseño (densidad, resumen, columnas, colores) sin aviso. Editor desktop-only de facto no declarado.
- **Fix:** breakpoint a `lg` + drawer accesible (no `display:none`), o declarar modo desktop con mensaje.
- **Suggested command:** `/impeccable adapt`.

### [P1] Guardar miente y exportar asusta
- **Location:** `Editor.tsx:567-584` (`saveAll` = refetch), `:589` filename `revision.pdf`, `Records.tsx:54` (`alert()`), validación tardía `missingCompany()`.
- **Why:** reassurance falsa ("Guardado ✓" sin persistir) + castigo al final + `alert()` rompe tono + filenames colisionan ("¿cuál descargué?").
- **Fix:** empresa obligatoria al crear fila o borrador marcado; autosave honesto ("Revisar y cerrar" en vez de "Guardar"); toasts con progreso; filename `{titulo}-{fecha}.pdf`; eliminar `alert()` → modal/toast con retry.
- **Suggested command:** `/impeccable harden` + `/impeccable clarify`.

### [P1] Meses de 1 letra + targets 16px en matriz de 240
- **Location:** `es.json:107-120` (`E F M A M J J A S O N D`), `Editor.tsx:821` (`w-4 h-4`), toolbar `w-7 h-7` (`:661-684`), Companies/Records `h-7` (`Companies.tsx:40`, `Records.tsx:113-129`).
- **Why:** Marzo/Mayo y Abril/Agosto colisionan; marcar el mes wrong es el error más caro del producto; 28px/16px < 44px WCAG.
- **Fix:** meses a 3 letras (`ENE/FEB`), target ≥24px en comfortable (hitSlop), bulk-actions "marcar fila/año".
- **Suggested command:** `/impeccable layout` + `/impeccable audit`.

### [P2] Settings split-brain + preferencias muertas
- **Location:** `Settings.tsx:45` (swatch duplicado `#EC4899/#ec4899`), `stores/settings.ts` (`grid_columns/date_format/font_size/rounded/pastel` sin UI ni consumo), `Geist` sin importar (`index.css:1` solo Inter), `save/reset .catch(()=>{})` siempre "saved".
- **Why:** el usuario configura cosas que no hacen nada; errores silenciados; dos casas de ajustes (Settings vs panel Editor `:901-992`).
- **Fix:** una sola IA (todo al panel o todo a Settings) + podar o cablear prefs + dirty-check + error real + importar fuentes ofertadas.
- **Suggested command:** `/impeccable distill` + `/impeccable clarify`.

---

## 4. Auditoría por superficie (todo)

### 4.1 Sidebar — `components/Layout.tsx:126-199`, `stores/ui.ts`
Estructura: 4 items (`/` Home, `/editor` FileText, `/companies` Building2, `/records` Files) con icon+label (bien, ≤5, `nav-label-icon` OK) + `ProfileFooter` (Settings, switch 3 temas con dot+✓, LogOut danger). Activo calculado manual por `useLocation` (`startsWith`) con `accent-soft/border/font-medium` + icono `strokeWidth 2` vs 1.7 — correcto pero frágil (no usa `isActive` de RR; ruta desconocida cae a settings). Colapsado `240px→68px` persistido `sb-collapsed`, `transition-all duration-200 motion-reduce:transition-none` (único `motion-reduce` del proyecto), brand `Leaf` en gradiente accent→ink con swap hover a `PanelLeftOpen`; expandido botón `PanelLeftClose` solo `lg:flex`. Popover `role=menu w-240px` con `bottom-full / lg:left-full`, cierra click-fuera + Escape (bien). **Issues:** tema a 2 clics dentro de cuenta (lo más visible, lo más escondido); colapsado oculta labels sin tooltip (memoria); `w-44px h-44px` en colapsado OK pero links expandidos `text-13px` densos; sin badge de estado ni `aria-current` (usa clase, no semántica). **Fix:** `aria-current="page"`, tooltips en colapsado, mover tema a superficie (o atajo), `NavLink isActive`.

### 4.2 Header / MobileBar — `Layout.tsx:201-235`
Sin header desktop (decisión válida, el Editor trae su toolbar). `MobileBar lg:hidden h-52px` (Menu 18px + brand) oculta en `/editor` (dependes del botón interno — en móvil el Editor pierde vía de escape visible). Overlay `bg-black/60` cierra al clic (bien, scrim suficiente). **Fix:** no suprimir MobileBar en Editor o replicar back explícito; CTA principal en zona thumb.

### 4.3 Inicio `/` — `pages/Inicio.tsx`
`max-w-1000`, header + CTA `/editor`, stats `grid-cols-3`, card actividad con fila clicable + barra `h-1.5` + %. Vacío dashed bueno ("Tu papel está en blanco"). **Issues:** `grid-cols-3` fijo aplastado <640px (P1 responsive); queries sin `isLoading/isError` (pantalla vacía = "no hay archivos" aunque falle red); "Sincronizado" pulsante permanente aunque falle fetch (reassurance falsa); progreso sin `role=progressbar`; sin límite/paginación/búsqueda; CTA crea archivo fantasma en Editor. **Fix:** `sm:grid-cols-1`, skeleton + error + retry, `aria-valuenow`, status real derivado de query.

### 4.4 Empresas `/companies` — `pages/Companies.tsx`
`max-w-800`, crear `Input+Button Plus`, tabla `min-w-520` (scroll-x aceptable) `#|Empresa|Creada|Acciones`, edit inline + delete 2 pasos. Vacío OK. **Issues:** sin Enter-crear (inconsistente con Records), `update` permite guardar vacío, `created_at` sin locale, confirm inline desplaza layout sin `alertdialog`/foco/Esc, sin búsqueda/orden/contador, mutaciones sin pending/error/optimistic. **Fix:** `onKeyDown` Enter, trim+validación, `role=alertdialog` + foco + Esc, deshabilitar en pending.

### 4.5 Archivos `/records` — `pages/Records.tsx`
La mejor lista: search + sort (`aria-sort`) + renombre Enter + menú descarga `role=menu/menuitem` + distingue `noResults/noFiles` + CTA. Fila clicable → nav con `stopPropagation` (misclicks). **Issues:** `alert()` nativo en export 422 (P1, bloqueante, fuera de tono e i18n parcial); `inputRef` muerto; crear sin `disabled={isPending}` (doble-click duplica) + `nav` antes de `setTitle`; descarga `a.click()` sin `appendChild` (frágil Safari) ni revoke con delay; filename `archivo-id.pdf` usa id; `select` nativo inconsistente; todo en memoria. **Fix:** modal/toast + retry, `disabled` pending, filename sanitizado del título, botón "Abrir" explícito.

### 4.6 Editor `/editor` — `pages/Editor.tsx` (núcleo, 1021 líneas)
Layout: `flex` central + panel `320px/56px`; toolbar 52px `role=toolbar` (~13 controles mismo peso); canvas `p-6 overflow-auto` + hoja `900/1273 bg-white shadow rounded` con `style={{zoom}}` (**no-estándar, solo Chromium; Firefox ignora**); tabla `table-{density}` con `minWidth` calculado; header 2 filas (N 44 + Empresa 160 + años×12 + assignee/notes); `RowMenu` triángulo 12px, `CompanyPicker` 280px con search, `NumberStepper` sin spinners nativos, `DragHandle` x/y + bloque años con guía accent, `RowTextCell` guarda en blur/Enter; panel tabs tabla (review_type, scale+apply, staff 1-10, personas, paleta Tol, totalMeta, columnas visibles) y diseño (primary Auto/Custom+6, density, show_summary, header_bg); overlays preview `black/60 blur z-50 ring` + modal `validAlert`. Usa `visible_fields/density/show_summary/primary/header_bg/layout` (PUT debounced 500ms) + orientation/zoom; **ignora** `grid_columns/font/size/rounded/pastel` en canvas (hoja siempre `bg-white text-[#1e293b]`, `PERSON_COLORS` fijos). Loading = texto plano; `cells==null` → check disabled; `rows 0` → blank; mutaciones best-effort con rollback solo en toggle/recolor/move; `syncSnapshotToServer` en undo hace recreate+PUT por celda (frágil, IDs divergen); `activePerson` remapea en silencio al bajar staff; `saveAll` = refetch (confuso); `"N rows"` hardcode en inglés. **Efectos:** `transition-all duration-300` hoja, `hover:bg-sheet-soft`, guías accent, checkbox `accent-[var(--sheet-accent)]`, preview `pointer-events-none`. Sin `motion-reduce`. **Fixes:** ver P0/P1 + zoom por `transform: scale` o CSS `zoom` con fallback + aviso, undo agrupado, validación al crear, bulk-mark, atajos (marcar/guardar/exportar/persona), `lg` + drawer para panel.

### 4.7 Ajustes `/settings` — `pages/Settings.tsx`
`max-w-800` card: color (7 swatches + `input color` + hex), `grid-cols-2` fuente/tamaño, idioma, save/reset + "saved" 2s. **Issues:** expone 4 de 10 prefs (resto fantasma); `grid-cols-2` sin responsive; `font_size` number vs select string; 2 fuentes/tamaños; `title={c}` + hex crudo no localizable; `Input color w-12 h-8` inconsistente; `GET/PUT .catch(()=>{})` (siempre "saved"); `reset` solo local. **Fix:** cablear o podar, responsive, validación, dirty-check, error real, persistir reset.

### 4.8 Auth `/login /register` — `pages/Login.tsx Register.tsx`
Layout idéntico `100dvh flex-col lg:flex-row`: editorial `violet-600 via-indigo-600` + dots + blobs `blur-80` + badge + `font-display 44/58` + stats/tags + mock (grid 36 celdas / barra 72%), derecha `bg-[#F8FAFC]` + `bezel max-w-440 p-8`. Forms `hook-form+zod` con `Input h-11 rounded-full` + `Button #6366F1 + ArrowUpRight`, error global rojo. **Issues:** `formState.errors` nunca render (mensajes zod muertos); `schema` recreado por render con `t()`; `label` sin `htmlFor/id`; sin `autocomplete`/`show-password`/recordar/olvidé; preview sin `aria-hidden`; doble `register→login→me` sin 409 específico; 80% duplicado; paleta hardcode fuera del sistema (detector ×4). **Fix:** renderizar errores inline + `aria-live`, `htmlFor/id` + `autocomplete`, show-password, unificar marca con temas, deduplicar componente Auth.

### 4.9 Efectos y motion
Tokens: `transition-all 200` sidebar (con `motion-reduce`), `transition-all 300` hoja, hovers `surface-2/sheet-soft`, `animate-pulse` synced permanente, `backdrop-blur` modales/preview, `blur-80` auth, `shadow-16-40` popover. **Issues:** `transition-all` anima layout (coste), `animate-pulse` sin `motion-reduce` comunica actividad falsa, `exit-faster-than-enter`/stagger/shared-element ausentes, `prefers-reduced-motion` cubierto 1/ N. **Fix:** transiciones a `transform/opacity`, `motion-reduce:` en todo pulso/transición, skeleton en vez de spinner >1s, `150-300ms` micro con tokens unificados.

### 4.10 Layouts y responsive
`h-dvh flex overflow-hidden` + `aside fixed lg:static` + `flex-1 min-w-0` (bien). Breakpoints: `lg` sidebar/mobile, `xl` panel Editor (tardío), `sm` ausente en Inicio/Settings. Anchos: `max-w-1000/800/440`, hoja fija 900/1273, tablas `min-w-520/600` con scroll-x, `min-h-dvh` usado en auth (bien, no `100vh`). Z-index: overlay 30 / aside 40 / picker 30 / preview 50 (escala implícita, sin tokens). Scroll triple anidado en Editor. **Fix:** panel a `lg` + drawer, `sm:` en grids, z-tokens, reserva de espacio anti-CLS, `orientation landscape` verificada.

### 4.11 Theming (detalle)
Tres temas completos (`papel` cálido default `#2B3FE0`, `tinta` oscuro `#C9A227`, `menta` frío `#0E7C5B`) con 15 tokens cada uno + `--sheet-*` con `color-mix` y fallback plano (correcto). `applyCss()` mapea `primary_color/font/size/header-bg/grid-cols/radius/pastel`. **Drift verificado por `rg`:** `card.tsx:2` + `input.tsx:5` (`slate-200/bg-white`, input además `ring-[var(--primary)]` mezclando sistemas), auth ~20 hardcodes (`#F8FAFC/#6366F1/#1E293B/violet-600`), Editor popovers/hoja `bg-white` intencional (papel) pero indistinguible del drift. Contraste: amarillo Tol `#F0E442` sobre blanco inutilizable como `accentColor`; `text-dim` sobre `surface-2` al límite en `papel`. **Fix:** migrar `Card/Input/auth` a vars, par `sheet-ink` garantizado, auditar pares ≥4.5:1 por tema (oscuro independiente), `dark-mode` ya existe vía `tinta` (no invertir colores).

### 4.12 Performance (detalle)
Sin `isLoading/isError/isPending` en **ningún** `useQuery` (solo `data`; único pending es mutación `applyScale` en `Editor.tsx:910`). Sin skeleton/lazy/virtualización (`list.map` completo en Inicio/Records). `history.ts` clona `rows+cells+record` por toggle (límite 50, costoso). `Ctrl+Z` re-suscribe por `[rows,cells,record]`. `zoom` CSS + `DragHandle /zoom` compensado frágil. `saveAll` refetch innecesario. **Fix:** skeletons + `isPending/isError` + retry, virtualizar 50+, agrupar historial, debounce ya existe en layout (extender), `transform: scale` para zoom.

### 4.13 Accesibilidad (detalle)
Base mejor que la media (roles, focus-visible, `aria-pressed/sort/haspopup/expanded`, `aria-label` en icon-only de toolbar/records/layout). **Gaps:** labels auth sin `htmlFor/id` (`Login.tsx:103,107`, `Register.tsx:98-107` verificado); checks 16px; toolbar 28px; meses 1 letra; amarillo 1.2:1; `alert()`; progreso sin rol; `zoom` rompe zoom SO/lector; `RowMenu` 0×0; `select` + `input color` con estilo mínimo/invisible (`opacity-0` sin foco propio); toasts inexistentes (`aria-live` ausente). Contraste y foco por tema sin verificación independiente. **Fix:** P0/P1 + `aria-live` toasts, `progressbar`, foco visible en color input, `htmlFor/id` + `autocomplete`, targets ≥44 (≥24 mínimo denso con hitSlop).

---

## 5. Patrones sistémicos
1. **Tres marcas:** app temizada vs auth violeta vs hoja blanca — unificar auth al sistema (`/impeccable colorize`).
2. **Ajustes en dos casas + prefs fantasma:** Settings vs panel Editor; `grid_columns/date_format/font_size/rounded/pastel` sin efecto — podar o cablear (`/impeccable distill`).
3. **Reassurance falsa:** save/refetch, synced permanente, export sin progreso — estados honestos (`/impeccable harden`).
4. **Validación tardía + `alert()`:** castigo al final + ruptura de tono — validar al crear + modal/toast (`/impeccable harden`, `/impeccable clarify`).
5. **Touch de mentira:** todo diseñado a puntero (hover-handles, 16/28px, drag) — `adapt` real o declarar desktop (`/impeccable adapt`).
6. **Queries sin estado:** `data`-only en 4 superficies — skeletons + error + retry (`/impeccable harden`, `/impeccable optimize`).

## 6. Personas — red flags
- **Alex (power):** sin atajos de marcado/guardado/exportar/persona; Ctrl+Z muerto en inputs; resize solo puntero; sin bulk-mark/reorder por teclado; undo por toggle (ruido). Techo bajo.
- **Jordan (first-timer):** autocreación de archivo en `/editor`; flujo Empresas→Archivos→Editor ambiguo; CompanyPicker lo expulsa de página; validación tardía; copy "clic derecho" falso; tema escondido.
- **Sam (a11y):** trigger 0×0, 16px, amarillo 1.2:1, meses 1 letra, `zoom` no-estándar, `alert()` bloqueante, labels sin `htmlFor`. Lo positivo: ARIA y foco existen — la intención está, falta remate.
- **Casey (móvil):** `grid-cols-3` aplastado, tablas scroll-x, hoja 900px, panel inexistente, drag imposible, MobileBar suprimida en Editor, CTAs fuera de thumb.
- **Riley (stress):** 0/1000 filas sin paginar; `scaleStart>scaleEnd` mudo; staff reducido remapea color en silencio; refresh mid-flow pierde `dirty`; export 422 sin red tragado; filenames colisionan.

## 7. Minor Observations
- `Inicio`/`Companies` sin `isLoading`: vacío falso durante carga.
- Fila entera clicable + botones anidados (`stopPropagation`) → botón "Abrir" explícito.
- Status "Guardado · N filas" truncado en `<lg` justo cuando más se necesita.
- `Input color opacity-0 absolute` sin foco visible propio.
- `Records` descarga sin `appendChild` (Safari) ni revoke con delay.
- `bezel-outer/inner`, `shadow-soft(-lg)`, `font-display` sin definición en `index.css` (clases huérfanas u otro layer).
- `inputRef` muerto en Records; `schema` con `t()` recreado por render en auth.
- Sinonimia: `records.title` + `exportFileBase: revision` + `downloadBase: archivo` + `newDefaultTitle: Nueva revisión`.

## 8. Questions to Consider
1. Si la hoja es "papel" y lo demás "app", ¿por qué el login es una tercera marca violeta? ¿Cuál de las tres muere?
2. ¿Y si crear fila exige empresa (o marca borrador explícito)? ¿Desaparece el 80% de tus modales?
3. ¿Editor de marcado masivo o edición fina? Cobra costo de masiva (240 checks) sin bulk-actions ni atajos. ¿Cuál eliges?
4. ¿`Guardar` guarda? Si todo es autosave, llámalo "Revisar y cerrar". ¿Te atreves a eliminarlo?
5. ¿Editor desktop-only declarado o `adapt` real a tablet? Hoy es lo primero sin decirlo.

## 9. Recommended Actions (P0 → polish)
1. **[P0] `/impeccable harden`:** RowMenu focuseable + empresa obligatoria/borrador + eliminar `alert()` + error/retry + `htmlFor/autocomplete` + `aria-live` toasts.
2. **[P0] `/impeccable adapt`:** panel a `lg` + drawer, `sm:` en Inicio/Settings, targets ≥44 (≥24 denso), hoja sin `zoom` CSS, MobileBar en Editor.
3. **[P1] `/impeccable layout`:** toolbar jerarquizada (1 CTA primario), meses 3 letras, bulk-mark fila/año, tablas con botón Abrir, z-tokens.
4. **[P1] `/impeccable clarify`:** unificar archivo/revisión/records, hint preview real, filenames `{titulo}-{fecha}`, errores con causa+fix.
5. **[P2] `/impeccable colorize` + `typeset`:** auth al sistema, `Card/Input` a vars, importar `Geist`, pares ≥4.5:1 por tema.
6. **[P2] `/impeccable distill`:** podar o cablear `grid_columns/date_format/font_size/rounded/pastel`; una sola casa de ajustes.
7. **[P2] `/impeccable optimize`:** skeletons, `isPending/isError`, virtualizar, agrupar historial, `transform: scale`.
8. Final: **`/impeccable polish`** y re-run `/impeccable audit` para ver subir 9/20 → 14+ y 19/40 → 28+.

> Puedes pedirme ejecutar estos uno por uno, todos a la vez o en el orden que prefieras.

## 10. Evidencia y reproducibilidad
- Detector: `node /home/lizandro/.config/opencode/skills/impeccable/scripts/detect.mjs --json frontend/src` → 6 warnings/slop (2 `overused-font`, 4 `ai-color-palette`), 0 errores.
- Servidores (live, aportados por usuario en reload): `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` → 200 · `http://localhost:8000/docs` → 200 · `/api/auth/me` → 401 esperado.
- Greps verificados: hardcodes (`slate-200/bg-white/#6366F1/#F8FAFC/violet-600`), targets (`w-7 h-7/w-4 h-4/h-7`), `useQuery` sin estado (Inicio ×2, Companies, Records, Editor ×6), `alert(` (Records:54), `zoom:` (Editor:758), `min-w-[520/600]`, `grid-cols-3` (Inicio:34), `motion-reduce` (1 sitio), `<label` sin `htmlFor` (Login/Register).
- Browser omitido: sin herramienta browser nativa (sin Playwright/Puppeteer/MCP) — pendiente screenshots 375/1440px, tab-order, contraste medido, Lighthouse, overlays `detect.js` inyectados. Sin overlay user-visible en esta corrida.
- Trend: primera corrida para este target, sin trend previo.
