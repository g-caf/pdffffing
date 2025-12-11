<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { PDFRenderer } from '../lib/pdfRenderer.js';
  import { detectFormFields, detectFormFieldsFromDocument, transformRect } from '../lib/formFieldDetector.js';
  import { VisualFormDetector } from '../lib/visualFormDetector.js';
  import TextEditor from './TextEditor.svelte';
  import FormFieldOverlay from './FormFieldOverlay.svelte';

  export let pdfData = null;
  export let pdfVersion = 0;

  const dispatch = createEventDispatcher();

  let renderer = new PDFRenderer();
  let pageCount = 0;
  let pages = [];
  let isTextMode = true;
  let fontFamily = 'Helvetica';
  let isBold = false;
  let isItalic = false;
  let textColor = '#000000';
  let textEditors = {};
  let formFieldOverlays = {};
  let isLoading = false;
  let hasFormFields = false;

  let lastLoadedVersion = -1;
  let loadId = 0;

  export function finalizeText() {
    const allItems = [];
    for (let i = 0; i < pageCount; i++) {
      const editor = textEditors[i];
      if (editor) {
        const items = editor.finalizeAll();
        const formattedItems = items.map(item => ({
          text: item.text,
          x: item.x,
          y: item.y,
          pageIndex: i,
          options: {
            fontSize: item.fontSize,
            fontFamily: item.fontFamily,
            color: item.color
          }
        }));
        editor.clearAll();
        allItems.push(...formattedItems);
      }
    }
    return allItems;
  }

  export function getFormFieldValues() {
    const allValues = {};
    for (let i = 0; i < pageCount; i++) {
      const overlay = formFieldOverlays[i];
      if (overlay) {
        const values = overlay.getFieldValues();
        Object.assign(allValues, values);
      }
    }
    return allValues;
  }

  async function detectAndCreateFormFields() {
    if (!pdfData || pages.length === 0) return;

    try {
      console.log('Starting visual form field detection...');
      const allDetectedFields = [];

      // Analyze each page for potential form fields
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const canvas = page.canvas;

        if (!canvas) continue;

        const pdfJsPage = await renderer.getPage(page.pageNum);
        const pageHeight = pdfJsPage.view[3];

        // Detect form fields visually
        const detected = VisualFormDetector.detectFormFields(canvas, pageHeight, renderer.scale);
        const filtered = VisualFormDetector.filterFields(detected);

        console.log(`Page ${page.pageNum}: detected ${filtered.length} potential form fields`);

        allDetectedFields.push({
          pageIndex: i,
          pageNum: page.pageNum,
          fields: filtered
        });
      }

      // Dispatch event to add form fields to PDF
      const totalFields = allDetectedFields.reduce((sum, p) => sum + p.fields.length, 0);

      if (totalFields === 0) {
        alert('No form fields detected. This PDF may not have visual form elements like horizontal lines for text inputs.');
        return;
      }

      console.log(`Auto-creating ${totalFields} form fields...`);
      dispatch('createformfields', { detectedFields: allDetectedFields });
    } catch (error) {
      console.error('Error detecting form fields:', error);
      alert('Failed to detect form fields. Please try again.');
    }
  }

  // Load on mount
  onMount(() => {
    if (pdfData) {
      lastLoadedVersion = pdfVersion;
      loadAndRenderAllPages();
    }
  });

  // Reload when pdfVersion changes (edits, reorders, etc.)
  $: if (pdfData && pdfVersion > 0 && pdfVersion !== lastLoadedVersion && lastLoadedVersion !== -1) {
    lastLoadedVersion = pdfVersion;
    loadAndRenderAllPages();
  }

  async function loadAndRenderAllPages() {
    const myId = ++loadId;
    if (!pdfData) return;

    try {
      isLoading = true;

      const localRenderer = new PDFRenderer();
      const count = await localRenderer.loadPDF(pdfData);

      // If a newer load started, abort this one
      if (myId !== loadId) return;

      renderer = localRenderer;
      pageCount = count;
      const newPages = [];
      textEditors = {};
      formFieldOverlays = {};
      let foundFormFields = false;

      // Try document-level form detection first
      let docLevelFields = [];
      try {
        docLevelFields = await detectFormFieldsFromDocument(renderer.pdfDoc);
        console.log('Document-level fields found:', docLevelFields.length);
      } catch (e) {
        console.log('Document-level detection failed:', e);
      }

      for (let i = 1; i <= pageCount; i++) {
        const canvas = document.createElement('canvas');
        const pdfJsPage = await renderer.getPage(i);
        await renderer.renderPage(i, canvas);
        if (myId !== loadId) return; // aborted mid-way

        const pageHeight = pdfJsPage.view[3]; // PDF page height in points
        const scale = renderer.scale;

        // Try page-level detection
        let rawFields = await detectFormFields(pdfJsPage);
        
        // If no page-level fields, use document-level fields for this page
        if (rawFields.length === 0 && docLevelFields.length > 0) {
          rawFields = docLevelFields.filter(f => f.pageIndex === i - 1);
          console.log(`Using ${rawFields.length} doc-level fields for page ${i}`);
        }
        
        const formFields = rawFields.map(field => ({
          ...field,
          rect: transformRect(field.rect, pageHeight, scale)
        }));

        if (formFields.length > 0) {
          foundFormFields = true;
        }

        newPages.push({
          pageNum: i,
          canvas,
          dataUrl: canvas.toDataURL(),
          width: canvas.width,
          height: canvas.height,
          formFields
        });
      }

      pages = newPages;
      hasFormFields = foundFormFields;
    } catch (error) {
      console.error('Error loading PDF in viewer:', error);
    } finally {
      if (myId === loadId) {
        isLoading = false;
      }
    }
  }
