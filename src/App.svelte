<script>
  import FileUploader from './components/FileUploader.svelte';
  import PDFViewer from './components/PDFViewer.svelte';
  import PageReorder from './components/PageReorder.svelte';
  import Toolbar from './components/Toolbar.svelte';
  import { PDFProcessor } from './lib/pdfProcessor.js';

  let loadedFiles = [];
  let currentPDF = null;
  let processor = new PDFProcessor();
  let hasModifications = false;
  let showReorderView = false;
  let pdfViewer;

  // Version counters for explicit change tracking
  let pdfVersion = 0;        // increments on ANY pdf change (edit/reorder/merge)
  let thumbnailsVersion = 0; // increments only on NEW document (load/merge)

  function updateCurrentPDF(buffer, { isNewDocument = false } = {}) {
    currentPDF = buffer;
    pdfVersion += 1;
    if (isNewDocument) {
      thumbnailsVersion += 1;
    }
  }

  async function handleFilesLoaded(event) {
    const { files } = event.detail;
    loadedFiles = [...loadedFiles, ...files];

    try {
      if (loadedFiles.length === 1) {
        updateCurrentPDF(loadedFiles[0].arrayBuffer, { isNewDocument: true });
        await processor.loadPDF(currentPDF);
        showReorderView = false;
      } else {
        await handleMergePDFs();
      }
    } catch (error) {
      console.error('Error loading files:', error);
      alert('Failed to load files. Please try again.');
    }
  }

  async function handleMergePDFs() {
    if (loadedFiles.length === 0) return;

    try {
      const arrayBuffers = loadedFiles.map(f => f.arrayBuffer);

      if (loadedFiles.length === 1) {
        updateCurrentPDF(arrayBuffers[0], { isNewDocument: true });
        await processor.loadPDF(currentPDF);
      } else {
        await processor.mergePDFs(arrayBuffers);
        const mergedBytes = await processor.saveToBytes();
        updateCurrentPDF(mergedBytes.buffer, { isNewDocument: true });
        hasModifications = true;
      }

      showReorderView = true;
    } catch (error) {
      console.error('Error merging PDFs:', error);
      alert('Failed to merge PDFs. Please try again.');
    }
  }

  async function handleReorder(event) {
    const { newOrder } = event.detail;

    try {
      if (!processor.pdfDoc) {
        await processor.loadPDF(currentPDF);
      }

      await processor.reorderPages(newOrder);
      const reorderedBytes = await processor.saveToBytes();
      
      // NOT a new document - thumbnails already reflect the reorder
      updateCurrentPDF(reorderedBytes.buffer, { isNewDocument: false });
      hasModifications = true;

      processor = new PDFProcessor();
      await processor.loadPDF(currentPDF);
    } catch (error) {
      console.error('Error reordering pages:', error);
      alert('Failed to reorder pages. Please try again.');
    }
  }

  function toggleView() {
    showReorderView = !showReorderView;
  }

  async function handleAddText(event) {
    const { text, x, y, pageIndex, options } = event.detail;

    try {
      if (!processor.pdfDoc) {
        await processor.loadPDF(currentPDF);
      }

      await processor.addText(pageIndex, text, x, y, options);
      const updatedBytes = await processor.saveToBytes();
      
      // NOT a new document
      updateCurrentPDF(updatedBytes.buffer, { isNewDocument: false });
      hasModifications = true;

      processor = new PDFProcessor();
      await processor.loadPDF(currentPDF);
    } catch (error) {
      console.error('Error adding text:', error);
      alert('Failed to add text. Please try again.');
    }
  }

  async function handleDownload() {
    try {
      if (pdfViewer && !showReorderView) {
        const items = pdfViewer.finalizeText();

        if (items.length > 0) {
          if (!processor.pdfDoc) {
            await processor.loadPDF(currentPDF);
          }

          for (const item of items) {
            await processor.addText(
              item.pageIndex,
              item.text,
              item.x,
              item.y,
              item.options
            );
          }

          const updatedBytes = await processor.saveToBytes();
          currentPDF = updatedBytes.buffer;
          hasModifications = true;
        }
      }

      let bytesToDownload;

      if (hasModifications || loadedFiles.length > 1) {
        if (!processor.pdfDoc) {
          await processor.loadPDF(currentPDF);
        }
        bytesToDownload = await processor.saveToBytes();
      } else {
        bytesToDownload = new Uint8Array(currentPDF);
      }

      const blob = new Blob([bytesToDownload], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'edited-document.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  }

  function handleClear() {
    loadedFiles = [];
    currentPDF = null;
    processor = new PDFProcessor();
    hasModifications = false;
    showReorderView = false;
    pdfVersion = 0;
    thumbnailsVersion = 0;
  }
</script>

<div class="app">
  <Toolbar
    hasFiles={loadedFiles.length > 0}
    isViewing={currentPDF !== null}
    on:download={handleDownload}
    on:clear={handleClear}
  />

  <main>
    {#if !currentPDF}
      <FileUploader on:filesloaded={handleFilesLoaded} />
    {:else}
      <div class="view-toggle">
        <button on:click={toggleView} class:active={showReorderView}>
          Reorder
        </button>
        <button on:click={toggleView} class:active={!showReorderView}>
          Edit
        </button>
      </div>

      {#if showReorderView}
        <PageReorder
          pdfData={currentPDF}
          {thumbnailsVersion}
          on:reorder={handleReorder}
        />
      {:else}
        <PDFViewer
          bind:this={pdfViewer}
          pdfData={currentPDF}
          {pdfVersion}
          on:addtext={handleAddText}
        />
      {/if}

      <div class="actions-footer">
        <FileUploader compact={true} buttonText="Load More Files" on:filesloaded={handleFilesLoaded} />
      </div>
    {/if}
  </main>
</div>

<style>
  :global(html) {
    height: 100%;
    background: #fff;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #fff;
    color: #000;
    min-height: 100%;
  }

  :global(#app) {
    min-height: 100vh;
    background: #fff;
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: #fff;
  }

  main {
    flex: 1;
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    background: #fff;
    box-sizing: border-box;
  }

  .file-list {
    margin-top: 20px;
    padding: 20px;
    border: 2px solid #000;
    background: #fff;
  }

  .file-list h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    color: #000;
  }

  .file-list ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .file-list li {
    padding: 8px 0;
    border-bottom: 1px solid #000;
    font-size: 14px;
  }

  .file-list li:last-child {
    border-bottom: none;
  }

  .actions-footer {
    margin-top: 20px;
    text-align: center;
  }

  .actions-footer button {
    padding: 8px 16px;
    border: 2px solid #000;
    background: #fff;
    color: #000;
    cursor: pointer;
    font-size: 14px;
  }

  .actions-footer button:hover {
    background: #000;
    color: #fff;
  }

  .view-toggle {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 2px solid #000;
  }

  .view-toggle button {
    padding: 8px 16px;
    border: 2px solid #000;
    background: #fff;
    color: #000;
    cursor: pointer;
    font-size: 14px;
  }

  .view-toggle button:hover {
    background: #f5f5f5;
  }

  .view-toggle button.active {
    background: #000;
    color: #fff;
  }
</style>
