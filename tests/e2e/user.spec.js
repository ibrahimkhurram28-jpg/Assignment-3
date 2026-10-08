import { test, expect } from "@playwright/test";

// User use case: a teacher opens and downloads activities generated from the
// stored data, and the generations are counted in the metrics.
// The data is created through the API in beforeAll and removed in afterAll.

const stamp = Date.now();
const WORDS = [
  ["cat", "k æ t", "A pet that purrs"],
  ["ship", "ʃ ɪ p", "It sails"],
  ["fish", "f ɪ ʃ", "It swims"],
];

let list;
let wordle;
let search;

async function data(response) {
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data;
}

test.describe("user use case: generate and view activities", () => {
  test.beforeAll(async ({ request }) => {
    list = await data(await request.post("/api/word-lists", { data: { name: `E2E user list ${stamp}` } }));
    const wordIds = [];
    for (const [english, phonemes, hint] of WORDS) {
      const word = await data(await request.post(`/api/word-lists/${list.id}/words`, { data: { english, phonemes, hint } }));
      wordIds.push(word.id);
    }
    wordle = await data(
      await request.post("/api/activities", {
        data: { name: `E2E Wordle ${stamp}`, type: "WORDLE", difficulty: "MEDIUM", maxGuesses: 6, title: "E2E Wordle Title", fileName: "e2e-wordle", wordListId: list.id, wordIds },
      })
    );
    search = await data(
      await request.post("/api/activities", {
        data: { name: `E2E Search ${stamp}`, type: "WORD_SEARCH", difficulty: "MEDIUM", gridSize: 10, allowDiagonal: true, allowBackwards: false, title: "E2E Search Title", fileName: "e2e-word-search", wordListId: list.id, wordIds },
      })
    );
  });

  test.afterAll(async ({ request }) => {
    if (list) await request.delete(`/api/word-lists/${list.id}`);
  });

  test("opens a Wordle activity generated from the stored word list", async ({ page }) => {
    await page.goto("/activities");
    const row = page.getByRole("row", { name: new RegExp(wordle.name) });
    await expect(row).toBeVisible();

    const [popup] = await Promise.all([page.waitForEvent("popup"), row.getByRole("link", { name: "Open" }).click()]);
    await popup.waitForLoadState();
    await expect(popup).toHaveTitle(/E2E Wordle Title/);
  });

  test("downloads a Word Search activity as an HTML file", async ({ page }) => {
    await page.goto("/activities");
    const row = page.getByRole("row", { name: new RegExp(search.name) });
    await expect(row).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent("download"), row.getByRole("button", { name: "Download" }).click()]);
    expect(download.suggestedFilename()).toBe("e2e-word-search.html");
    await expect(page.getByText("Downloaded e2e-word-search.html")).toBeVisible();
  });

  test("shows a saved Wordle in the builder preview", async ({ page }) => {
    await page.goto(`/wordle?activity=${wordle.id}`);
    await expect(page.locator("#activityName")).toHaveValue(wordle.name);
    await expect(page.getByRole("region", { name: "Live preview" })).toBeVisible();
  });

  test("each generation is counted in the database-backed metrics", async ({ request }) => {
    const before = (await data(await request.get("/api/metrics"))).generation.success;
    const generated = await request.get(`/api/activities/${wordle.id}/generate`);
    expect(generated.status()).toBe(200);
    expect(generated.headers()["content-type"]).toContain("text/html");
    const after = (await data(await request.get("/api/metrics"))).generation.success;
    expect(after).toBe(before + 1);
  });
});
