<script>
  import { createEventDispatcher } from 'svelte';

  export let pageWidth = 0;
  export let pageHeight = 0;
  export let textItems = [];
  export let highlights = [];
  export let highlightMode = false;
  export let highlightColor = '#fff176';

  const dispatch = createEventDispatcher();

  function rectsOverlap(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function handleMouseUp() {
    if (!highlightMode) return;

    window.setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

      const layer = document.getElementById(`text-layer-${pageWidth}-${pageHeight}-${textItems[0]?.id || 'empty'}`);
      if (!layer || !range.intersectsNode(layer)) return;

      const layerRect = layer.getBoundingClientRect();
      const range = selection.getRangeAt(0);
      const selectionRects = Array.from(range.getClientRects())
        .filter((rect) => rect.width > 1 && rect.height > 1 && rectsOverlap(rect, layerRect))
        .map((rect) => {
          const left = Math.max(rect.left, layerRect.left);
          const top = Math.max(rect.top, layerRect.top);
          const right = Math.min(rect.right, layerRect.right);
          const bottom = Math.min(rect.bottom, layerRect.bottom);
          const scaleX = pageWidth / layerRect.width;
          const scaleY = pageHeight / layerRect.height;

          return {
            x: (left - layerRect.left) * scaleX,
            y: (top - layerRect.top) * scaleY,
            width: (right - left) * scaleX,
            height: (bottom - top) * scaleY,
            color: highlightColor
          };
        })
        .filter((rect) => rect.width > 1 && rect.height > 1);

      if (selectionRects.length > 0) {
        dispatch('highlight', { rects: selectionRects });
        selection.removeAllRanges();
      }
    }, 0);
  }
</script>

<div class="highlight-layer" aria-hidden="true">
  {#each highlights as highlight (highlight.id)}
    <div
      class="highlight-rect"
      style="
        left: {(highlight.x / pageWidth) * 100}%;
        top: {(highlight.y / pageHeight) * 100}%;
        width: {(highlight.width / pageWidth) * 100}%;
        height: {(highlight.height / pageHeight) * 100}%;
        background: {highlight.color};
      "
    ></div>
  {/each}
</div>

<div
  id="text-layer-{pageWidth}-{pageHeight}-{textItems[0]?.id || 'empty'}"
  class="text-selection-layer"
  class:active={highlightMode}
  on:mouseup={handleMouseUp}
  role="presentation"
>
  {#each textItems as item (item.id)}
    <span
      style="
        left: {(item.left / pageWidth) * 100}%;
        top: {(item.top / pageHeight) * 100}%;
        width: {(item.width / pageWidth) * 100}%;
        height: {(item.height / pageHeight) * 100}%;
        font-size: {item.fontSize}px;
        transform: rotate({item.angle}rad);
      "
    >{item.text}</span>
  {/each}
</div>

<style>
  .highlight-layer,
  .text-selection-layer {
    position: absolute;
    inset: 0;
  }

  .highlight-layer {
    z-index: 8;
    pointer-events: none;
  }

  .highlight-rect {
    position: absolute;
    opacity: 0.45;
    mix-blend-mode: multiply;
  }

  .text-selection-layer {
    z-index: 9;
    overflow: hidden;
    pointer-events: none;
    user-select: none;
  }

  .text-selection-layer.active {
    pointer-events: auto;
    user-select: text;
    cursor: text;
  }

  .text-selection-layer span {
    position: absolute;
    display: block;
    color: transparent;
    white-space: pre;
    transform-origin: left top;
    line-height: 1;
  }

  .text-selection-layer.active span::selection {
    background: rgba(0, 102, 255, 0.25);
  }
</style>
