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

      dispatch('addtext', {
        text: textToAdd,
        x: textX,
        y: textY,
        pageIndex: currentPage - 1
      });

      // Show notification
      showNotificationMessage('Text added! Download PDF to save changes.');
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
        {#if isTextMode}
          <input
            type="text"
            bind:value={textToAdd}
            placeholder="Enter text to add"
          />
        {/if}
      </div>
    </div>

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

  input[type="text"] {
    padding: 8px;
    border: 2px solid #000;
    font-size: 14px;
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
