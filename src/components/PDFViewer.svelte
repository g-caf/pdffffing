<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { PDFRenderer } from '../lib/pdfRenderer.js';
  import TextEditor from './TextEditor.svelte';

  export let pdfData = null;
  export let currentPage = 1;

  const dispatch = createEventDispatcher();
  let canvas;
  let renderer = new PDFRenderer();
  let pageCount = 0;
  let isTextMode = true;
  let textToAdd = '';
  let notification = '';
  let showNotification = false;
  let fontFamily = 'Helvetica';
  let isBold = false;
  let isItalic = false;
  let textColor = '#000000';
  let textEditor;
  let canvasContainer;

  export function finalizeText() {
    if (textEditor) {
      const items = textEditor.finalizeAll();
      items.forEach(item => {
        dispatch('addtext', {
          text: item.text,
          x: item.x,
          y: item.y,
          pageIndex: currentPage - 1,
          options: {
            fontSize: item.fontSize,
            fontFamily: item.fontFamily,
            color: item.color
          }
        });
      });
      textEditor.clearAll();
      return items.length;
    }
    return 0;
  }

  $: if (pdfData && canvas) {
    loadAndRenderPDF();
  }

  $: if (canvas && pdfData && currentPage) {
    renderCurrentPage();
  }

  async function loadAndRenderPDF() {
    try {
      pageCount = await renderer.loadPDF(pdfData);
      await renderCurrentPage();
    } catch (error) {
      console.error('Error loading PDF:', error);
    }
  }

  async function renderCurrentPage() {
    if (canvas && renderer.pdfDoc) {
      await renderer.renderPage(currentPage, canvas);
    }
  }

  function handleCanvasClick(event) {
    if (isTextMode && textEditor) {
      const rect = canvasContainer.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      textEditor.createTextItem(x, y);
    }
  }

  function nextPage() {
    if (currentPage < pageCount) {
      currentPage++;
    }
  }

  function prevPage() {
    if (currentPage > 1) {
      currentPage--;
    }
  }
</script>

<div class="viewer">
  {#if pdfData}
    <div class="controls">
      <button on:click={prevPage} disabled={currentPage <= 1}>Previous</button>
      <span>Page {currentPage} of {pageCount}</span>
      <button on:click={nextPage} disabled={currentPage >= pageCount}>Next</button>
    </div>

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

    <div class="canvas-container" bind:this={canvasContainer}>
      <div class="canvas-wrapper">
        <canvas
          bind:this={canvas}
          class:text-mode={isTextMode}
          on:click={handleCanvasClick}
        ></canvas>
        {#if isTextMode && canvas}
          <TextEditor
            bind:this={textEditor}
            canvasWidth={canvas.width}
            canvasHeight={canvas.height}
            {textColor}
            {fontFamily}
            {isBold}
            {isItalic}
          />
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .viewer {
    border: 2px solid #000;
    background: #fff;
    padding: 20px;
  }

  .controls {
    display: flex;
    gap: 16px;
    align-items: center;
    padding-bottom: 16px;
    border-bottom: 2px solid #000;
    margin-bottom: 20px;
  }

  .text-controls {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }

  button {
    padding: 8px 16px;
    border: 2px solid #000;
    background: #fff;
    color: #000;
    cursor: pointer;
    font-size: 14px;
  }

  button:hover:not(:disabled) {
    background: #000;
    color: #fff;
  }

  button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  button.active {
    background: #000;
    color: #fff;
  }

  .text-options {
    padding: 16px;
    border: 2px solid #000;
    background: #f9f9f9;
    margin-bottom: 20px;
  }

  .option-row {
    display: flex;
    gap: 16px;
    align-items: center;
    margin-bottom: 12px;
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

  .text-input {
    flex: 1;
    padding: 8px;
    border: 2px solid #000;
    font-size: 14px;
  }

  input[type="text"],
  input[type="number"],
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

  input[type="number"] {
    width: 60px;
  }

  input[type="color"] {
    width: 50px;
    height: 30px;
    border: 2px solid #000;
    cursor: pointer;
  }

  .canvas-container {
    display: flex;
    justify-content: center;
    overflow: auto;
    max-height: calc(100vh - 350px);
  }

  .canvas-wrapper {
    position: relative;
    display: inline-block;
    max-width: 100%;
    max-height: 100%;
  }

  canvas {
    border: 1px solid #000;
    display: block;
    max-width: 100%;
    max-height: calc(100vh - 350px);
    height: auto;
    width: auto;
    object-fit: contain;
  }

  canvas.text-mode {
    cursor: crosshair;
  }

  span {
    font-size: 14px;
    color: #000;
  }
</style>
