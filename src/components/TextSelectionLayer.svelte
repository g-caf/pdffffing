<script>
  import { createEventDispatcher } from 'svelte';

  export let pageWidth = 0;
  export let pageHeight = 0;
  export let textItems = [];
  export let highlights = [];
  export let highlightMode = false;
  export let highlightColor = '#fff176';

  const dispatch = createEventDispatcher();
  let colorInput;
  let selectedHighlightId = null;
  let selectedHighlightColor = highlightColor;
  let lastSelectionSignature = '';
  let lastSelectionTime = 0;

  function rectsOverlap(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function rectContains(outer, inner) {
    const tolerance = 1;

    return (
      outer.x <= inner.x + tolerance &&
      outer.y <= inner.y + tolerance &&
      outer.x + outer.width >= inner.x + inner.width - tolerance &&
      outer.y + outer.height >= inner.y + inner.height - tolerance
    );
  }

  function verticalOverlapRatio(a, b) {
    const top = Math.max(a.y, b.y);
    const bottom = Math.min(a.y + a.height, b.y + b.height);
    const overlap = Math.max(0, bottom - top);

    return overlap / Math.min(a.height, b.height);
  }

  function areOnSameLine(a, b) {
    const centerDelta = Math.abs((a.y + a.height / 2) - (b.y + b.height / 2));
    return verticalOverlapRatio(a, b) > 0.55 || centerDelta < Math.max(2, Math.min(a.height, b.height) * 0.45);
  }

  function normalizeSelectionRects(rects) {
    const uniqueRects = [];
    const seen = new Set();

    for (const rect of rects) {
      const normalized = {
        ...rect,
        x: Math.round(rect.x * 10) / 10,
        y: Math.round(rect.y * 10) / 10,
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10
      };
      const key = `${Math.round(normalized.x)}:${Math.round(normalized.y)}:${Math.round(normalized.width)}:${Math.round(normalized.height)}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueRects.push(normalized);
      }
    }

    const withoutContainedRects = uniqueRects.filter((rect, index) => (
      !uniqueRects.some((other, otherIndex) => (
        otherIndex !== index &&
        rectContains(other, rect) &&
        other.width * other.height >= rect.width * rect.height
      ))
    ));

    return withoutContainedRects
      .sort((a, b) => (a.y - b.y) || (a.x - b.x))
      .reduce((merged, rect) => {
        const previous = merged[merged.length - 1];
        const maxGap = Math.max(10, rect.height * 1.5, previous?.height || 0);

        if (previous && areOnSameLine(previous, rect) && rect.x <= previous.x + previous.width + maxGap) {
          const left = Math.min(previous.x, rect.x);
          const top = Math.min(previous.y, rect.y);
          const right = Math.max(previous.x + previous.width, rect.x + rect.width);
          const bottom = Math.max(previous.y + previous.height, rect.y + rect.height);

          previous.x = left;
          previous.y = top;
          previous.width = right - left;
          previous.height = bottom - top;
          return merged;
        }

        merged.push({ ...rect });
        return merged;
      }, []);
  }

  function createSelectionSignature(rects) {
    return rects
      .map((rect) => `${Math.round(rect.x)}:${Math.round(rect.y)}:${Math.round(rect.width)}:${Math.round(rect.height)}`)
      .join('|');
  }

  function handleMouseUp() {
    if (!highlightMode) return;

    window.setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

      const layer = document.getElementById(`text-layer-${pageWidth}-${pageHeight}-${textItems[0]?.id || 'empty'}`);
      const range = selection.getRangeAt(0);
      if (!layer || !range.intersectsNode(layer)) return;

      const layerRect = layer.getBoundingClientRect();
      const selectionRects = normalizeSelectionRects(Array.from(range.getClientRects())
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
        .filter((rect) => rect.width > 1 && rect.height > 1));

      if (selectionRects.length > 0) {
        const now = Date.now();
        const signature = createSelectionSignature(selectionRects);

        if (signature === lastSelectionSignature && now - lastSelectionTime < 500) {
          selection.removeAllRanges();
          return;
        }

        lastSelectionSignature = signature;
        lastSelectionTime = now;
        dispatch('highlight', { rects: selectionRects });
        selection.removeAllRanges();
      }
    }, 0);
  }

  function editHighlightColor(highlight) {
    selectedHighlightId = highlight.id;
    selectedHighlightColor = highlight.color;

    window.setTimeout(() => {
      colorInput?.click();
    }, 0);
  }

  function handleColorChange() {
    if (!selectedHighlightId) return;

    dispatch('highlightcolorchange', {
      id: selectedHighlightId,
      color: selectedHighlightColor
    });
  }
</script>

<input
  bind:this={colorInput}
  class="highlight-color-input"
  type="color"
  bind:value={selectedHighlightColor}
  on:input={handleColorChange}
  aria-label="Highlight color"
/>

<div class="highlight-layer" class:editable={highlightMode}>
  {#each highlights as highlight (highlight.id)}
    <button
      type="button"
      class="highlight-rect"
      style="
        left: {(highlight.x / pageWidth) * 100}%;
        top: {(highlight.y / pageHeight) * 100}%;
        width: {(highlight.width / pageWidth) * 100}%;
        height: {(highlight.height / pageHeight) * 100}%;
        background: {highlight.color};
      "
      on:click={() => editHighlightColor(highlight)}
      aria-label="Change highlight color"
    ></button>
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
    z-index: 11;
    pointer-events: none;
  }

  .highlight-rect {
    position: absolute;
    border: 0;
    padding: 0;
    opacity: 0.45;
    mix-blend-mode: multiply;
    cursor: pointer;
    pointer-events: none;
  }

  .highlight-layer.editable .highlight-rect {
    pointer-events: auto;
  }

  .highlight-color-input {
    position: fixed;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
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
