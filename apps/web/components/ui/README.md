# Patrón de módulos GESTI

Los módulos con listado y formulario comparten el mismo comportamiento responsive:

- En teléfonos y tablets (menos de 1280 px), se muestra **Registros** o **Nuevo/Editar**, nunca ambos a la vez. El botón «Nuevo» y la acción «Editar» abren el formulario; cancelar o guardar vuelve al listado.
- En escritorio se muestran ambos paneles. La tabla es exclusiva de escritorio; `RecordCards` presenta los mismos datos y acciones en tarjetas para móvil y tablet.
- Las búsquedas filtran un único arreglo de registros que alimenta ambas vistas. Los mensajes de éxito se colocan antes de las pestañas con `role="status"` para seguir visibles al volver al listado.
- La vista prioriza el formulario y los registros: no se agregan tarjetas de métricas o contadores encima del CRUD. En escritorio, los encabezados de tabla permanecen visibles durante el desplazamiento; en móvil y tablet, las tarjetas tienen acciones cómodas al tacto.
- Los campos de formulario usan el ancho disponible sin desbordar sus columnas. En formularios largos, como Equipos de cómputo y Servicios TI, use `module-workspace-wide` en el contenedor: en escritorios medianos el formulario queda encima del listado y en pantallas amplias vuelve a compartir fila con él.

Para agregar otro módulo CRUD, use `useModuleWorkspace()` y `ModuleWorkspaceTabs` de `module-workspace.tsx`. El contenedor debe tener `data-mobile-pane={workspace.pane}` y dos hijos directos, `data-pane="form"` y `data-pane="list"`; las reglas de visibilidad están en `app/globals.css`. Llame a `workspace.showForm()` al crear o editar y a `workspace.showList()` al cancelar o guardar. En el listado, renderice `RecordCards` (`xl:hidden`) y la tabla (`hidden xl:block`) con las mismas acciones. Mantenga `min-w-0` en columnas de grid y contenedores de texto para evitar desbordamiento horizontal.
