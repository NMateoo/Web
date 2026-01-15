# Proyecto Countdown - Angular + Tailwind CSS

Tu proyecto ha sido migrado exitosamente a **Angular** con **Tailwind CSS**.

## 📋 Descripción

Este es un contador regresivo que muestra el tiempo restante hasta el 14 de febrero de 2026. Una vez llegada la fecha, muestra un mensaje de bienvenida.

## 🚀 Características

- ✅ **Angular v20+** - Framework moderno
- ✅ **Tailwind CSS** - Estilos utilitarios
- ✅ **Componentes Standalone** - Sin NgModules
- ✅ **Signals** - Gestión de estado reactiva
- ✅ **Control de flujo nativo** - `@if`, `@else` sin `*ngIf`
- ✅ **Responsive Design** - Funciona en todos los dispositivos

## 🛠️ Comandos

### Desarrollo
```bash
npm start
# o
ng serve
```
La aplicación estará disponible en `http://localhost:4200/`

### Compilación
```bash
npm run build
# o
ng build
```
Los archivos compilados estarán en `dist/countdown-app/`

### Testing
```bash
ng test
```

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── app.ts          # Componente principal
│   ├── app.html        # Template del componente
│   ├── app.css         # Estilos del componente
│   └── app.config.ts   # Configuración de Angular
├── styles.css          # Estilos globales (Tailwind)
├── main.ts             # Entry point
└── index.html          # Plantilla HTML

tailwind.config.js      # Configuración de Tailwind
postcss.config.js       # Configuración de PostCSS
```

## 🎨 Personalización

### Cambiar la fecha objetivo
Edita [src/app/app.ts](src/app/app.ts) línea 36:
```typescript
const targetDate = new Date('2026-02-14T00:00:00').getTime();
```

### Modificar estilos
- Usa clases de Tailwind CSS en los templates
- Estilos globales: [src/styles.css](src/styles.css)
- Estilos del componente: [src/app/app.css](src/app/app.css)

## 📦 Dependencias principales

- `@angular/core` - Framework Angular
- `@angular/common` - Utilities comunes
- `tailwindcss` - Framework CSS utilitario
- `autoprefixer` - Prefijos CSS automáticos

## 🔧 Configuración Angular

### Componente Standalone
El componente principal usa `standalone: true` (default en Angular v20+)

### Change Detection OnPush
Se usa `ChangeDetectionStrategy.OnPush` para mejor performance

### Signals para Estado
```typescript
private timeRemaining = signal({...});
days = computed(() => this.timeRemaining().days);
```

## 📝 Notas

- El proyecto está configurado con SSR (Server-Side Rendering) habilitado
- Los archivos del servidor están en `src/main.server.ts`
- La app es completamente responsiva con breakpoints `md:`

## 🌐 Deployment

Para producción:
```bash
npm run build
```

Los archivos en `dist/countdown-app/` están listos para deployar.

## 📞 Soporte

Para más información sobre Angular: [angular.dev](https://angular.dev)
Para más información sobre Tailwind: [tailwindcss.com](https://tailwindcss.com)
