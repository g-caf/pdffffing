<script>
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  export let show = false;

  const dispatch = createEventDispatcher();

  let mode = 'draw'; // 'draw' or 'type'
  let canvas;
  let ctx;
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  // Type mode
  let typedName = '';
  let selectedFont = 'Brush Script MT';

  const signatureFonts = [
    'Brush Script MT',
    'Lucida Handwriting',
    'Courier New',
    'Times New Roman',
    'Georgia',
    'Verdana'
  ];

  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
    }
  });

  function startDrawing(e) {
    if (mode !== 'draw') return;
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
  }

  function draw(e) {
    if (!isDrawing || mode !== 'draw') return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastX = x;
    lastY = y;
  }

  function stopDrawing() {
    isDrawing = false;
  }

  function clear() {
    if (mode === 'draw') {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      typedName = '';
    }
  }

  function save() {
    let signatureData;

    if (mode === 'draw') {
      // Get canvas data as image
      signatureData = canvas.toDataURL('image/png');
    } else {
      // Create canvas with typed text
      const textCanvas = document.createElement('canvas');
      textCanvas.width = 400;
      textCanvas.height = 100;
      const textCtx = textCanvas.getContext('2d');

      textCtx.font = `40px "${selectedFont}", cursive`;
      textCtx.fillStyle = '#000';
      textCtx.textBaseline = 'middle';
      textCtx.fillText(typedName, 20, 50);

      signatureData = textCanvas.toDataURL('image/png');
    }

    dispatch('save', { signatureData });
    close();
  }

  function close() {
    dispatch('close');
    clear();
  }
</script>

{#if show}
  <div class="signature-modal" on:click={close} role="presentation">
    <div class="signature-container" on:click|stopPropagation role="dialog">
      <h3>Add Signature</h3>

      <div class="mode-toggle">
        <button
          class:active={mode === 'draw'}
          on:click={() => { mode = 'draw'; clear(); }}
          type="button"
        >
          Draw
        </button>
        <button
          class:active={mode === 'type'}
          on:click={() => { mode = 'type'; clear(); }}
          type="button"
        >
          Type
        </button>
      </div>

      {#if mode === 'draw'}
        <canvas
          bind:this={canvas}
          width="500"
          height="200"
          on:mousedown={startDrawing}
          on:mousemove={draw}
          on:mouseup={stopDrawing}
          on:mouseleave={stopDrawing}
        ></canvas>
      {:else}
        <div class="type-mode">
          <input
            type="text"
            bind:value={typedName}
            placeholder="Type your name"
            class="signature-input"
            style="font-family: '{selectedFont}', cursive;"
          />
          <div class="font-selector">
            <label>Font:</label>
            <select bind:value={selectedFont}>
              {#each signatureFonts as font}
                <option value={font}>{font}</option>
              {/each}
            </select>
          </div>
          <div class="signature-preview" style="font-family: '{selectedFont}', cursive;">
            {typedName || 'Preview'}
          </div>
        </div>
      {/if}

      <div class="signature-actions">
        <button class="clear-btn" on:click={clear} type="button">Clear</button>
        <button class="cancel-btn" on:click={close} type="button">Cancel</button>
        <button
          class="save-btn"
          on:click={save}
          type="button"
          disabled={mode === 'draw' ? false : !typedName}
        >
          Save & Place
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .signature-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .signature-container {
    background: #fff;
    border: 2px solid #000;
    padding: 24px;
    max-width: 600px;
    width: 90%;
  }

  h3 {
    margin: 0 0 16px 0;
    font-size: 20px;
    color: #000;
    font-weight: 500;
  }

  .mode-toggle {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .mode-toggle button {
    flex: 1;
    padding: 8px 16px;
    border: 2px solid #000;
    background: #fff;
    color: #000;
    cursor: pointer;
    font-size: 14px;
  }

  .mode-toggle button:hover {
    background: #f5f5f5;
  }

  .mode-toggle button.active {
    background: #000;
    color: #fff;
  }

  canvas {
    border: 2px solid #000;
    cursor: crosshair;
    display: block;
    width: 100%;
    background: #fff;
  }

  .type-mode {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .signature-input {
    width: 100%;
    padding: 12px;
    border: 2px solid #000;
    font-size: 32px;
    background: #fff;
    color: #000;
    box-sizing: border-box;
  }

  .font-selector {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .font-selector label {
    font-size: 14px;
    color: #000;
  }

  .font-selector select {
    flex: 1;
    padding: 8px;
    border: 2px solid #000;
    font-size: 14px;
    background: #fff;
    color: #000;
  }

  .signature-preview {
    padding: 24px;
    border: 2px solid #000;
    background: #fff;
    font-size: 48px;
    text-align: center;
    min-height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .signature-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    justify-content: flex-end;
  }

  .signature-actions button {
    padding: 8px 16px;
    border: 2px solid #000;
    background: #fff;
    color: #000;
    cursor: pointer;
    font-size: 14px;
  }

  .signature-actions button:hover:not(:disabled) {
    background: #f5f5f5;
  }

  .signature-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .save-btn {
    background: #000;
    color: #fff;
  }

  .save-btn:hover:not(:disabled) {
    background: #333;
  }

  .clear-btn {
    margin-right: auto;
  }
</style>
