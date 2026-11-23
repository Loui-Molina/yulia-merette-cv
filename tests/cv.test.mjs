import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const DATA_PATH = resolve(rootDir, 'data/cv.json');
const DIST_DIR = resolve(rootDir, 'dist');
const HTML_PATH = resolve(DIST_DIR, 'index.html');
const PDF_PATH = resolve(DIST_DIR, 'Yulia_C_Merette_Hernandez_CV.pdf');

// Prohibited provisional or placeholder tokens
const PROHIBITED_TEXTS = [
  'null',
  'Por confirmar',
  'employment_status',
  'verification_items'
];

describe('CV Automated Test Suite', () => {
  let cvData;
  let rawHtml;
  let browser;
  let page;
  let pdfBytes;
  let pdfDoc;
  let pdfParsedText;

  before(async () => {
    // 1. Verify and read cv.json
    assert.ok(existsSync(DATA_PATH), `cv.json must exist at ${DATA_PATH}`);
    cvData = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));

    // 2. Verify and read generated dist/index.html
    assert.ok(existsSync(HTML_PATH), `dist/index.html must exist at ${HTML_PATH}`);
    rawHtml = readFileSync(HTML_PATH, 'utf-8');

    // 3. Verify and read generated dist/Yulia_C_Merette_Hernandez_CV.pdf
    assert.ok(existsSync(PDF_PATH), `PDF must exist at ${PDF_PATH}`);
    pdfBytes = readFileSync(PDF_PATH);
    pdfDoc = await PDFDocument.load(pdfBytes);

    // 4. Extract selectable text from PDF using PDFParse
    const parser = new PDFParse({ data: pdfBytes });
    await parser.load();
    const parsedResult = await parser.getText();
    pdfParsedText = parsedResult.text;
    await parser.destroy();

    // 5. Launch Playwright headless browser for DOM evaluation
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    await page.goto(`file://${HTML_PATH}`);
    await page.waitForLoadState('domcontentloaded');
  });

  after(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe('1. Semantic HTML Landmarks & Structure (dist/index.html)', () => {
    test('dist/index.html exists and is not empty', () => {
      assert.ok(existsSync(HTML_PATH));
      assert.ok(rawHtml.length > 500, 'HTML content should be substantial');
    });

    test('contains correct semantic HTML landmarks (<header>, <main>, <aside>, <section>, <h1>, <h2>)', async () => {
      // <header> landmark
      const headerCount = await page.locator('header').count();
      assert.ok(headerCount >= 1, `Expected at least 1 <header>, found ${headerCount}`);

      // <main> landmark
      const mainCount = await page.locator('main').count();
      assert.equal(mainCount, 1, `Expected exactly 1 <main>, found ${mainCount}`);

      // <aside> landmark
      const asideCount = await page.locator('aside').count();
      assert.equal(asideCount, 1, `Expected exactly 1 <aside>, found ${asideCount}`);

      // <section> elements
      const sectionCount = await page.locator('section').count();
      assert.ok(sectionCount >= 5, `Expected at least 5 <section> elements, found ${sectionCount}`);

      // <h1> candidate title
      const h1Count = await page.locator('h1').count();
      assert.equal(h1Count, 1, `Expected exactly 1 <h1> for primary heading, found ${h1Count}`);
      const h1Text = (await page.locator('h1').textContent()).trim();
      assert.equal(h1Text, cvData.nombre);

      // <h2> section headings
      const h2Count = await page.locator('h2').count();
      assert.ok(h2Count >= 4, `Expected at least 4 <h2> headings, found ${h2Count}`);
    });

    test('download button exists and links to Yulia_C_Merette_Hernandez_CV.pdf with download attribute', async () => {
      const downloadBtn = page.locator('a[download]');
      const count = await downloadBtn.count();
      assert.ok(count >= 1, 'Download button with [download] attribute must exist');

      const href = await downloadBtn.first().getAttribute('href');
      assert.ok(
        href === 'Yulia_C_Merette_Hernandez_CV.pdf' || href.endsWith('/Yulia_C_Merette_Hernandez_CV.pdf'),
        `Download link href should point to Yulia_C_Merette_Hernandez_CV.pdf, got: ${href}`
      );

      const downloadAttr = await downloadBtn.first().getAttribute('download');
      assert.ok(downloadAttr !== null, 'Download attribute must be present');
    });
  });

  describe('2. Critical CV Data Rendering (from data/cv.json into dist/index.html)', () => {
    test('renders candidate name, cargo, email, and linkedin link', async () => {
      const bodyText = await page.locator('body').innerText();
      const bodyTextContent = await page.locator('body').textContent();

      // Candidate name
      assert.ok(bodyText.includes(cvData.nombre), `Expected body to include candidate name: ${cvData.nombre}`);

      // Candidate cargo (both DOM textContent and visually rendered)
      const cargoLocator = page.locator('.candidate-title');
      assert.equal((await cargoLocator.textContent()).trim(), cvData.cargo);
      assert.ok(
        bodyTextContent.includes(cvData.cargo),
        `Expected body textContent to include cargo: ${cvData.cargo}`
      );

      // Candidate email
      assert.ok(bodyText.includes(cvData.email), `Expected body to include email: ${cvData.email}`);
      const emailLink = page.locator(`a[href="mailto:${cvData.email}"]`);
      assert.ok((await emailLink.count()) >= 1, `Expected mailto link for ${cvData.email}`);

      // LinkedIn link
      const linkedinHref = cvData.contacto.linkedin;
      const linkedinLink = page.locator(`a[href="${linkedinHref}"]`);
      assert.ok((await linkedinLink.count()) >= 1, `Expected linkedin link for ${linkedinHref}`);
      assert.ok(bodyText.includes(cvData.contacto.linkedin_display), 'Expected linkedin display text');
    });

    test('renders resumen profesional accurately', async () => {
      const bodyText = await page.locator('body').innerText();
      assert.ok(
        bodyText.includes(cvData.resumen),
        'Expected entire professional summary to be rendered in the document'
      );
    });

    test('renders all 5 work experiences with company, role, and responsibilities', async () => {
      assert.equal(cvData.experiencia.length, 5, 'cv.json must contain exactly 5 experiences');

      const bodyText = await page.locator('body').innerText();

      for (const exp of cvData.experiencia) {
        assert.ok(bodyText.includes(exp.empresa), `Experience company "${exp.empresa}" must be rendered`);
        assert.ok(bodyText.includes(exp.cargo), `Experience cargo "${exp.cargo}" must be rendered`);
        if (exp.periodo) {
          assert.ok(bodyText.includes(exp.periodo), `Experience period "${exp.periodo}" must be rendered`);
        }
        for (const resp of exp.responsabilidades) {
          assert.ok(bodyText.includes(resp), `Responsibility "${resp.slice(0, 30)}..." must be rendered`);
        }
      }
    });

    test('renders all 3 projects with title, role, and contributions', async () => {
      assert.equal(cvData.proyectos.length, 3, 'cv.json must contain exactly 3 projects');

      const bodyText = await page.locator('body').innerText();

      for (const proj of cvData.proyectos) {
        assert.ok(bodyText.includes(proj.nombre), `Project "${proj.nombre}" must be rendered`);
        assert.ok(bodyText.includes(proj.rol), `Project role "${proj.rol}" must be rendered`);
        for (const cont of proj.contribuciones) {
          assert.ok(bodyText.includes(cont), `Contribution "${cont.slice(0, 30)}..." must be rendered`);
        }
      }
    });

    test('renders academic education (formacion)', async () => {
      const bodyText = await page.locator('body').innerText();

      for (const edu of cvData.formacion) {
        assert.ok(bodyText.includes(edu.programa), `Education program "${edu.programa}" must be rendered`);
        assert.ok(bodyText.includes(edu.institucion), `Education institution "${edu.institucion}" must be rendered`);
        if (edu.estado) {
          assert.ok(bodyText.includes(edu.estado), `Education status "${edu.estado}" must be rendered`);
        }
      }
    });

    test('renders all 4 competency categories and their skills', async () => {
      assert.equal(cvData.competencias_categorias.length, 4, 'cv.json must have 4 competency categories');

      const bodyText = await page.locator('body').innerText();
      const bodyTextContent = await page.locator('body').textContent();

      for (const cat of cvData.competencias_categorias) {
        assert.ok(
          bodyTextContent.includes(cat.categoria),
          `Competency category "${cat.categoria}" must be rendered in body textContent`
        );
        for (const hab of cat.habilidades) {
          assert.ok(bodyText.includes(hab), `Skill "${hab}" must be rendered`);
        }
      }
    });

    test('renders all 2 languages and proficiency levels', async () => {
      assert.equal(cvData.idiomas.length, 2, 'cv.json must have 2 languages');

      const bodyText = await page.locator('body').innerText();

      for (const lang of cvData.idiomas) {
        assert.ok(bodyText.includes(lang.idioma), `Language "${lang.idioma}" must be rendered`);
        assert.ok(bodyText.includes(lang.nivel), `Language level "${lang.nivel}" must be rendered`);
      }
    });

    test('renders all 6 certifications with title and institution', async () => {
      assert.equal(cvData.certificaciones.length, 6, 'cv.json must have 6 certifications');

      const bodyText = await page.locator('body').innerText();

      for (const cert of cvData.certificaciones) {
        assert.ok(bodyText.includes(cert.titulo), `Certification "${cert.titulo}" must be rendered`);
        assert.ok(bodyText.includes(cert.institucion), `Issuer "${cert.institucion}" must be rendered`);
      }
    });
  });

  describe('3. PDF Document Quality & Integrity (pdf-lib and text extraction)', () => {
    test('dist/Yulia_C_Merette_Hernandez_CV.pdf is a valid PDF document', () => {
      assert.ok(existsSync(PDF_PATH));
      assert.ok(pdfBytes.length > 1000, 'PDF byte length must be valid');
      assert.ok(pdfDoc instanceof PDFDocument, 'PDFDocument must load successfully');
    });

    test('PDF has exactly 2 pages and standard A4 dimensions', () => {
      const pageCount = pdfDoc.getPageCount();
      assert.equal(pageCount, 2, `PDF must have exactly 2 pages, found ${pageCount}`);

      // Standard A4 dimensions in points: 595.28 x 841.89 (allowing 1% tolerance)
      const EXPECTED_WIDTH_PT = 595.28;
      const EXPECTED_HEIGHT_PT = 841.89;
      const TOLERANCE_PT = 2.0;

      const pages = pdfDoc.getPages();
      pages.forEach((p, idx) => {
        const { width, height } = p.getSize();
        assert.ok(
          Math.abs(width - EXPECTED_WIDTH_PT) <= TOLERANCE_PT,
          `Page ${idx + 1} width ${width}pt should match A4 standard (~595.28pt)`
        );
        assert.ok(
          Math.abs(height - EXPECTED_HEIGHT_PT) <= TOLERANCE_PT,
          `Page ${idx + 1} height ${height}pt should match A4 standard (~841.89pt)`
        );
      });
    });

    test('PDF contains selectable text with candidate name, email, and experience', () => {
      assert.ok(pdfParsedText && pdfParsedText.length > 500, 'Extracted PDF text must be non-empty');

      const lowerText = pdfParsedText.toLowerCase();

      // Candidate name
      assert.ok(
        lowerText.includes(cvData.nombre.toLowerCase()),
        `Extracted PDF text must include candidate name "${cvData.nombre}"`
      );

      // Email
      assert.ok(
        lowerText.includes(cvData.email.toLowerCase()),
        `Extracted PDF text must include candidate email "${cvData.email}"`
      );

      // Experience companies & roles
      assert.ok(
        lowerText.includes('thryv'),
        'Extracted PDF text must include experience company "Thryv"'
      );
      assert.ok(
        lowerText.includes('senior client care advocate'),
        'Extracted PDF text must include role "Senior Client Care Advocate"'
      );
      assert.ok(
        lowerText.includes('visora media'),
        'Extracted PDF text must include experience company "VISORA Media"'
      );
      assert.ok(
        lowerText.includes('guardian protection products'),
        'Extracted PDF text must include company "Guardian Protection Products"'
      );
    });
  });

  describe('4. Negative Assertion: Prohibited Provisional Text Absence', () => {
    for (const prohibited of PROHIBITED_TEXTS) {
      test(`prohibited term "${prohibited}" does not appear in HTML`, () => {
        const lowerHtml = rawHtml.toLowerCase();
        assert.ok(
          !lowerHtml.includes(prohibited.toLowerCase()),
          `Prohibited term "${prohibited}" was unexpectedly found in dist/index.html`
        );
      });

      test(`prohibited term "${prohibited}" does not appear in extracted PDF text`, () => {
        const lowerPdf = pdfParsedText.toLowerCase();
        assert.ok(
          !lowerPdf.includes(prohibited.toLowerCase()),
          `Prohibited term "${prohibited}" was unexpectedly found in extracted PDF text`
        );
      });
    }
  });
});
