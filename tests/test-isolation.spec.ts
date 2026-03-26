import { test, expect, chromium } from '@playwright/test';

test.describe('Quran Typing - User State Isolation', () => {
  let browser, page;
  
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test.beforeEach(async () => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Anonymous mode isolated from signed-in mode', async () => {
    await page.goto('http://localhost:3000');
    
    // Simulate some anonymous progress by directly configuring its scoped localStorage 
    // Testing the UI rendering engine bounding
    await page.evaluate(() => {
      localStorage.setItem('quran_typing_anon_progress_stats', JSON.stringify({ '1': { highestIndexReached: 5 } }));
      localStorage.setItem('quran_typing_anon_surah', '1');
    });

    // Refresh to check anon persists
    await page.reload();
    let index = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('quran_typing_anon_progress_stats') || '{}')['1']?.highestIndexReached;
    });
    expect(index).toBe(5);

    // Register User A
    await page.evaluate(async () => {
      const resp = await fetch('/api/auth', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({action:'register', email:'a@test.com', password:'password'})});
      const data = await resp.json();
      localStorage.setItem('quran_typing_active_user_id', data.user.id);
    });

    // The component remounts immediately since we hit the DOM via standard interaction (Wait, test didn't click Auth UI)
    // We'll just reload the page as if auth changed.
    await page.reload();

    // Check that we no longer see anon stats under User A
    let userAProgress = await page.evaluate(() => {
      const activeId = localStorage.getItem('quran_typing_active_user_id');
      const data = localStorage.getItem(`quran_typing_user_${activeId}_progress_stats`);
      return data ? JSON.parse(data)['1']?.highestIndexReached : null;
    });
    expect(userAProgress).toBeUndefined(); // User A shouldn't have inherited anon data silently unless sync-manager pushed it (wait, sync manager pushes local to cloud on fresh account!)
  });

  test('Signed-in account isolation (A vs B)', async () => {
    await page.goto('http://localhost:3000');
    // We do explicit UI clicks to mock actual flow
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', 'u1@test.com');
    await page.fill('input[type="password"]', 'password');
    // Make sure we click Sign Up since it's a new account
    await page.click('text=Sign up');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Now logged in as u1. Set some progress.
    await page.evaluate(() => {
      const activeId = localStorage.getItem('quran_typing_active_user_id');
      localStorage.setItem(`quran_typing_user_${activeId}_progress_stats`, JSON.stringify({ '2': { highestIndexReached: 10 } }));
      localStorage.setItem(`quran_typing_user_${activeId}_surah`, '2');
    });

    // Sign out
    page.on('dialog', dialog => dialog.accept());
    await page.click('button[title="Sign Out"]');
    await page.waitForTimeout(1000);

    // Register u2
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', 'u2@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('text=Sign up');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Verify u2 does not have u1's progress
    let u2Progress = await page.evaluate(() => {
      const activeId = localStorage.getItem('quran_typing_active_user_id');
      const data = localStorage.getItem(`quran_typing_user_${activeId}_progress_stats`);
      return data ? JSON.parse(data)['2']?.highestIndexReached : null;
    });
    expect(u2Progress).toBeUndefined();

    // Sign out u2
    await page.click('button[title="Sign Out"]');
    await page.waitForTimeout(1000);

    // Sign back into u1
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', 'u1@test.com');
    await page.fill('input[type="password"]', 'password');
    // It says "Have an account? Sign in" => We need to click "Sign in"
    // Wait, by default it IS login
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Verify u1 progress is restored seamlessly via Cloud Pull
    let restoredProgress = await page.evaluate(() => {
      const activeId = localStorage.getItem('quran_typing_active_user_id');
      const data = localStorage.getItem(`quran_typing_user_${activeId}_progress_stats`);
      return data ? JSON.parse(data)['2']?.highestIndexReached : null;
    });
    expect(restoredProgress).toBe(10);
  });
});
