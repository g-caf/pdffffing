<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { PDFRenderer } from '../lib/pdfRenderer.js';

  export let pdfData = null;

  const dispatch = createEventDispatcher();
  let renderer = new PDFRenderer();
  let pages = [];
  let pageCount = 0;
  let draggedIndex = null;
  let dropTargetIndex = null;
  let hasReordered = false;
  let isLoading = false;
  let hasLoaded = false;
  let skipReloadOnce = false;

  onMount(() => {
    if (pdfData && !hasLoaded) {
      loadAllPages();
    }
  });

  $: if (pdfData && hasLoaded && !skipReloadOnce) {
    loadAllPages();
  }

  $: if (skipReloadOnce && pdfData) {
    skipReloadOnce = false;
  }

  async function loadAllPages() {
    if (isLoading || !pdfData) return;

    try {
      isLoading = true;
      renderer = new PDFRenderer();
      pageCount = await renderer.loadPDF(pdfData);
      const newPages = [];

      for (let i = 1; i <= pageCount; i++) {
        const canvas = document.createElement('canvas');
        await renderer.renderPage(i, canvas);
        newPages.push({
          id: `page-${i}-${Date.now()}`,
          originalIndex: i - 1,
          canvas: canvas,
          thumbnail: canvas.toDataURL()
        });
      }
      pages = newPages;
      hasReordered = false;
      hasLoaded = true;
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
    event.dataTransfer.setData('text/plain', index.toString());
  }

  function handleDragOver(event, index) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      dropTargetIndex = index;
    }
  }

  function handleDragLeave(event, index) {
    if (dropTargetIndex === index) {
      dropTargetIndex = null;
    }
  }

  function handleDrop(event, dropIndex) {
    event.preventDefault();
    dropTargetIndex = null;

    if (draggedIndex === null || draggedIndex === dropIndex) {
      draggedIndex = null;
      return;
    }

    const newPages = [...pages];
    const [removed] = newPages.splice(draggedIndex, 1);
    newPages.splice(dropIndex, 0, removed);

    pages = newPages;
    draggedIndex = null;
    hasReordered = true;
    skipReloadOnce = true;

    dispatch('reorder', {
      newOrder: pages.map(p => p.originalIndex)
    });
  }

  function handleDragEnd() {
    draggedIndex = null;
    dropTargetIndex = null;
  }
</script>

<div class="page-reorder">
  <h3>Drag to reorder</h3>
  <div class="pages-container">
    {#each pages as page, index (page.id)}
      <div
        class="page-item"
        class:dragging={draggedIndex === index}
        class:drop-target={dropTargetIndex === index}
        draggable="true"
        on:dragstart={(e) => handleDragStart(e, index)}
        on:dragover={(e) => handleDragOver(e, index)}
        on:dragleave={(e) => handleDragLeave(e, index)}
        on:drop={(e) => handleDrop(e, index)}
        on:dragend={handleDragEnd}
        role="button"
        tabindex="0"
      >
        <span class="page-number">{index + 1}</span>
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
    position: relative;
    cursor: move;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    border: 2px solid #000;
    background: #fff;
    aspect-ratio: 8.5 / 11;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .page-item:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .page-item.dragging {
    opacity: 0.5;
    transform: scale(0.95);
  }

  .page-item.drop-target {
    border-color: #0066ff;
    border-width: 3px;
    box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.3);
    transform: scale(1.05);
  }

  .page-number {
    position: absolute;
    top: 8px;
    left: 8px;
    background: #000;
    color: #fff;
    font-size: 12px;
    padding: 2px 8px;
    z-index: 1;
  }

  .page-item img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }
</style>
