# 📱 Guía de Responsiveness - FichaMédica Pet

Este documento describe las convenciones y mejores prácticas para implementar diseños responsivos en el frontend.

## 🎯 Principios

1. **Mobile-First**: Comienza con estilos base para móviles, luego agrega breakpoints
2. **Touch-Friendly**: Mínimo 44px de altura en elementos interactivos en móviles
3. **Performance**: Avoid complex layouts en móviles, mantén la complejidad mínima
4. **Accessibility**: Asegura que todo sea usable con teclado y screen readers

## 📏 Breakpoints de Tailwind

```
Mobile:   < 640px  (default, sin prefijo)
sm:       640px+   (tablet pequena)
md:       768px+   (tablet)
lg:       1024px+  (desktop)
xl:       1280px+  (desktop grande)
```

## 🔤 Text Sizes

Usa responsive text sizes para mejorar legibilidad:

```tsx
// Títulos principales
<h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Título</h1>

// Subtítulos
<h2 className="text-lg md:text-xl font-semibold">Subtítulo</h2>

// Texto normal
<p className="text-sm md:text-base">Descripción</p>

// Labels/captions
<span className="text-xs md:text-sm text-gray-500">Label</span>
```

## 📦 Padding & Spacing

```tsx
// Contenedor principal
<div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
  {children}
</div>

// Espaciado entre elementos
<div className="gap-3 md:gap-4 lg:gap-6">
  {items}
</div>

// Padding en tarjetas
<div className="p-3 md:p-4 lg:p-6">
  {content}
</div>
```

## 🎨 Layouts Responsivos

### Grid Flexible

```tsx
// Cards que cambian de columnas
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>

// Dashboard stats (responsive)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
  {stats.map(stat => <StatCard key={stat.id} {...stat} />)}
</div>
```

### Flex Layout

```tsx
// Header responsive
<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
  <div>{left}</div>
  <div>{right}</div>
</div>

// Buttons en fila (wrappean en móvil)
<div className="flex flex-wrap gap-2">
  <Button>Acción 1</Button>
  <Button>Acción 2</Button>
</div>
```

## 📊 Tablas Responsivas

**NO hagas tablas simples que scroll horizontalmente.** En su lugar:

### Opción 1: Tabla en Desktop, Cards en Mobile

```tsx
{/* Desktop Table */}
<div className="hidden md:block overflow-x-auto">
  <table>
    {/* headers y rows */}
  </table>
</div>

{/* Mobile Cards */}
<div className="md:hidden space-y-3">
  {items.map(item => (
    <div className="rounded-lg border p-4 bg-white dark:bg-slate-800">
      <div className="font-medium">{item.name}</div>
      <div className="text-sm text-gray-600">Especie: {item.species}</div>
      <div className="mt-3 flex gap-2">
        <Button>Editar</Button>
        <Button>Eliminar</Button>
      </div>
    </div>
  ))}
</div>
```

### Opción 2: Tabla con Scroll Horizontal (si es necesario)

```tsx
<div className="overflow-x-auto">
  <table className="min-w-full">
    {/* ... */}
  </table>
</div>
```

## 🔍 Formularios Responsivos

```tsx
// Inputs full-width en móvil
<input className="w-full md:max-w-sm" />

// Grids responsive
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Input label="Campo 1" />
  <Input label="Campo 2" />
</div>

// Inputs en fila (si caben)
<div className="flex flex-col sm:flex-row gap-2">
  <Input placeholder="De" className="flex-1" />
  <Input placeholder="Hasta" className="flex-1" />
</div>
```

## 🎯 Componentes Comunes

### Header

```tsx
<header className="flex flex-col sm:flex-row gap-4 sm:gap-8 p-4 md:p-6">
  <h1 className="text-lg md:text-2xl">Título</h1>
  <div className="flex gap-2">{actions}</div>
</header>
```

### Modal

```tsx
<Modal>
  <div className="p-4 md:p-6">
    <h2 className="text-lg md:text-xl mb-4">Título</h2>
    <form className="space-y-4">{form}</form>
  </div>
</Modal>
```

### Navigation

- **Desktop**: Sidebar completo (`hidden md:flex`)
- **Mobile**: Drawer menu (Sheet component)

```tsx
// Sidebar desktop
<aside className="hidden md:flex w-64 flex-col bg-white">
  {/* Navigation */}
</aside>

// Mobile menu
<MobileMenu /> {/* Abre drawer */}
```

## ⚠️ Anti-Patrones

❌ **NO hagas esto:**

```tsx
// ❌ Text muy pequeño en móvil
<p className="text-xs">Texto ilegible en móvil</p>

// ❌ Padding fijo
<div className="p-8">Muy grande en móvil</div>

// ❌ Grids que no se adaptan
<div className="grid grid-cols-5">No funciona en móvil</div>

// ❌ Ancho fijo
<div className="w-96">Overflow en móvil</div>

// ❌ Posición fija sin safe-area
<div className="fixed bottom-0 left-0">Ocultado por notch</div>
```

## ✅ Checklist para Nueva Página

- [ ] Text sizes responsivos (text-xs md:text-sm, etc)
- [ ] Padding responsive (p-4 md:p-6 lg:p-8)
- [ ] Grids/flex adaptan a móviles
- [ ] Botones tienen min 44px height en móvil
- [ ] No hay scrolls horizontales
- [ ] Formularios son full-width en móvil
- [ ] Tablas tienen vista alternativa en móvil
- [ ] Probado en:
  - [ ] iPhone SE (375px)
  - [ ] iPhone 14 (390px)
  - [ ] iPad (768px)
  - [ ] Laptop (1440px)

## 🔧 Componentes Reutilizables

Usamos componentes responsivos pre-hechos:

- `<ResponsiveTable>` - Para tablas adaptables
- `<ResponsiveGrid>` - Para grillas adaptables
- `<MobileMenu>` - Drawer menu en móviles
- `<Sheet>` - Modal lateral (drawer)

## 📱 Testing en Navegador

1. **DevTools**: F12 → Responsive mode (Ctrl+Shift+M)
2. **Móviles comunes**:
   - iPhone SE: 375x667
   - iPhone 14: 390x844
   - Samsung S21: 360x800
   - iPad: 768x1024
3. **Landscape mode**: Girar dispositivo

## 🎨 Dark Mode

Todos los componentes deben soportar dark mode:

```tsx
<div className="bg-gray-50 dark:bg-slate-900">
  <p className="text-gray-900 dark:text-slate-100">Texto</p>
</div>
```

## 📚 Referencias

- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Mobile-First CSS](https://www.mobileresponsivedesign.com/)
- [Touch Target Guidelines](https://www.nngroup.com/articles/touch-target-size/)
