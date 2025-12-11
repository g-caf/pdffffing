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
  let isDrawing = false;
  let drawStart = null;

  // Filter to only show fields for this page
  $: pageFields = fields.filter(f => f.pageIndex === pageIndex);

  function handleMouseDown(event, field) {
    if (event.target.classList.contains('delete-btn')) return;

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

      // Update field position
      draggedField.rect[0] = x;
      draggedField.rect[1] = y;
      draggedField.rect[2] = x + (draggedField.rect[2] - draggedField.rect[0]);
      draggedField.rect[3] = y + (draggedField.rect[3] - draggedField.rect[1]);

      fields = fields; // Trigger reactivity
    } else if (isDrawing && drawStart) {
      // Update draw preview
      fields = fields;
    }
  }

  function handleMouseUp() {
    draggedField = null;

    if (isDrawing && drawStart) {
      // Finish drawing new field
      isDrawing = false;
      drawStart = null;
    }
  }

  function handleContainerMouseDown(event) {
    if (event.target.classList.contains('overlay-container')) {
      // Start drawing new field
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      drawStart = { x, y };
      isDrawing = true;
    }
  }

  function handleContainerMouseUp(event) {
    if (isDrawing && drawStart) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const width = Math.abs(x - drawStart.x);
      const height = Math.abs(y - drawStart.y);

      // Only create if dragged enough
      if (width > 20 && height > 10) {
        addNewField(
          Math.min(drawStart.x, x),
          Math.min(drawStart.y, y),
          width,
          height
        );
      }

      isDrawing = false;
      drawStart = null;
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

  function addNewField(x, y, width, height) {
    const newField = {
      type: 'text',
      rect: [x, y, x + width, y + height],
      confidence: 'manual',
      detectionMethod: 'user-drawn',
      id: `manual-${pageIndex}-${Date.now()}`,
      pageIndex: pageIndex
    };

    fields = [...fields, newField];
  }
</script>

<div
  class="overlay-container"
  style="width: {pageWidth}px; height: {pageHeight}px;"
  on:mousedown={handleContainerMouseDown}
  on:mousemove={handleMouseMove}
  on:mouseup={handleContainerMouseUp}
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
        left: {field.rect[0]}px;
        top: {field.rect[1]}px;
        width: {field.rect[2] - field.rect[0]}px;
        height: {field.rect[3] - field.rect[1]}px;
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

  {#if isDrawing && drawStart}
    <div
      class="draw-preview"
      style="
        left: {drawStart.x}px;
        top: {drawStart.y}px;
        width: 100px;
        height: 20px;
      "
    />
  {/if}
</div>

{#if showControls}
  <div class="editor-controls">
    <div class="info">
      <span>{fields.length} field{fields.length !== 1 ? 's' : ''} total</span>
      <span class="help">• Drag to move • Click + drag empty space to add • Click field to select</span>
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

  .draw-preview {
    position: absolute;
    border: 2px dashed #00cc00;
    background: rgba(0, 255, 0, 0.1);
    pointer-events: none;
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
