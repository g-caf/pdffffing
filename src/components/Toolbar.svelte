<script>
  import { createEventDispatcher } from 'svelte';

  export let hasFiles = false;
  export let isViewing = false;

  const dispatch = createEventDispatcher();

  function handleDownload() {
    dispatch('download');
  }

  function handleClear() {
    dispatch('clear');
  }
</script>

<div class="toolbar">
  <h1 class:clickable={hasFiles} on:click={handleClear} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && handleClear()}>PDF Editor</h1>
  <div class="actions">
    {#if isViewing}
      <button on:click={handleDownload}>
        Download PDF
      </button>
    {/if}
    <button on:click={handleClear} disabled={!hasFiles}>
      Clear All
    </button>
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 2px solid #000;
    background: #fff;
    gap: 16px;
    flex-wrap: wrap;
  }

  h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #000;
    flex-shrink: 0;
  }

  h1.clickable {
    cursor: pointer;
    transition: opacity 0.15s ease;
  }

  h1.clickable:hover {
    opacity: 0.6;
  }

  .actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  button {
    padding: 6px 12px;
    border: 2px solid #000;
    background: #fff;
    color: #000;
    cursor: pointer;
    font-size: 12px;
    white-space: nowrap;
  }

  button:hover:not(:disabled) {
    background: #000;
    color: #fff;
  }

  button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>
