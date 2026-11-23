# Currículum Vitae — Yulia C. Merette Hernandez

Sitio web estático profesional y pipeline de generación de PDF en formato A4 optimizado para sistemas de seguimiento de candidatos (ATS) y lectores humanos.

## 📌 Características Principales

- **Diseño A4 compatible con ATS:**
  - Tipografía clara (`Inter` de Google Fonts).
  - Paleta de colores sobria: fondo blanco (`#ffffff`), texto gris oscuro (`#1f2933`) y azul marino institucional (`#1f3a5f`).
  - Estructura en 2 columnas: 68% principal (Perfil, Experiencia, Proyectos, Formación) y 32% lateral (Competencias agrupadas en 4 categorías, Idiomas, Certificaciones).
  - Sin íconos SVG/FontAwesome que puedan romper lectores automáticos de ATS; enlaces en texto plano legible.
  - Saltos de página inteligentes con `break-inside: avoid` respetando el límite estricto de máximo 2 páginas.
- **Vista Web Responsiva:**
  - Barra de acciones superior fija (oculta al imprimir) con botón de descarga directa del PDF.
  - Diseño adaptable para dispositivos móviles y pantallas de escritorio.
- **Generación Automatizada de PDF:**
  - Renderizado fiel vía Playwright Chromium con `printBackground: true` y márgenes `@page` exactos (10mm superior/inferior, 12mm laterales).
- **Despliegue Continuo (CI/CD):**
  - Flujo automatizado en GitHub Actions (`.github/workflows/deploy.yml`) para compilar y desplegar en GitHub Pages en cada `push` a `main`.

---

## 📁 Estructura del Repositorio

```text
.
├── .github/
│   └── workflows/
│       └── deploy.yml           # Flujo de GitHub Actions para GitHub Pages
├── data/
│   └── cv.json                  # Datos centralizados y normalizados del CV
├── dist/                        # Salida generada por npm run build
│   ├── index.html               # Vista web estática
│   └── Yulia_C_Merette_Hernandez_CV.pdf # PDF A4 generado
├── scripts/
│   └── build.mjs                # Script de validación, compilación HTML y PDF
├── .gitignore                   # Exclusión de temporales, build y dependencias
├── package.json                 # Configuración de dependencias y scripts
├── README.md                    # Documentación del proyecto
└── Yulia_C_Merette_Hernandez_CV_Actualizado.json # Fuente de verdad original
```

---

## 🛠️ Instalación y Uso Local

### 1. Prerrequisitos
- **Node.js**: versión 18 o superior.
- **NPM**: versión 9 o superior.

### 2. Instalar dependencias
```bash
npm install
```

### 3. Instalar el navegador Chromium de Playwright
```bash
npx playwright install chromium
```
*(En entornos Linux/CI usar `npx playwright install --with-deps chromium`)*

### 4. Compilar el sitio y generar el PDF
```bash
npm run build
```

El script ejecutará las siguientes fases:
1. Valida la presencia de campos obligatorios (`nombre`, `cargo`, `email`, `resumen`, `experiencia`, `formacion`).
2. Genera `dist/index.html`.
3. Levanta Playwright Chromium, renderiza la vista de impresión y compila `dist/Yulia_C_Merette_Hernandez_CV.pdf`.
4. Verifica que el PDF exista, contenga texto y no exceda 2 páginas.

### 5. Previsualizar la web localmente
```bash
npm run preview
```
Abre tu navegador en `http://localhost:3000`.

---

## 🚀 Despliegue en GitHub Pages

El repositorio incluye un workflow listo para GitHub Pages en `.github/workflows/deploy.yml`:
1. Sube el repositorio a GitHub:
   ```bash
   git remote add origin https://github.com/<TU_USUARIO>/<TU_REPOSITORIO>.git
   git push -u origin main
   ```
2. En la configuración de tu repositorio en GitHub:
   - Ve a **Settings > Pages**.
   - En **Build and deployment > Source**, selecciona **GitHub Actions**.
3. En cada `push` a la rama `main`, el workflow compilará los artefactos y desplegará automáticamente `./dist`.

---

## 📄 Licencia
Este proyecto está bajo licencia MIT.
