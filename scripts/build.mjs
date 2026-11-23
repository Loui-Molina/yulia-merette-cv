import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const DATA_PATH = resolve(rootDir, 'data/cv.json');
const DIST_DIR = resolve(rootDir, 'dist');
const HTML_OUTPUT_PATH = resolve(DIST_DIR, 'index.html');
const PDF_FILENAME = 'Yulia_C_Merette_Hernandez_CV.pdf';
const PDF_OUTPUT_PATH = resolve(DIST_DIR, PDF_FILENAME);

console.log('🚀 Iniciando compilación de CV...');

// 1. Validar y cargar datos
if (!existsSync(DATA_PATH)) {
  console.error(`❌ Error: Archivo de datos no encontrado en ${DATA_PATH}`);
  process.exit(1);
}

const rawData = readFileSync(DATA_PATH, 'utf-8');
const cvData = JSON.parse(rawData);

// Validar campos obligatorios
const requiredFields = ['nombre', 'cargo', 'email', 'resumen', 'experiencia', 'formacion'];
const missingFields = [];

for (const field of requiredFields) {
  if (!cvData[field] || (Array.isArray(cvData[field]) && cvData[field].length === 0)) {
    missingFields.push(field);
  }
}

if (missingFields.length > 0) {
  console.error(`❌ Error: Faltan campos obligatorios en cv.json: ${missingFields.join(', ')}`);
  process.exit(1);
}

console.log('✅ Validación de datos requeridos completada exitosamente.');

// 2. Función para sanitizar / filtrar textos provisionales prohibidos
function isProvisionalText(text) {
  if (!text) return true;
  const lower = String(text).toLowerCase();
  return (
    lower.includes('null') ||
    lower.includes('por confirmar') ||
    lower.includes('por completar') ||
    lower.includes('employment_status') ||
    lower.includes('verification_items')
  );
}

