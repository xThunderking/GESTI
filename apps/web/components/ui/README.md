# Patrón de módulos GESTI

Los módulos con listado y formulario comparten el mismo comportamiento responsive:

- En teléfonos y tablets (menos de 1280 px), se muestra **Registros** o **Nuevo/Editar**, nunca ambos a la vez. El botón «Nuevo» y la acción «Editar» abren el formulario; cancelar o guardar vuelve al listado.
- En escritorio se muestran ambos paneles. La tabla es exclusiva de escritorio; `RecordCards` presenta los mismos datos y acciones en tarjetas para móvil y tablet.
- Las búsquedas filtran un único arreglo de registros que alimenta ambas vistas. Los mensajes de éxito se colocan antes de las pestañas con `role="status"` para seguir visibles al volver al listado.

Para agregar otro módulo CRUD, use `useModuleWorkspace()` y `ModuleWorkspaceTabs` de `module-workspace.tsx`. El contenedor debe tener `data-mobile-pane={workspace.pane}` y dos hijos directos, `data-pane="form"` y `data-pane="list"`; las reglas de visibilidad están en `app/globals.css`. Llame a `workspace.showForm()` al crear o editar y a `workspace.showList()` al cancelar o guardar. En el listado, renderice `RecordCards` (`xl:hidden`) y la tabla (`hidden xl:block`) con las mismas acciones. Mantenga `min-w-0` en columnas de grid y contenedores de texto para evitar desbordamiento horizontal.
