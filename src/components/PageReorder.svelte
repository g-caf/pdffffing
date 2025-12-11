<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { PDFRenderer } from '../lib/pdfRenderer.js';

  export let pdfData = null;

  const dispatch = createEventDispatcher();
  let renderer = new PDFRenderer();
  let pages = [];
  let pageCount = 0;
  let draggedIndex = null;
  let hasReordered = false;
  let isLoading = false;
  let loadedPdfData = null;
  let skipNextReload = false;

  $: if (pdfData && pdfData !== loadedPdfData && !isLoading && !skipNextReload) {
    loadAllPages();
  }

  $: if (skipNextReload && pdfData) {
    // Reset the flag and update loaded reference without reloading
    skipNextReload = false;
    loadedPdfData = pdfData;
  }

  async function loadAllPages() {
    if (isLoading) return;

    try {
      isLoading = true;
      loadedPdfData = pdfData;
      pageCount = await renderer.loadPDF(pdfData);
      pages = [];

      for (let i = 1; i <= pageCount; i++) {
        const canvas = document.createElement('canvas');
        await renderer.renderPage(i, canvas);
        pages.push({
          id: `page-${i}-${Date.now()}`,
          index: i,
          canvas: canvas,
          thumbnail: canvas.toDataURL()
        });
      }
      pages = pages; // trigger reactivity
      hasReordered = false;
    } catch (error) {
      console.error('Error loading pages:', error);
      alert('Failed to load PDF pages. Please try again.');
    } finally {
      isLoading = false;
    }
  }

  function handleDragStart(event, index) {
    draggedIndex = index;
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(event, index) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(event, dropIndex) {
    event.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newPages = [...pages];
    const [removed] = newPages.splice(draggedIndex, 1);
    newPages.splice(dropIndex, 0, removed);

    pages = newPages;
    draggedIndex = null;
    hasReordered = true;

    // Skip reload when PDF updates from this reorder
    skipNextReload = true;

    // Notify parent of new order
    dispatch('reorder', {
      newOrder: pages.map(p => p.index - 1) // Convert to 0-based indices
    });
  }

  function handleDragEnd() {
    draggedIndex = null;
  }
</script>

<div class="page-reorder">
  <h3>Rearrange Pages (Drag to reorder)</h3>
  <div class="pages-container">
    {#each pages as page, index (page.id)}
      <div
        class="page-item"
        class:dragging={draggedIndex === index}
        draggable="true"
        on:dragstart={(e) => handleDragStart(e, index)}
        on:dragover={(e) => handleDragOver(e, index)}
        on:drop={(e) => handleDrop(e, index)}
        on:dragend={handleDragEnd}
        role="button"
        tabindex="0"
      >
        <img src={page.thumbnail} alt="Page {index + 1}" />
      </div>
    {/each}
  </div>
</div>

<style>
  .page-reorder {
    background: #fff;
  }

  h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #000;
    font-weight: normal;
  }

  .pages-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    max-height: calc(100vh - 250px);
    overflow-y: auto;
  }

  .page-item {
    cursor: move;
    transition: opacity 0.2s, transform 0.2s;
    border: 2px solid #000;
    background: #fff;
    aspect-ratio: 8.5 / 11;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .page-item:hover {
    opacity: 0.8;
    transform: scale(1.02);
  }

  .page-item.dragging {
    opacity: 0.4;
  }

  .page-item img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }
</style>
