import { test, expect } from "@playwright/test";

const stamp = Date.now();

async function data(response) {
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data;
}

test("health check returns 200 OK", async ({ request }) => {
  const response = await request.get("/health");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.status).toBe("ok");
  expect(body.database.status).toBe("connected");
});

test("dashboard shows health, statistics and alerts, and simulated records change the counts", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(page.getByTestId("health-status")).toHaveText(/Healthy/);
  await expect(page.getByTestId("health-http")).toHaveText("200 OK");
  await expect(page.getByTestId("alert-counts")).toBeVisible();

  const value = (id) => page.getByTestId(`stat-${id}`).locator("dd").first();
  for (const id of ["activities-created", "successful-generations", "failed-generations", "avg-time-on-page", "most-used-type"]) {
    await expect(page.getByTestId(`stat-${id}`)).toBeVisible();
  }

  await expect(value("successful-generations")).toHaveText(/^\d+$/);
  const before = Number(await value("successful-generations").innerText());

  await page.getByRole("button", { name: "Add simulated data" }).click();
  await expect(page.getByText(/Added \d+ simulated activities/)).toBeVisible();
  await expect.poll(async () => Number(await value("successful-generations").innerText())).toBeGreaterThan(before);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear simulated data" }).click();
  await expect(page.getByText(/Removed \d+ simulated activities/)).toBeVisible();
});

test("a failed generation is counted and raises an alert", async ({ page, request }) => {
  // An activity whose only word is deleted can no longer be generated.
  const list = await data(await request.post("/api/word-lists", { data: { name: `E2E alert list ${stamp}` } }));
  try {
    const word = await data(await request.post(`/api/word-lists/${list.id}/words`, { data: { english: "dog", phonemes: "d ɒ g" } }));
    const activity = await data(
      await request.post("/api/activities", {
        data: { name: `E2E broken ${stamp}`, type: "WORDLE", maxGuesses: 6, title: "Broken", wordListId: list.id, wordIds: [word.id] },
      })
    );
    expect((await request.delete(`/api/words/${word.id}`)).ok()).toBeTruthy();

    const before = (await data(await request.get("/api/metrics"))).generation.failed;
    const failed = await request.get(`/api/activities/${activity.id}/generate`);
    expect(failed.status()).toBe(422);
    const after = (await data(await request.get("/api/metrics"))).generation.failed;
    expect(after).toBe(before + 1);

    const alerts = await data(await request.get("/api/alerts"));
    expect(alerts.alerts.some((a) => a.id === `activity-empty-${activity.id}`)).toBeTruthy();

    await page.goto("/dashboard");
    await expect(page.getByTestId(`alert-activity-empty-${activity.id}`)).toContainText("has no words");
  } finally {
    await request.delete(`/api/word-lists/${list.id}`);
  }
});

test("reports page lists generations and the CSV export downloads", async ({ page, request }) => {
  await page.goto("/reports");
  await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Generation history" })).toBeVisible();

  const csv = await request.get("/api/reports/generations/csv");
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("Generated at (UTC),Activity,Type,Kind,Status");
});
