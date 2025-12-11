<script>
  export let fields = [];
  export let pageWidth = 0;
  export let pageHeight = 0;
  export let scale = 1.5;

  let fieldValues = {};

  $: {
    fields.forEach(field => {
      if (!(field.id in fieldValues)) {
        fieldValues[field.id] = field.type === 'checkbox' ? !!field.value : (field.value || '');
      }
    });
  }

  $: groupedRadios = fields
    .filter(f => f.type === 'radio')
    .reduce((acc, field) => {
      if (!acc[field.name]) acc[field.name] = [];
      acc[field.name].push(field);
      return acc;
    }, {});

  export function getFieldValues() {
    const result = {};
    fields.forEach(field => {
      result[field.name] = fieldValues[field.id];
    });
    return result;
  }

  function isMultiLine(field) {
    return field.rect && (field.rect.height / scale) > 30;
  }
</script>

<div
  class="form-field-overlay"
  style="width: {pageWidth}px; height: {pageHeight}px;"
>
  {#each fields as field (field.id)}
    {#if field.type === 'text'}
      <div
        class="field-wrapper"
        class:required={field.required}
        style="
          left: {field.rect.x}px;
          top: {field.rect.y}px;
          width: {field.rect.width}px;
          height: {field.rect.height}px;
        "
      >
        {#if field.required}
          <span class="required-indicator">*</span>
        {/if}
        {#if isMultiLine(field)}
          <textarea
            bind:value={fieldValues[field.id]}
            disabled={field.readOnly}
            placeholder={field.name}
            class:readonly={field.readOnly}
          ></textarea>
        {:else}
          <input
            type="text"
            bind:value={fieldValues[field.id]}
            disabled={field.readOnly}
            placeholder={field.name}
            class:readonly={field.readOnly}
          />
        {/if}
      </div>
    {:else if field.type === 'checkbox'}
      <div
        class="field-wrapper checkbox-wrapper"
        class:required={field.required}
        style="
          left: {field.rect.x}px;
          top: {field.rect.y}px;
          width: {field.rect.width}px;
          height: {field.rect.height}px;
        "
      >
        {#if field.required}
          <span class="required-indicator">*</span>
        {/if}
        <input
          type="checkbox"
          bind:checked={fieldValues[field.id]}
          disabled={field.readOnly}
          class:readonly={field.readOnly}
        />
      </div>
    {:else if field.type === 'dropdown'}
      <div
        class="field-wrapper"
        class:required={field.required}
        style="
          left: {field.rect.x}px;
          top: {field.rect.y}px;
          width: {field.rect.width}px;
          height: {field.rect.height}px;
        "
      >
        {#if field.required}
          <span class="required-indicator">*</span>
        {/if}
        <select
          bind:value={fieldValues[field.id]}
          disabled={field.readOnly}
          class:readonly={field.readOnly}
        >
          <option value="">Select...</option>
          {#each field.options || [] as option}
            <option value={option}>{option}</option>
          {/each}
        </select>
      </div>
    {:else if field.type === 'radio'}
      <div
        class="field-wrapper radio-wrapper"
        class:required={field.required}
        style="
          left: {field.rect.x}px;
          top: {field.rect.y}px;
          width: {field.rect.width}px;
          height: {field.rect.height}px;
        "
      >
        {#if field.required}
          <span class="required-indicator">*</span>
        {/if}
        <input
          type="radio"
          name={field.name}
          value={field.id}
          checked={fieldValues[field.id]}
          on:change={() => {
            groupedRadios[field.name]?.forEach(f => {
              fieldValues[f.id] = f.id === field.id;
            });
          }}
          disabled={field.readOnly}
          class:readonly={field.readOnly}
        />
      </div>
    {/if}
  {/each}
</div>

<style>
  .form-field-overlay {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 10;
  }

  .field-wrapper {
    position: absolute;
    pointer-events: auto;
  }

  .field-wrapper.required {
    position: absolute;
  }

  .required-indicator {
    position: absolute;
    top: -2px;
    right: -8px;
    color: #ff0000;
    font-size: 14px;
    font-weight: bold;
    pointer-events: none;
    z-index: 1;
  }

  .field-wrapper input[type="text"],
  .field-wrapper textarea,
  .field-wrapper select {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.7);
    border: 1px solid transparent;
    font-family: sans-serif;
    font-size: 12px;
    padding: 2px 4px;
    outline: none;
    resize: none;
  }

  .field-wrapper input[type="text"]:focus,
  .field-wrapper textarea:focus,
  .field-wrapper select:focus {
    border: 2px solid #000;
    background: rgba(255, 255, 255, 0.9);
  }

  .field-wrapper.required input[type="text"],
  .field-wrapper.required textarea,
  .field-wrapper.required select {
    border: 1px solid #ff0000;
  }

  .field-wrapper.required input[type="text"]:focus,
  .field-wrapper.required textarea:focus,
  .field-wrapper.required select:focus {
    border: 2px solid #000;
  }

  .checkbox-wrapper,
  .radio-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .field-wrapper input[type="checkbox"],
  .field-wrapper input[type="radio"] {
    width: 16px;
    height: 16px;
    margin: 0;
    cursor: pointer;
    accent-color: #000;
  }

  .field-wrapper.required input[type="checkbox"],
  .field-wrapper.required input[type="radio"] {
    outline: 2px solid #ff0000;
    outline-offset: 2px;
  }

  .readonly {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .field-wrapper input:disabled,
  .field-wrapper textarea:disabled,
  .field-wrapper select:disabled {
    background: rgba(200, 200, 200, 0.5);
    cursor: not-allowed;
  }
</style>
