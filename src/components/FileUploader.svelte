<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  let isDragging = false;

  function handleDragOver(event) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  async function handleDrop(event) {
    event.preventDefault();
    isDragging = false;

    const files = Array.from(event.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );

    if (files.length > 0) {
      processFiles(files);
    }
  }

  async function handleFileInput(event) {
    const files = Array.from(event.target.files);
    processFiles(files);
  }

  async function processFiles(files) {
    const filePromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            name: file.name,
            arrayBuffer: e.target.result
          });
        };
        reader.readAsArrayBuffer(file);
      });
    });

    const loadedFiles = await Promise.all(filePromises);
    dispatch('filesloaded', { files: loadedFiles });
  }
</script>

<div
  class="uploader"
  class:dragging={isDragging}
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
>
  <div class="uploader-content">
    <p>Drop PDF files here or</p>
    <label for="file-input" class="file-label">
      Choose Files
    </label>
    <input
      id="file-input"
      type="file"
      accept="application/pdf"
      multiple
      on:change={handleFileInput}
    />
  </div>
</div>

<style>
  .uploader {
    border: 2px solid #000;
    padding: 40px;
    text-align: center;
    background: #fff;
    transition: background 0.2s;
    cursor: pointer;
  }

  .uploader.dragging {
    background: #f5f5f5;
  }

  .uploader-content p {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #000;
  }

  .file-label {
    display: inline-block;
    padding: 8px 16px;
    border: 2px solid #000;
    background: #fff;
    color: #000;
    cursor: pointer;
    font-size: 14px;
  }

  .file-label:hover {
    background: #000;
    color: #fff;
  }

  input[type="file"] {
    display: none;
  }
</style>
