import puppeteer from "puppeteer";

export async function facebookDownloader(url: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto(url);
  const dataStore = (await page.$eval(
    'div[data-sigil="inlineVideo"]',
    (video) => JSON.parse(video.getAttribute("data-store"))
  )) as any;
  await browser.close();
  return dataStore?.src;
}
