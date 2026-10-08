import { test, expect } from "@playwright/test";

// Builder use case: a teacher manages a word list (create, read, update,
// delete), saves a Wordle configuration that uses it, and removes everything.

const stamp = Date.now();
const listName = `E2E list ${stamp}`;
const activityName = `E2E Wordle ${stamp}`;

test("builder: CRUD for a word list, its words and a saved activity configuration", async ({ page }) => {
  // Create the word list.
  await page.goto("/word-lists");
  await page.locator("#newListName").fill(listName);
  await page.getByRole("button", { name: "Create list" }).click();
  await expect(page.getByRole("heading", { level: 2, name: listName })).toBeVisible();

  // Create two words.
  const addWord = page.getByRole("form", { name: "Add word" });
  async function add(english, phonemes, clue) {
    await addWord.getByLabel("English word", { exact: true }).fill(english);
    await addWord.getByLabel("Phonemes", { exact: true }).fill(phonemes);
    await addWord.getByLabel("Clue (optional)", { exact: true }).fill(clue);
    await addWord.getByRole("button", { name: "Add word" }).click();
    await expect(page.getByText(`Added "${english}"`)).toBeVisible();
  }
  await add("chair", "tʃ eə", "You sit on it");
  await add("ship", "ʃ ɪ p", "It sails");
  await expect(page.getByRole("row", { name: /chair/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /ship/ })).toBeVisible();

  // Update a word.
  await page.getByRole("row", { name: /chair/ }).getByRole("button", { name: "Edit" }).click();
  const editWord = page.getByRole("form", { name: "Edit chair" });
  await editWord.getByLabel("Clue", { exact: true }).fill("Where you sit");
  await editWord.getByRole("button", { name: "Save word" }).click();
  await expect(page.getByText('Updated "chair"')).toBeVisible();
  await expect(page.getByRole("row", { name: /chair/ })).toContainText("Where you sit");

  // Delete a word.
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("row", { name: /ship/ }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText('Deleted "ship"')).toBeVisible();
  await expect(page.getByRole("row", { name: /ship/ })).toHaveCount(0);

  // Save a Wordle configuration that uses the list.
  await page.goto("/wordle");
  await expect(page.locator("#wordList")).toBeVisible();
  const listValue = await page.locator("#wordList option", { hasText: listName }).getAttribute("value");
  await page.locator("#wordList").selectOption(listValue);
  await page.getByRole("checkbox", { name: /chair/ }).check();
  await page.locator("#activityName").fill(activityName);
  await page.getByRole("button", { name: "Save activity" }).click();
  await expect(page.getByText(`Saved "${activityName}"`)).toBeVisible();

  // The saved configuration comes back from the database after a reload.
  await page.reload();
  await expect(page.locator("#activityName")).toHaveValue(activityName);
  await expect(page.getByRole("checkbox", { name: /chair/ })).toBeChecked();

  // It appears in the activity library, and can be deleted.
  await page.goto("/activities");
  const row = page.getByRole("row", { name: new RegExp(activityName) });
  await expect(row).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(`Deleted "${activityName}"`)).toBeVisible();

  // Clean up: delete the word list.
  await page.goto("/word-lists");
  await page.getByRole("navigation", { name: "Word lists" }).getByRole("button", { name: new RegExp(listName) }).click();
  await expect(page.getByRole("heading", { level: 2, name: listName })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete list" }).click();
  await expect(page.getByText(`Deleted "${listName}"`)).toBeVisible();
});