</script>

<div class="viewer">
  {#if pdfData}
    <div class="text-options">
      <div class="option-row">
        <div class="option-group">
          <label>Font:</label>
          <select bind:value={fontFamily}>
            <option value="Helvetica">Helvetica</option>
            <option value="Courier">Courier</option>
            <option value="Times-Roman">Times Roman</option>
          </select>
        </div>

        <div class="option-group">
          <label>Color:</label>
          <input type="color" bind:value={textColor} />
        </div>

        <div class="option-group style-group">
          <button
            class="style-btn"
            class:active={isBold}
            on:click={() => isBold = !isBold}
            type="button"
          >
            B
          </button>
          <button
            class="style-btn italic"
            class:active={isItalic}
            on:click={() => isItalic = !isItalic}
            type="button"
          >
            I
          </button>
        </div>

        {#if !hasFormFields}
          <div class="option-group">
            <button
              class="style-btn create-fields-btn"
              on:click={detectAndCreateFormFields}
              type="button"
              title="Detect and create form fields"
            >
              +F
            </button>
          </div>
        {/if}
      </div>
    </div>

    {#if isLoading}
      <div class="loading">Loading pages...</div>
    {:else}
      <div class="pages-scroll-container">
        {#each pages as page, index (page.pageNum)}
          <div class="page-wrapper">
            <div class="page-label">Page {page.pageNum}{#if page.formFields?.length > 0} ({page.formFields.length} fields){/if}</div>
            <div class="canvas-container">
              <div class="canvas-wrapper" style="width: {page.width}px; height: {page.height}px;">
                <img src={page.dataUrl} alt="Page {page.pageNum}" class="page-image" class:text-mode={isTextMode && !page.formFields?.length} />
                
                {#if page.formFields?.length > 0}
                  <FormFieldOverlay
                    bind:this={formFieldOverlays[index]}
                    fields={page.formFields}
                    pageWidth={page.width}
                    pageHeight={page.height}
                    scale={1.5}
                  />
                {:else if isTextMode}
                  <TextEditor
                    bind:this={textEditors[index]}
                    canvasWidth={page.width}
                    canvasHeight={page.height}
                    {textColor}
                    {fontFamily}
                    {isBold}
                    {isItalic}
                  />
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .viewer {
    border: 2px solid #000;
    background: #fff;
    padding: 20px;
  }

  .loading {
    text-align: center;
    padding: 40px;
    font-size: 16px;
    color: #666;
  }

  .text-options {
    padding: 16px;
    border: 2px solid #000;
    background: #f9f9f9;
    margin-bottom: 20px;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .option-row {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
  }

  .option-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .option-group.style-group {
    gap: 4px;
  }

  .option-group label {
    font-size: 14px;
    color: #000;
  }

  .style-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    border: 2px solid #000;
    background: #fff;
    color: #000;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .style-btn.italic {
    font-style: italic;
    font-weight: normal;
  }

  .style-btn:hover:not(.active) {
    background: #f0f0f0;
  }

  .style-btn.active {
    background: #333;
    color: #fff;
  }

  input[type="text"],
  select {
    padding: 6px 8px;
    border: 2px solid #000;
    font-size: 14px;
    background: #fff;
    color: #000;
    min-width: 100px;
  }

  select {
    cursor: pointer;
    appearance: auto;
  }

  input[type="color"] {
    width: 50px;
    height: 30px;
    border: 2px solid #000;
    cursor: pointer;
  }

  .pages-scroll-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-height: calc(100vh - 280px);
    overflow-y: auto;
    padding: 4px;
  }

  .page-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .page-label {
    font-size: 14px;
    color: #000;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .canvas-container {
    display: flex;
    justify-content: center;
    overflow: visible;
  }

  .canvas-wrapper {
    position: relative;
    display: inline-block;
    max-width: 100%;
  }

  .page-image {
    border: 1px solid #000;
    display: block;
    max-width: 100%;
    height: auto;
    width: auto;
  }

  .page-image.text-mode {
    cursor: crosshair;
  }
</style>
