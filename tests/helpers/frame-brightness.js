// Mean RGB of the rendered canvas; a NaN-poisoned frame comes back near-black.
export const brightness = async page => page.evaluate(async b64 => {
  const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
  const context = new OffscreenCanvas(image.width, image.height).getContext('2d');
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, image.width, image.height).data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) sum += data[i] + data[i + 1] + data[i + 2];
  return sum / (data.length / 4) / 3;
}, (await page.locator('#world').screenshot()).toString('base64'));
