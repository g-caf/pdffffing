<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { PDFRenderer } from '../lib/pdfRenderer.js';

  export let pdfData = null;
  export let currentPage = 1;

  const dispatch = createEventDispatcher();
  let canvas;
  let renderer = new PDFRenderer();
  let pageCount = 0;
  let isTextMode = false;
  let textToAdd = '';
  let textX = 0;
  let textY = 0;
  let notification = '';
  let showNotification = false;
  let fontSize = 12;
  let fontFamily = 'Helvetica';
  let isBold = false;
  let isItalic = false;
  let textColor = '#000000';

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
    if (isTextMode && textToAdd) {
      const rect = canvas.getBoundingClientRect();
      textX = event.clientX - rect.left;
      textY = canvas.height - (event.clientY - rect.top); // Flip Y coordinate for PDF

      // Convert hex color to RGB
      const hex = textColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;

      // Determine font name based on selections
      let font = fontFamily;
      if (isBold && isItalic) font += '-BoldOblique';
      else if (isBold) font += '-Bold';
      else if (isItalic) font += '-Oblique';

      dispatch('addtext', {
        text: textToAdd,
        x: textX,
        y: textY,
        pageIndex: currentPage - 1,
        options: {
          fontSize: fontSize,
          fontFamily: font,
          color: { r, g, b }
        }
      });

      // Show notification
      showNotificationMessage('Text added! Download PDF to see changes.');
      textToAdd = '';
    }
  }

  function showNotificationMessage(msg) {
    notification = msg;
    showNotification = true;
    setTimeout(() => {
      showNotification = false;
    }, 3000);
  }

  function toggleTextMode() {
    isTextMode = !isTextMode;
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
  {#if showNotification}
    <div class="notification">{notification}</div>
  {/if}

  {#if pdfData}
    <div class="controls">
      <button on:click={prevPage} disabled={currentPage <= 1}>Previous</button>
      <span>Page {currentPage} of {pageCount}</span>
      <button on:click={nextPage} disabled={currentPage >= pageCount}>Next</button>

      <div class="text-controls">
        <button
          class:active={isTextMode}
          on:click={toggleTextMode}
        >
          {isTextMode ? 'Exit Text Mode' : 'Add Text'}
        </button>
      </div>
    </div>

    {#if isTextMode}
      <div class="text-options">
        <div class="option-group">
          <label>Text:</label>
          <input
            type="text"
            bind:value={textToAdd}
            placeholder="Enter text to add"
            class="text-input"
          />
        </div>

        <div class="option-group">
          <label>Font:</label>
          <select bind:value={fontFamily}>
            <option value="Helvetica">Helvetica</option>
            <option value="Courier">Courier</option>
            <option value="Times-Roman">Times Roman</option>
          </select>
        </div>

        <div class="option-group">
          <label>Size:</label>
          <input type="number" bind:value={fontSize} min="6" max="72" />
        </div>

        <div class="option-group">
          <label>Color:</label>
          <input type="color" bind:value={textColor} />
        </div>

        <div class="option-group">
          <label>
            <input type="checkbox" bind:checked={isBold} />
            Bold
          </label>
          <label>
            <input type="checkbox" bind:checked={isItalic} />
            Italic
          </label>
        </div>

        <p class="instruction">Click on the PDF below to place text</p>
      </div>
    {/if}

    <div class="canvas-container">
      <canvas
        bind:this={canvas}
        class:text-mode={isTextMode}
        on:click={handleCanvasClick}
      ></canvas>
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

  .option-group {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .option-group label {
    font-size: 14px;
    color: #000;
    min-width: 50px;
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

  input[type="checkbox"] {
    cursor: pointer;
  }

  .instruction {
    margin: 12px 0 0 0;
    font-size: 13px;
    font-style: italic;
    color: #666;
  }

  .canvas-container {
    display: flex;
    justify-content: center;
    overflow: auto;
  }

  canvas {
    border: 1px solid #000;
    display: block;
  }

  canvas.text-mode {
    cursor: crosshair;
  }

  span {
    font-size: 14px;
    color: #000;
  }

  .notification {
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #000;
    color: #fff;
    padding: 12px 24px;
    border: 2px solid #000;
    font-size: 14px;
    z-index: 1000;
  }
</style>
