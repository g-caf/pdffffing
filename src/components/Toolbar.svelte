<script>
  import { createEventDispatcher } from 'svelte';

  export let hasFiles = false;

  const dispatch = createEventDispatcher();

  function handleMerge() {
    dispatch('merge');
  }

  function handleDownload() {
    dispatch('download');
  }

  function handleClear() {
    dispatch('clear');
  }
</script>

<div class="toolbar">
  <h1>PDF Editor</h1>
  <div class="actions">
    <button on:click={handleMerge} disabled={!hasFiles}>
      Merge PDFs
    </button>
    <button on:click={handleDownload} disabled={!hasFiles}>
      Download PDF
    </button>
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
