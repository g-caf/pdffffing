<script>
  import { createEventDispatcher, onMount } from 'svelte';

  export let canvasWidth = 0;
  export let canvasHeight = 0;
  export let textColor = '#000000';
  export let fontFamily = 'Helvetica';
  export let isBold = false;
  export let isItalic = false;

  const dispatch = createEventDispatcher();

  let textItems = [];
  let selectedItem = null;
  let draggedItem = null;
  let dragOffset = { x: 0, y: 0 };
  let resizing = false;
  let resizeHandle = null;

  export function addTextItem(text, x, y) {
    const newItem = {
      id: Date.now(),
      text,
      x,
      y,
      fontSize: 16,
      color: textColor,
      fontFamily,
      isBold,
      isItalic,
      width: text.length * 10, // Approximate
      height: 20
    };
    textItems = [...textItems, newItem];
    selectedItem = newItem;
  }

  export function clearAll() {
    textItems = [];
    selectedItem = null;
  }

  export function finalizeAll() {
    return textItems.map(item => ({
      text: item.text,
      x: item.x,
      y: canvasHeight - item.y, // Flip Y for PDF coordinates
      fontSize: item.fontSize,
      fontFamily: getFontName(item),
      color: hexToRgb(item.color)
    }));
  }

  function getFontName(item) {
    let font = item.fontFamily;
    if (item.isBold && item.isItalic) font += '-BoldOblique';
    else if (item.isBold) font += '-Bold';
    else if (item.isItalic) font += '-Oblique';
    return font;
  }

  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    return {
      r: parseInt(clean.substr(0, 2), 16) / 255,
      g: parseInt(clean.substr(2, 2), 16) / 255,
      b: parseInt(clean.substr(4, 2), 16) / 255
    };
  }

  function handleMouseDown(event, item) {
    event.stopPropagation();

    const rect = event.currentTarget.parentElement.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Check if clicking resize handle
    const handleSize = 10;
    const handleX = item.x + item.width;
    const handleY = item.y + item.height;

    if (Math.abs(clickX - handleX) < handleSize && Math.abs(clickY - handleY) < handleSize) {
      resizing = true;
      resizeHandle = item;
    } else {
      draggedItem = item;
      dragOffset = {
        x: clickX - item.x,
        y: clickY - item.y
      };
    }

    selectedItem = item;
  }

  function handleMouseMove(event) {
    if (!draggedItem && !resizing) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (resizing && resizeHandle) {
      const newWidth = Math.max(20, mouseX - resizeHandle.x);
      const newHeight = Math.max(10, mouseY - resizeHandle.y);

      // Scale font size proportionally
      const scaleFactor = newHeight / resizeHandle.height;
      resizeHandle.fontSize = Math.max(6, Math.min(72, resizeHandle.fontSize * scaleFactor));
      resizeHandle.width = newWidth;
      resizeHandle.height = newHeight;

      textItems = textItems;
    } else if (draggedItem) {
      draggedItem.x = mouseX - dragOffset.x;
      draggedItem.y = mouseY - dragOffset.y;
      textItems = textItems;
    }
  }

  function handleMouseUp() {
    draggedItem = null;
    resizing = false;
    resizeHandle = null;
  }

  function deleteSelected() {
    if (selectedItem) {
      textItems = textItems.filter(item => item.id !== selectedItem.id);
      selectedItem = null;
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      deleteSelected();
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

<div
  class="text-editor-overlay"
  style="width: {canvasWidth}px; height: {canvasHeight}px;"
  on:mousemove={handleMouseMove}
  on:mouseup={handleMouseUp}
  role="presentation"
>
  {#each textItems as item (item.id)}
    <div
      class="text-item"
      class:selected={selectedItem === item}
      style="
        left: {item.x}px;
        top: {item.y}px;
        font-size: {item.fontSize}px;
        color: {item.color};
        font-family: {item.fontFamily}, sans-serif;
        font-weight: {item.isBold ? 'bold' : 'normal'};
        font-style: {item.isItalic ? 'italic' : 'normal'};
        width: {item.width}px;
        height: {item.height}px;
      "
      on:mousedown={(e) => handleMouseDown(e, item)}
      role="button"
      tabindex="0"
    >
      <span class="text-content">{item.text}</span>
      {#if selectedItem === item}
        <div class="resize-handle"></div>
        <button class="delete-btn" on:click={deleteSelected}>×</button>
      {/if}
    </div>
  {/each}
</div>

<style>
  .text-editor-overlay {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: auto;
    z-index: 10;
  }

  .text-item {
    position: absolute;
    cursor: move;
    border: 1px dashed transparent;
    padding: 2px;
    user-select: none;
    display: flex;
    align-items: center;
    white-space: nowrap;
  }

  .text-item.selected {
    border-color: #0066ff;
    background: rgba(0, 102, 255, 0.05);
  }

  .text-content {
    pointer-events: none;
  }

  .resize-handle {
    position: absolute;
    right: -5px;
    bottom: -5px;
    width: 10px;
    height: 10px;
    background: #0066ff;
    border: 1px solid #fff;
    cursor: nwse-resize;
  }

  .delete-btn {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid #000;
    background: #fff;
    color: #000;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .delete-btn:hover {
    background: #ff0000;
    color: #fff;
    border-color: #ff0000;
  }
</style>
