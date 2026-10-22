import test from 'node:test';
import assert from 'node:assert/strict';
import { selectDeviceQuality,initialDeviceVisuals,noticeMessage,DEVICE_NOTICE_KEY } from '../src/device-quality.js';
import { UI } from '../src/locales/ui.js';
test('unknown or powerful devices keep high fidelity',()=>{
 assert.equal(selectDeviceQuality({}), 'high');
 assert.equal(selectDeviceQuality({cores:10,memoryGiB:16,width:2560,height:1600,pixelRatio:2}),'high');
});
test('constrained devices get medium/low without treating every touchscreen as weak',()=>{
 assert.equal(selectDeviceQuality({cores:2,memoryGiB:2,width:390,height:844,pixelRatio:3}),'low');
 assert.equal(selectDeviceQuality({cores:4,memoryGiB:4,width:390,height:844,pixelRatio:3}),'medium');
 assert.equal(selectDeviceQuality({cores:8,memoryGiB:8,width:390,height:844,pixelRatio:3}),'high');
});
test('existing user preferences beat automatic configuration',()=>{
 const saved=initialDeviceVisuals({storedSettings:{quality:'high',preset:'extreme'},device:{cores:2,memoryGiB:2}});
 assert.equal(saved.settings.quality,'high');
 assert.equal(saved.settings.preset,'extreme');
 assert.equal(saved.downgraded,false);
 const automatic=initialDeviceVisuals({device:{cores:2,memoryGiB:2}});
 assert.equal(automatic.settings.quality,'low');
 assert.equal(automatic.downgraded,true);
 assert.equal(automatic.settings.preset,'realistic');
});
test('one-time notice has English and traditional Chinese translations and a stable storage key',()=>{
 assert.match(DEVICE_NOTICE_KEY,/skyline-rush/);
 assert.match(noticeMessage('zh-TW','medium').body,/中/);
 assert.match(noticeMessage('en','low').body,/Low/);
 assert.equal(noticeMessage('fr','low').title,noticeMessage('en','low').title);
});

test('the notice names the VFX panel exactly as its toolbar button reads in each language',()=>{
 // zh-TW once said "VFX 設定" while the button reads 特效, leaving stray English in a Chinese sentence.
 for (const locale of ['en','zh-TW']) for (const quality of ['low','medium'])
  assert.ok(noticeMessage(locale,quality).body.includes(UI[locale]['vfx.summary']),`${locale} ${quality}`);
 assert.doesNotMatch(noticeMessage('zh-TW','medium').body,/[A-Za-z]/);
});

test('Safari on macOS and iOS works without navigator.deviceMemory',()=>{
 // Safari generally omits navigator.deviceMemory; availability is optional.
 const modernIOS=initialDeviceVisuals({device:{cores:8,width:393,height:852,pixelRatio:3}});
 assert.equal(modernIOS.settings.quality,'high');
 assert.equal(modernIOS.automatic,true);
 const olderIOS=initialDeviceVisuals({device:{cores:2,width:375,height:667,pixelRatio:2}});
 assert.equal(olderIOS.settings.quality,'low');
 const unknownMac=initialDeviceVisuals({device:{width:1512,height:982,pixelRatio:2}});
 assert.equal(unknownMac.settings.quality,'high');
});
test('Windows/Android Chromium with memory hints and missing hardware fields fall back safely',()=>{
 assert.equal(selectDeviceQuality({cores:4,memoryGiB:4,width:1280,height:800,pixelRatio:1.25}),'medium');
 assert.equal(selectDeviceQuality({cores:2,memoryGiB:2,width:412,height:915,pixelRatio:3}),'low');
 assert.equal(selectDeviceQuality({width:1280,height:720,pixelRatio:1}),'high');
});
