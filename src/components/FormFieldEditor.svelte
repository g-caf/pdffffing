<script>
  import { createEventDispatcher } from 'svelte';

  export let fields = []; // Array of ALL detected fields
  export let pageWidth = 0;
  export let pageHeight = 0;
  export let pageIndex = 0;
  export let showControls = true;

  const dispatch = createEventDispatcher();

  let selectedField = null;
  let draggedField = null;
  let dragOffset = { x: 0, y: 0 };

  // Filter to only show fields for this page
  $: pageFields = fields.filter(f => f.pageIndex === pageIndex);

  // Calculate scale factor: canvas dimensions vs rendered dimensions
  $: scaleX = pageWidth > 0 ? 100 / pageWidth : 1;
  $: scaleY = pageHeight > 0 ? 100 / pageHeight : 1;

  function handleMouseDown(event, field) {
    if (event.target.classList.contains('delete-btn')) return;
    if (event.target.classList.contains('field-controls')) return;
    if (event.target.closest('.field-controls')) return;

    selectedField = field;
    draggedField = field;

    const rect = event.currentTarget.getBoundingClientRect();
    dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function handleMouseMove(event) {
    if (draggedField) {
      const container = event.currentTarget;
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left - dragOffset.x;
      const y = event.clientY - rect.top - dragOffset.y;

      // Convert from rendered pixels to canvas pixels
      const canvasX = (x / rect.width) * pageWidth;
      const canvasY = (y / rect.height) * pageHeight;

      // Calculate current width and height (in canvas coordinates)
      const width = draggedField.rect[2] - draggedField.rect[0];
      const height = draggedField.rect[3] - draggedField.rect[1];

      // Update field position (keeping size constant)
      draggedField.rect[0] = canvasX;
      draggedField.rect[1] = canvasY;
      draggedField.rect[2] = canvasX + width;
      draggedField.rect[3] = canvasY + height;

      fields = fields; // Trigger reactivity
    }
  }

  function handleMouseUp() {
    draggedField = null;
  }

  function handleContainerClick(event) {
    // Only create field if clicking directly on the container (not on existing field)
    if (event.target.classList.contains('overlay-container')) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Convert from rendered pixels to canvas pixels
      const canvasX = (x / rect.width) * pageWidth;
      const canvasY = (y / rect.height) * pageHeight;

      // Create field instantly at click position
      addNewField(canvasX, canvasY);
    }
  }

  function deleteField(field) {
    const index = fields.indexOf(field);
    if (index > -1) {
      fields.splice(index, 1);
      fields = fields; // Trigger reactivity
    }
    if (selectedField === field) {
      selectedField = null;
    }
  }

  function changeFieldType(field, type) {
    field.type = type;
    fields = fields; // Trigger reactivity
  }

  function applyFields() {
    dispatch('apply', { fields });
  }

  function cancel() {
    dispatch('cancel');
  }

  function addNewField(x, y) {
    // Default field size: 200px wide, 24px tall
    const defaultWidth = 200;
    const defaultHeight = 24;

    const newField = {
      type: 'text',
      rect: [x, y, x + defaultWidth, y + defaultHeight],
      confidence: 'manual',
      detectionMethod: 'user-created',
      id: `manual-${pageIndex}-${Date.now()}`,
      pageIndex: pageIndex
    };

    fields = [...fields, newField];
    selectedField = newField; // Auto-select the new field
  }
</script>

<div
  class="overlay-container"
  on:click={handleContainerClick}
  on:mousemove={handleMouseMove}
  on:mouseup={handleMouseUp}
  on:mouseleave={handleMouseUp}
  role="application"
  tabindex="-1"
>
  {#each pageFields as field (field.id || field)}
    <div
      class="field-box"
      class:selected={selectedField === field}
      class:text-field={field.type === 'text'}
      class:checkbox-field={field.type === 'checkbox'}
      style="
        left: {field.rect[0] * scaleX}%;
        top: {field.rect[1] * scaleY}%;
        width: {(field.rect[2] - field.rect[0]) * scaleX}%;
        height: {(field.rect[3] - field.rect[1]) * scaleY}%;
      "
      on:mousedown={(e) => handleMouseDown(e, field)}
      role="button"
      tabindex="0"
    >
      <div class="field-label">{field.type}</div>
      <button class="delete-btn" on:click={() => deleteField(field)}>×</button>

      {#if selectedField === field}
        <div class="field-controls">
          <button on:click={() => changeFieldType(field, 'text')}>Text</button>
          <button on:click={() => changeFieldType(field, 'checkbox')}>Check</button>
        </div>
      {/if}
    </div>
  {/each}
</div>

{#if showControls}
  <div class="editor-controls">
    <div class="info">
      <span>{fields.length} field{fields.length !== 1 ? 's' : ''} total</span>
      <span class="help">• Click to add field • Drag field to move • Click field to select and change type</span>
    </div>
    <div class="buttons">
      <button class="cancel-btn" on:click={cancel}>Cancel</button>
      <button class="apply-btn" on:click={applyFields}>Apply Fields to PDF</button>
    </div>
  </div>
{/if}

<style>
  .overlay-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    cursor: crosshair;
    z-index: 100;
  }

  .field-box {
    position: absolute;
    border: 2px dashed #0066ff;
    background: rgba(0, 102, 255, 0.1);
    cursor: move;
    box-sizing: border-box;
  }

  .field-box:hover {
    background: rgba(0, 102, 255, 0.2);
    border-color: #0044cc;
  }

  .field-box.selected {
    border: 2px solid #0066ff;
    background: rgba(0, 102, 255, 0.15);
    box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.3);
  }

  .field-box.checkbox-field {
    border-color: #ff6600;
    background: rgba(255, 102, 0, 0.1);
  }

  .field-label {
    position: absolute;
    top: -20px;
    left: 0;
    background: #0066ff;
    color: white;
    padding: 2px 6px;
    font-size: 10px;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: none;
  }

  .checkbox-field .field-label {
    background: #ff6600;
  }

  .delete-btn {
    position: absolute;
    top: -20px;
    right: 0;
    background: #ff0000;
    color: white;
    border: none;
    width: 20px;
    height: 20px;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .delete-btn:hover {
    background: #cc0000;
  }

  .field-controls {
    position: absolute;
    bottom: -30px;
    left: 0;
    display: flex;
    gap: 4px;
    background: white;
    border: 1px solid #ccc;
    padding: 2px;
  }

  .field-controls button {
    padding: 2px 8px;
    font-size: 11px;
    border: 1px solid #000;
    background: #fff;
    cursor: pointer;
  }

  .field-controls button:hover {
    background: #f0f0f0;
  }

  .editor-controls {
    position: sticky;
    bottom: 0;
    background: #fff;
    border-top: 2px solid #000;
    padding: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 101;
    gap: 16px;
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }

  .info span:first-child {
    font-weight: 500;
  }

  .help {
    color: #666;
    font-size: 11px;
  }

  .buttons {
    display: flex;
    gap: 8px;
  }

  .cancel-btn, .apply-btn {
    padding: 8px 16px;
    border: 2px solid #000;
    background: #fff;
    color: #000;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .cancel-btn:hover {
    background: #f0f0f0;
  }

  .apply-btn {
    background: #000;
    color: #fff;
  }

  .apply-btn:hover {
    background: #333;
  }
</style>
