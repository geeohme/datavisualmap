import { test, expect } from '@playwright/test'

test('create project, import CSVs, make a mapping, confirm it, reload', async ({ page }) => {
  await page.goto('/projects')
  await page.getByRole('button', { name: /new project/i }).click()
  await page.getByPlaceholder('Project name').fill('Smoke Test Project')
  await page.getByRole('button', { name: /^create$/i }).click()
  await expect(page.getByText('Smoke Test Project').first()).toBeVisible()

  // Source container via CSV
  await page.getByRole('button', { name: /\+ add container/i }).click()
  await page.getByRole('button', { name: /paste csv/i }).click()
  await page.getByLabel('Container name').fill('Customers')
  await page.getByLabel('CSV').fill('first_name,last_name')
  await page.getByRole('button', { name: /^import$/i }).click()

  // Target container via CSV
  await page.getByRole('button', { name: /\+ add container/i }).click()
  await page.getByRole('button', { name: /paste csv/i }).click()
  await page.getByLabel('Container name').fill('People')
  await page.locator('form select').first().selectOption('target')
  await page.getByLabel('CSV').fill('full_name')
  await page.getByRole('button', { name: /^import$/i }).click()

  // Create mapping via React Flow handle drag.
  // Use specific containers to avoid picking handles in the wrong node.
  const customersNode = page.locator('.react-flow__node', { hasText: 'Customers' })
  const peopleNode = page.locator('.react-flow__node', { hasText: 'People' })
  const source = customersNode.locator('[data-handleid$="-s"]').first()
  const target = peopleNode.locator('[data-handleid$="-t"]').first()
  const sb = await source.boundingBox()
  const tb = await target.boundingBox()
  if (!sb || !tb) throw new Error('handles not found')
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2)
  await page.mouse.down()
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 15 })
  await page.mouse.up()

  // Dismiss any context/menu overlay before clicking the edge
  await page.keyboard.press('Escape')
  await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } })
  // Wait for the new edge to land (after invalidation roundtrip)
  await expect(page.locator('.react-flow__edge')).toHaveCount(1, { timeout: 10_000 })
  // React Flow renders edges in a coordinate space that may not match the
  // browser viewport. dispatchEvent bypasses Playwright's viewport check.
  await page.locator('.react-flow__edge').first().dispatchEvent('click')
  await expect(page.getByRole('button', { name: /^confirm$/i })).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: /^confirm$/i }).click()
  await expect(page.getByRole('button', { name: /confirmed/i })).toBeVisible()

  await page.reload()
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)
})
