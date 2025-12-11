<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { PDFRenderer } from '../lib/pdfRenderer.js';
  import TextEditor from './TextEditor.svelte';

  export let pdfData = null;

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
  let loadedPdfData = null;
  let isLoading = false;

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

  $: if (pdfData && pdfData !== loadedPdfData && !isLoading) {
    loadAndRenderAllPages();
  }

  async function loadAndRenderAllPages() {
    if (isLoading) return;
    
    try {
      isLoading = true;
      loadedPdfData = pdfData;
      renderer = new PDFRenderer();
      pageCount = await renderer.loadPDF(pdfData);
      pages = [];
      textEditors = {};

      for (let i = 1; i <= pageCount; i++) {
        const canvas = document.createElement('canvas');
        await renderer.renderPage(i, canvas);
        pages.push({
          pageNum: i,
          canvas: canvas,
          dataUrl: canvas.toDataURL(),
          width: canvas.width,
          height: canvas.height
        });
      }
      pages = pages;
    } catch (error) {
      console.error('Error loading PDF:', error);
    } finally {
      isLoading = false;
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
      </div>
    </div>

    <div class="pages-scroll-container">
      {#each pages as page, index (page.pageNum)}
        <div class="page-wrapper">
          <div class="page-label">Page {page.pageNum}</div>
          <div class="canvas-container">
            <div class="canvas-wrapper" style="width: {page.width}px; height: {page.height}px;">
              <img src={page.dataUrl} alt="Page {page.pageNum}" class="page-image" class:text-mode={isTextMode} />
              {#if isTextMode}
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
</div>

<style>
  .viewer {
    border: 2px solid #000;
    background: #fff;
    padding: 20px;
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
