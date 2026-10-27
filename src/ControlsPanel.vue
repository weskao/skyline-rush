<script setup lang="ts">
import { icons, ICON_ATTRS } from './icons.ts';
import { panelsView } from './control-panels-view-state.ts';
const CONTROL_CHOICES = {
  mode: ['Steering', [['buttons', 'Buttons'], ['slide', 'Slide'], ['tilt', 'Tilt']]],
  hand: ['Steering hand', [['left', 'Left'], ['right', 'Right']]],
  fullLock: ['Slide sensitivity', [[40, 'High'], [60, 'Medium'], [80, 'Low']]],
  size: ['Touch button size',[['S', 'Small'], ['M', 'Medium'], ['L', 'Large']]],
  flyMode: ['FLY button', [['hold', 'Hold'], ['toggle', 'Toggle']]],
};
</script>
<template>
      <div class="controls-menu">
        <button class="controls-button" id="controls-button" :aria-expanded="panelsView.controlsOpen" aria-controls="controls-panel" title="Driving controls" data-i18n-title="controls.title" data-i18n="controls.button">Controls</button>
        <div class="controls-panel" id="controls-panel" role="group" aria-label="Driving controls" data-i18n-aria-label="controls.title" :hidden="!panelsView.controlsOpen">
          <button class="controls-reset" id="guide-open" data-i18n="guide.open">How to play</button>
          <button class="controls-reset" id="tutorial-open" data-i18n="tutorial.start">Start interactive practice</button>
          <fieldset v-for="([legend, options], key) in CONTROL_CHOICES" class="controls-field"><legend :data-i18n="`controls.${key}`">{{ legend }}</legend><label v-for="[value, label] in options" class="controls-choice"><input type="radio" :name="`controls-${key}`" :data-controls="key" :value="value"><span :data-i18n="`controls.${key}.${value}`">{{ label }}</span></label></fieldset>
          <p id="tilt-status" role="status" class="controls-note" data-i18n="controls.tiltNote">Tilt asks permission only when selected. Hold your phone comfortably to set neutral.</p>
          <button id="tilt-enable" class="controls-reset" data-i18n="controls.tiltEnable" hidden>Enable / recenter tilt</button>
          <label class="ghost-setting"><input id="ghost-enabled" type="checkbox"><span data-i18n="controls.ghost">Show best-run ghost</span></label>
          <p id="ghost-status" class="controls-note">No best-run replay recorded yet.</p>
          <label class="controls-field controls-range"><span data-i18n="controls.opacity">Touch button opacity</span> <output for="controls-opacity"></output><input id="controls-opacity" aria-label="Touch button opacity" data-i18n-aria-label="controls.opacity" type="range" data-controls="opacity" min="0.4" max="1" step="0.05"></label>
          <div class="controls-preview" aria-hidden="true"><span class="controls-preview-label" data-i18n="controls.preview">Preview</span><span class="controls-preview-keys"><i class="touch-nitro"><svg v-bind="ICON_ATTRS" v-html="icons.nitro"></svg></i><i class="touch-fly"><svg v-bind="ICON_ATTRS" v-html="icons.fly"></svg></i><i class="touch-boost"><svg v-bind="ICON_ATTRS" v-html="icons.boost"></svg></i><i class="touch-gas"><svg v-bind="ICON_ATTRS" v-html="icons.pedal"></svg></i></span></div>
          <label class="controls-field controls-range"><span data-i18n="controls.sensitivity">Steering sensitivity</span> <output for="controls-sensitivity"></output><input id="controls-sensitivity" aria-label="Steering sensitivity" data-i18n-aria-label="controls.sensitivity" type="range" data-controls="sensitivity" min="0.4" max="1" step="0.1"></label>
          <fieldset class="controls-field keymap-field"><legend data-i18n="keymap.legend">Keyboard · select action, then press a key</legend><button v-for="action in ['throttle', 'brake', 'left', 'right', 'fly', 'boost', 'nitro']" class="keymap-binding" :data-rebind="action"><span :data-i18n="`keymap.${action}`">{{ action.toUpperCase() }}</span><b></b></button></fieldset>
          <p id="keymap-status" role="status" class="controls-note" data-i18n="keymap.fixed">Fixed shortcuts: Esc pause · Backspace restart · C camera.</p>
          <button class="controls-reset" id="keymap-reset" data-i18n="keymap.reset">Reset keyboard</button>
          <button class="controls-reset" id="layout-edit" data-i18n="layout.edit">Edit touch layout</button>
          <button class="controls-reset" id="layout-reset" data-i18n="layout.reset">Reset touch layout</button>
          <button class="controls-reset" id="controls-reset" data-i18n="controls.reset">Reset to defaults</button>
        </div>
      </div>
</template>
