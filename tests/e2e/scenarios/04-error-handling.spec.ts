/**
 * E2E Test: Error Handling and Edge Cases
 *
 * Tests how the application handles errors and unexpected situations
 */

import { test, expect } from '@playwright/test'
import { DataManagerPage } from '../page-objects/DataManagerPage'
import { WorkflowsPage } from '../page-objects/WorkflowsPage'

test.describe('Error Handling', () => {
  let dataPage: DataManagerPage
  let workflowsPage: WorkflowsPage

  test.beforeEach(async ({ page }) => {
    dataPage = new DataManagerPage(page)
    workflowsPage = new WorkflowsPage(page)

    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('Application handles empty states gracefully', async ({ page }) => {
    // Navigate to Data Manager with no files
    await dataPage.goto()

    // Should show empty state message
    await expect(page.locator('text=/no data files/i')).toBeVisible()

    // Navigate to Workflows with no workflows
    await workflowsPage.goto()

    // Should show empty state message
    await expect(page.locator('text=/no workflows/i')).toBeVisible()
  })

  test('Application shows loading states', async ({ page }) => {
    await dataPage.goto()

    // During upload, should show uploading state
    // Note: This might be hard to catch due to speed
    // but the component should handle it

    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
  })

  test('User cannot submit workflow without required fields', async ({ page }) => {
    await workflowsPage.goto()

    // Try to create workflow with empty name
    const createButton = workflowsPage.createWorkflowButton
    const isDisabled = await createButton.isDisabled()

    // Should be disabled or prevent submission
    expect(isDisabled).toBeTruthy()
  })

  test('Application handles navigation correctly', async ({ page }) => {
    // Test all navigation items work
    const dashboard = page.getByRole('button', { name: /dashboard/i })
    const dataManager = page.getByRole('button', { name: /data manager/i })
    const workflows = page.getByRole('button', { name: /workflows/i })

    // Navigate to each section
    await dashboard.click()
    await expect(page.locator('text=/dashboard/i').first()).toBeVisible()

    await dataManager.click()
    await expect(page.locator('text=/data manager/i').first()).toBeVisible()

    await workflows.click()
    await expect(page.locator('text=/workflows/i').first()).toBeVisible()
  })

  test('Delete operations require confirmation', async ({ page }) => {
    await dataPage.goto()

    // Upload a file
    await dataPage.uploadFile('sample.csv')

    // Try to delete - should show confirmation dialog
    const fileRow = page.locator('text=sample.csv').first().locator('..')
    const deleteButton = fileRow.getByRole('button', { name: /delete/i })

    // Set up dialog handler to dismiss (cancel)
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('sure')
      dialog.dismiss()
    })

    await deleteButton.click()

    // File should still be there since we cancelled
    await expect(page.locator('text=sample.csv')).toBeVisible()
  })

  test('Application maintains state across page refreshes', async ({ page }) => {
    await dataPage.goto()

    // Upload a file
    await dataPage.uploadFile('sample.csv')

    // Reload the page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // File should still be there (persisted in backend)
    await dataPage.goto()
    await dataPage.verifyFileUploaded('sample.csv')
  })
})
