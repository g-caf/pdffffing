<script>
  import FileUploader from './components/FileUploader.svelte';
  import PDFViewer from './components/PDFViewer.svelte';
  import Toolbar from './components/Toolbar.svelte';
  import { PDFProcessor } from './lib/pdfProcessor.js';

  let loadedFiles = [];
  let currentPDF = null;
  let processor = new PDFProcessor();
  let hasModifications = false;

  async function handleFilesLoaded(event) {
    const { files } = event.detail;
    loadedFiles = [...loadedFiles, ...files];

    if (loadedFiles.length === 1) {
      // If only one file, load it directly
      currentPDF = loadedFiles[0].arrayBuffer;
      await processor.loadPDF(currentPDF);
    }
  }

  async function handleMergePDFs() {
    if (loadedFiles.length === 0) return;

    try {
      const arrayBuffers = loadedFiles.map(f => f.arrayBuffer);
      await processor.mergePDFs(arrayBuffers);

      const mergedBytes = await processor.saveToBytes();
      currentPDF = mergedBytes.buffer;
      hasModifications = true;
    } catch (error) {
      console.error('Error merging PDFs:', error);
      alert('Failed to merge PDFs. Please try again.');
    }
  }

  async function handleAddText(event) {
    const { text, x, y, pageIndex } = event.detail;

    try {
      if (!processor.pdfDoc) {
        await processor.loadPDF(currentPDF);
      }

      await processor.addText(pageIndex, text, x, y);

      const updatedBytes = await processor.saveToBytes();
      currentPDF = updatedBytes.buffer;
      hasModifications = true;
    } catch (error) {
      console.error('Error adding text:', error);
      alert('Failed to add text. Please try again.');
    }
  }

  async function handleDownload() {
    try {
      let bytesToDownload;

      if (hasModifications || loadedFiles.length > 1) {
        // Use the modified version
        if (!processor.pdfDoc) {
          await processor.loadPDF(currentPDF);
        }
        bytesToDownload = await processor.saveToBytes();
      } else {
        // Use original file
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
  }
</script>

<div class="app">
  <Toolbar
    hasFiles={loadedFiles.length > 0}
    on:merge={handleMergePDFs}
    on:download={handleDownload}
    on:clear={handleClear}
  />

  <main>
    {#if !currentPDF}
      <FileUploader on:filesloaded={handleFilesLoaded} />

      {#if loadedFiles.length > 0}
        <div class="file-list">
          <h3>Loaded Files ({loadedFiles.length})</h3>
          <ul>
            {#each loadedFiles as file}
              <li>{file.name}</li>
            {/each}
          </ul>
        </div>
      {/if}
    {:else}
      <PDFViewer
        pdfData={currentPDF}
        on:addtext={handleAddText}
      />

      <div class="actions-footer">
        <button on:click={() => { currentPDF = null; }}>
          Load More Files
        </button>
      </div>
    {/if}
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #fff;
    color: #000;
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  main {
    flex: 1;
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
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
</style>
