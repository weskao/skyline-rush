export const GT_EARNED_STARS = { coast: 3, neon: 3, canyon: 3, aurora: 3, spiral: 3, taipei: 3 };

export async function seedGtCareer(page) {
  await page.addInitScript(stars => {
    if (localStorage.getItem('skyline-rush-stars') === null)
      localStorage.setItem('skyline-rush-stars', JSON.stringify(stars));
  }, GT_EARNED_STARS);
}