// 3. Generación del HTML semántico y CSS
function generateHTML(data) {
  const {
    nombre,
    cargo,
    resumen,
    contacto = {},
    experiencia = [],
    proyectos = [],
    formacion = [],
    competencias_categorias = [],
    idiomas = [],
    certificaciones = []
  } = data;

  // Filtrar experiencias válidas
  const cleanExperiencia = experiencia.filter(exp => exp.empresa && exp.cargo);
  // Filtrar proyectos válidos
  const cleanProyectos = proyectos.filter(proj => proj.nombre && proj.rol);
  // Filtrar formación válida
  const cleanFormacion = formacion.filter(edu => edu.programa && edu.institucion);
  // Filtrar certificaciones
  const cleanCertificaciones = certificaciones.filter(
    cert => cert.titulo && !isProvisionalText(cert.titulo) && !isProvisionalText(cert.institucion)
  );

  // Favicon SVG en data-URI (monograma YM)
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1f3a5f"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="28" fill="#ffffff" letter-spacing="1">YM</text></svg>`;
  const faviconDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(faviconSvg)}`;

  // Schema.org JSON-LD para perfil Person
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: nombre,
    jobTitle: cargo,
    email: contacto.email || data.email,
    sameAs: [contacto.linkedin].filter(Boolean),
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Santo Domingo',
      addressCountry: 'República Dominicana'
    }
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Currículum Vitae de ${nombre} - ${cargo}">
  <meta name="theme-color" content="#1f3a5f">
  <title>${nombre} | ${cargo}</title>

  <!-- Favicon Monograma Inline -->
  <link rel="icon" type="image/svg+xml" href="${faviconDataUri}">

  <!-- OpenGraph Metadata -->
  <meta property="og:title" content="${nombre} | ${cargo}">
  <meta property="og:description" content="Currículum Vitae de ${nombre} - ${cargo}">
  <meta property="og:type" content="profile">
  <meta property="og:locale" content="es_DO">
  <meta property="og:site_name" content="${nombre} - CV Profesional">

  <!-- Twitter Card Metadata -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${nombre} | ${cargo}">
  <meta name="twitter:description" content="Currículum Vitae de ${nombre} - ${cargo}">

  <!-- Schema.org JSON-LD Structured Data -->
  <script type="application/ld+json">
${JSON.stringify(personSchema, null, 2)}
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* Reset & Base Variables */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :root {
      --color-primary: #1f3a5f;
      --color-primary-light: #2c5282;
      --color-text: #1f2933;
      --color-text-muted: #4b5563;
      --color-border: #cbd5e1;
      --color-bg-light: #f8fafc;
      --color-white: #ffffff;
      --font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    body {
      font-family: var(--font-family);
      color: var(--color-text);
      background-color: #f1f5f9;
      line-height: 1.45;
      font-size: 9.5pt;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Web Action Bar */
    .web-action-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--color-primary);
      color: var(--color-white);
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
    }

    .web-action-bar .brand {
      font-weight: 600;
      font-size: 1rem;
      letter-spacing: 0.02em;
    }

    .btn-download {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background-color: var(--color-white);
      color: var(--color-primary);
      font-size: 0.875rem;
      font-weight: 600;
      padding: 8px 18px;
      border-radius: 6px;
      text-decoration: none;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .btn-download:hover {
      background-color: #f8fafc;
      transform: translateY(-1px);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    /* Document Sheet (A4 Layout) */
    .document-wrapper {
      max-width: 210mm;
      margin: 24px auto;
      background: var(--color-white);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .cv-container {
      width: 100%;
      background: var(--color-white);
      padding: 0;
    }

    /* Header Section (~22% prominence) */
    .cv-header {
      background: var(--color-white);
      border-bottom: 2px solid var(--color-primary);
      padding: 24px 32px 18px 32px;
    }

    .header-top {
      margin-bottom: 8px;
    }

    .candidate-name {
      font-size: 20pt;
      font-weight: 700;
      color: var(--color-primary);
      line-height: 1.15;
      letter-spacing: -0.02em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .candidate-title {
      font-size: 11.5pt;
      font-weight: 600;
      color: var(--color-text-muted);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .header-contact {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 20px;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 8.5pt;
      color: var(--color-text);
    }

    .contact-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .contact-label {
      font-weight: 600;
      color: var(--color-primary);
    }

    .contact-item a {
      color: var(--color-text);
      text-decoration: underline;
      text-decoration-color: var(--color-border);
      text-underline-offset: 2px;
    }

    .contact-item a:hover {
      color: var(--color-primary);
      text-decoration-color: var(--color-primary);
    }

    /* 2 Columns Layout */
    .cv-body {
      display: flex;
      width: 100%;
      padding: 20px 32px 28px 32px;
      gap: 28px;
    }

    /* Main Column (68%) */
    .main-column {
      width: 68%;
      flex: 0 0 68%;
    }

    /* Lateral Column (32%) */
    .side-column {
      width: 32%;
      flex: 0 0 32%;
      border-left: 1px solid #e2e8f0;
      padding-left: 20px;
    }

    /* Section Headings */
    .section-title {
      font-size: 10pt;
      font-weight: 700;
      color: var(--color-primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1.5px solid var(--color-primary);
      padding-bottom: 4px;
      margin-top: 16px;
      margin-bottom: 10px;
    }

    .main-column > .section-title:first-child,
    .side-column > .section-title:first-child {
      margin-top: 0;
    }

    /* Content Blocks */
    .summary-text {
      font-size: 9pt;
      line-height: 1.5;
      color: var(--color-text);
      text-align: justify;
      margin-bottom: 14px;
    }

    .cv-item {
      margin-bottom: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 3px;
    }

    .item-title {
      font-size: 9.5pt;
      font-weight: 700;
      color: var(--color-primary);
      line-height: 1.25;
    }

    .item-company {
      font-size: 9pt;
      font-weight: 600;
      color: var(--color-text);
    }

    .item-url {
      font-size: 8pt;
      color: var(--color-text-muted);
      text-decoration: underline;
      margin-left: 4px;
      font-weight: 400;
    }

    .item-period {
      font-size: 8pt;
      font-weight: 500;
      color: var(--color-text-muted);
      white-space: nowrap;
      text-align: right;
    }

    .bullet-list {
      list-style-type: disc;
      padding-left: 14px;
      margin-top: 3px;
    }

    .bullet-list li {
      font-size: 8.5pt;
      line-height: 1.4;
      color: var(--color-text);
      margin-bottom: 3px;
    }

    .bullet-list li::marker {
      color: var(--color-primary);
      font-size: 0.85em;
    }

    /* Sidebar Components */
    .sidebar-category {
      margin-bottom: 11px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .category-name {
      font-size: 8.5pt;
      font-weight: 700;
      color: var(--color-primary-light);
      margin-bottom: 4px;
      text-transform: capitalize;
    }

    .skill-list {
      list-style-type: disc;
      padding-left: 14px;
    }

    .skill-list li {
      font-size: 8.2pt;
      line-height: 1.35;
      color: var(--color-text);
      margin-bottom: 3px;
    }

    .skill-list li::marker {
      color: var(--color-primary);
      font-size: 0.85em;
    }

    .language-item {
      margin-bottom: 6px;
      font-size: 8.5pt;
      break-inside: avoid;
    }

    .language-name {
      font-weight: 700;
      color: var(--color-text);
    }

    .language-level {
      color: var(--color-text-muted);
      font-size: 8pt;
    }

    .cert-item {
      margin-bottom: 7px;
      font-size: 8.2pt;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .cert-title {
      font-weight: 600;
      color: var(--color-text);
      line-height: 1.25;
    }

    .cert-issuer {
      color: var(--color-text-muted);
      font-size: 7.8pt;
    }

    .education-item {
      margin-bottom: 8px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .edu-degree {
      font-size: 9.2pt;
      font-weight: 700;
      color: var(--color-primary);
    }

    .edu-school {
      font-size: 8.5pt;
      font-weight: 600;
      color: var(--color-text);
    }

    .edu-status {
      font-size: 8pt;
      color: var(--color-text-muted);
      font-style: italic;
    }

    /* Print Specific Rules */
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }

    @media print {
      body {
        background: #ffffff !important;
        font-size: 9pt;
      }

      .web-action-bar {
        display: none !important;
      }

      .document-wrapper {
        margin: 0 !important;
        max-width: none !important;
        box-shadow: none !important;
        width: 100% !important;
      }

      .cv-header {
        padding: 0 0 14px 0 !important;
      }

      .cv-body {
        display: block !important;
        width: 100% !important;
        padding: 14px 0 0 0 !important;
      }

      .cv-body::after {
        content: "";
        display: table;
        clear: both;
      }

      .main-column {
        float: left !important;
        width: 66% !important;
      }

      .side-column {
        float: right !important;
        width: 31% !important;
        padding-left: 16px !important;
        border-left: 1px solid #cbd5e1 !important;
      }

      .page-break-anchor {
        break-before: page !important;
        page-break-before: always !important;
        margin-top: 0 !important;
        padding-top: 2px !important;
      }

      .section-title {
        margin-top: 12px;
        margin-bottom: 8px;
        break-after: avoid !important;
        page-break-after: avoid !important;
      }

      .cv-item, .sidebar-category, .cert-item, .education-item {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      a {
        text-decoration: none !important;
        color: inherit !important;
      }
    }

    /* Responsive preview for small screens */
    @media (max-width: 768px) {
      .cv-body {
        flex-direction: column;
        padding: 16px;
      }
      .main-column, .side-column {
        width: 100%;
        flex: 1 1 100%;
        padding-left: 0;
        border-left: none;
      }
      .side-column {
        border-top: 1px solid #e2e8f0;
        padding-top: 20px;
        margin-top: 20px;
      }
      .cv-header {
        padding: 16px;
      }
      .header-contact {
        flex-direction: column;
        gap: 6px;
      }
    }
  </style>
</head>
<body>
  <!-- Web Top Bar -->
  <header class="web-action-bar" aria-label="Acciones de Currículum">
    <div class="brand">${nombre} &bull; CV Profesional</div>
    <a href="${PDF_FILENAME}" download="${PDF_FILENAME}" class="btn-download" title="Descargar versión PDF optimizada para A4 e impresión">
      Descargar CV en PDF
    </a>
  </header>

  <div class="document-wrapper">
    <article class="cv-container">
      <!-- Encabezado Principal -->
      <header class="cv-header">
        <div class="header-top">
          <h1 class="candidate-name">${nombre}</h1>
          <div class="candidate-title">${cargo}</div>
        </div>
        <div class="header-contact">
          ${contacto.ubicacion ? `<div class="contact-item"><span class="contact-label">Ubicación:</span> ${contacto.ubicacion}</div>` : ''}
          ${contacto.email ? `<div class="contact-item"><span class="contact-label">Email:</span> <a href="mailto:${contacto.email}">${contacto.email}</a></div>` : ''}
          ${contacto.linkedin ? `<div class="contact-item"><span class="contact-label">LinkedIn:</span> <a href="${contacto.linkedin}" target="_blank" rel="noopener noreferrer">${contacto.linkedin_display || contacto.linkedin}</a></div>` : ''}
        </div>
      </header>

      <!-- Cuerpo del CV a 2 Columnas -->
      <div class="cv-body">
        <!-- Columna Principal (68%) -->
        <main class="main-column">
          <!-- Resumen Profesional -->
          <section class="cv-section" aria-labelledby="sec-resumen">
            <h2 id="sec-resumen" class="section-title">Perfil Profesional</h2>
            <p class="summary-text">${resumen}</p>
          </section>

          <!-- Experiencia Laboral -->
          <section class="cv-section" aria-labelledby="sec-experiencia">
            <h2 id="sec-experiencia" class="section-title">Experiencia Laboral</h2>
            ${cleanExperiencia.map(exp => `
              <div class="cv-item">
                <div class="item-header">
                  <div>
                    <span class="item-title">${exp.cargo}</span>
                    <span class="item-company"> &bull; ${exp.empresa}</span>
                    ${exp.url ? `<a href="${exp.url}" target="_blank" rel="noopener noreferrer" class="item-url">${exp.url_display || 'Enlace'}</a>` : ''}
                  </div>
                  ${exp.periodo ? `<span class="item-period">${exp.periodo}</span>` : ''}
                </div>
                ${exp.responsabilidades && exp.responsabilidades.length ? `
                  <ul class="bullet-list">
                    ${exp.responsabilidades.map(resp => `<li>${resp}</li>`).join('')}
                  </ul>
                ` : ''}
              </div>
            `).join('')}
          </section>

          <!-- Proyectos Seleccionados -->
          ${cleanProyectos.length ? `
            <section class="cv-section page-break-anchor" aria-labelledby="sec-proyectos">
              <h2 id="sec-proyectos" class="section-title">Proyectos Seleccionados</h2>
              ${cleanProyectos.map(proj => `
                <div class="cv-item">
                  <div class="item-header">
                    <div>
                      <span class="item-title">${proj.nombre}</span>
                      <span class="item-company"> &bull; ${proj.rol}</span>
                      ${proj.url ? `<a href="${proj.url}" target="_blank" rel="noopener noreferrer" class="item-url">${proj.url_display || 'Enlace'}</a>` : ''}
                    </div>
                  </div>
                  ${proj.contribuciones && proj.contribuciones.length ? `
                    <ul class="bullet-list">
                      ${proj.contribuciones.map(c => `<li>${c}</li>`).join('')}
                    </ul>
                  ` : ''}
                </div>
              `).join('')}
            </section>
          ` : ''}

          <!-- Formación Académica -->
          <section class="cv-section" aria-labelledby="sec-formacion">
            <h2 id="sec-formacion" class="section-title">Formación Académica</h2>
            ${cleanFormacion.map(edu => `
              <div class="education-item">
                <div class="edu-degree">${edu.programa}</div>
                <div class="edu-school">${edu.institucion}</div>
                ${edu.estado ? `<div class="edu-status">${edu.estado}</div>` : ''}
              </div>
            `).join('')}
          </section>
        </main>

        <!-- Columna Lateral (32%) -->
        <aside class="side-column" aria-label="Competencias y Certificaciones">
          <!-- Competencias Agrupadas en 4 Categorías -->
          <section class="cv-section" aria-labelledby="sec-competencias">
            <h2 id="sec-competencias" class="section-title">Competencias</h2>
            ${competencias_categorias.map(cat => `
              <div class="sidebar-category">
                <div class="category-name">${cat.categoria}</div>
                <ul class="skill-list">
                  ${cat.habilidades.map(hab => `<li>${hab}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </section>

          <!-- Idiomas -->
          ${idiomas.length ? `
            <section class="cv-section" aria-labelledby="sec-idiomas">
              <h2 id="sec-idiomas" class="section-title">Idiomas</h2>
              ${idiomas.map(lang => `
                <div class="language-item">
                  <div class="language-name">${lang.idioma}</div>
                  <div class="language-level">${lang.nivel}</div>
                </div>
              `).join('')}
            </section>
          ` : ''}

          <!-- Certificaciones -->
          ${cleanCertificaciones.length ? `
            <section class="cv-section page-break-anchor" aria-labelledby="sec-certificaciones">
              <h2 id="sec-certificaciones" class="section-title">Certificaciones</h2>
              ${cleanCertificaciones.map(cert => `
                <div class="cert-item">
                  <div class="cert-title">${cert.titulo}</div>
                  <div class="cert-issuer">${cert.institucion}</div>
                </div>
              `).join('')}
            </section>
          ` : ''}
        </aside>
      </div>
    </article>
  </div>
</body>
</html>`;
}

// 4. Proceso de construcción
async function build() {
  if (!existsSync(DIST_DIR)) {
    mkdirSync(DIST_DIR, { recursive: true });
  }

  // Generar index.html
  console.log('📝 Generando HTML estático...');
  const htmlContent = generateHTML(cvData);
  writeFileSync(HTML_OUTPUT_PATH, htmlContent, 'utf-8');
  console.log(`✅ Archivo HTML generado en: ${HTML_OUTPUT_PATH}`);

  // Compilar PDF con Playwright Chromium
  console.log('🌐 Levantando Playwright Chromium para renderizar PDF A4...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=medium']
  });

  const page = await browser.newPage();
  
  // Cargar el HTML generado
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  // Emular media print
  await page.emulateMedia({ media: 'print' });

  console.log('🖨️ Generando PDF con parámetros A4 portrait...');
  await page.pdf({
    path: PDF_OUTPUT_PATH,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: {
      top: '10mm',
      right: '12mm',
      bottom: '10mm',
      left: '12mm'
    }
  });

  await browser.close();
  console.log(`✅ Archivo PDF generado en: ${PDF_OUTPUT_PATH}`);

  // 5. Validar archivo PDF (existencia, páginas <= 2, texto seleccionable)
  if (!existsSync(PDF_OUTPUT_PATH)) {
    console.error(`❌ Error crítico: El archivo PDF no se encontró en ${PDF_OUTPUT_PATH}`);
    process.exit(1);
  }

  const pdfBytes = readFileSync(PDF_OUTPUT_PATH);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pageCount = pdfDoc.getPageCount();

  console.log(`📄 Páginas totales en el PDF: ${pageCount}`);

  if (pageCount === 0) {
    console.error('❌ Error: El PDF generado está vacío (0 páginas).');
    process.exit(1);
  }

  if (pageCount > 2) {
    console.error(`❌ Error: El PDF excede el límite máximo de 2 páginas (tiene ${pageCount} páginas).`);
    process.exit(1);
  }

  console.log('✅ Validación de páginas exitosa: cumple con el límite de máximo 2 páginas.');
  console.log('🎉 ¡Compilación completada exitosamente!');
}

build().catch(err => {
  console.error('❌ Error durante la compilación:', err);
  process.exit(1);
});
