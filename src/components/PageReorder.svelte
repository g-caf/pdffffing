<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { PDFRenderer } from '../lib/pdfRenderer.js';

  export let pdfData = null;

  const dispatch = createEventDispatcher();
  let renderer = new PDFRenderer();
  let pages = [];
  let pageCount = 0;
  let draggedIndex = null;

  $: if (pdfData) {
    loadAllPages();
  }

  async function loadAllPages() {
    try {
      pageCount = await renderer.loadPDF(pdfData);
      pages = [];

      for (let i = 1; i <= pageCount; i++) {
        const canvas = document.createElement('canvas');
        await renderer.renderPage(i, canvas);
        pages.push({
          index: i,
          canvas: canvas,
          thumbnail: canvas.toDataURL()
        });
      }
      pages = pages; // trigger reactivity
    } catch (error) {
      console.error('Error loading pages:', error);
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
    {#each pages as page, index (page.index)}
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
        <div class="page-number">Page {index + 1}</div>
        <img src={page.thumbnail} alt="Page {index + 1}" />
      </div>
    {/each}
  </div>
</div>

<style>
  .page-reorder {
    border: 2px solid #000;
    background: #fff;
    padding: 20px;
  }

  h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    color: #000;
  }

  .pages-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 600px;
    overflow-y: auto;
    border: 2px solid #000;
    padding: 12px;
    background: #f9f9f9;
  }

  .page-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 2px solid #000;
    background: #fff;
    cursor: move;
    transition: opacity 0.2s;
  }

  .page-item:hover {
    background: #f5f5f5;
  }

  .page-item.dragging {
    opacity: 0.4;
  }

  .page-number {
    font-size: 14px;
    font-weight: 700;
    min-width: 60px;
    color: #000;
  }

  .page-item img {
    max-width: 150px;
    height: auto;
    border: 1px solid #000;
  }
</style>
