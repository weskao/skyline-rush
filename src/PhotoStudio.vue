<script setup lang="ts">
// Photo Studio dialog markup; photo-ui.ts wires its controls and capture.
</script>

<template>
  <dialog id="photo-screen" class="photo-screen" aria-labelledby="photo-title">
    <div class="photo-panel">
      <div class="photo-tools">
        <h2 id="photo-title" data-i18n="photo.title">PHOTO STUDIO</h2>
        <label><span data-i18n="photo.orbit">Camera orbit</span>
          <input id="photo-orbit" type="range" min="0" max="360" step="15" value="30"></label>
        <details id="photo-advanced">
          <summary data-i18n="photo.tools">Advanced tools</summary>
          <label><span data-i18n="photo.fov">Field of view</span>
            <input id="photo-fov" type="range" min="35" max="85" value="58"></label>
          <label><span data-i18n="photo.sky">Photo lighting</span>
            <select id="photo-sky"><option value="original" data-i18n="photo.original">Original</option>
              <option value="sunset" data-i18n="photo.sunset">Sunset</option>
              <option value="night" data-i18n="photo.night">Night</option>
              <option value="fog" data-i18n="photo.fog">Fog</option></select></label>
        </details>
        <p id="photo-status" role="status" data-i18n="photo.status">This photo stays on your device.</p>
      </div>
      <div class="photo-actions"><button type="button" id="photo-close" data-i18n="photo.close">BACK</button>
        <button type="button" id="photo-save" data-i18n="photo.save">SAVE PNG</button></div>
    </div>
  </dialog>
</template>
