/**
 * E2E Test: Data Loading User Flow
 *
 * Tests the complete user journey for uploading and managing data files
 */

import { test, expect } from '@playwright/test'
import { DataManagerPage } from '../page-objects/DataManagerPage'

test.describe('Data Loading Flow', () => {
  let dataPage: DataManagerPage

  test.beforeEach(async ({ page }) => {
    dataPage = new DataManagerPage(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('User can upload a CSV file', async ({ page }) => {
    // Navigate to Data Manager
    await dataPage.goto()

    // Upload a file
    await dataPage.uploadFile('sample.csv')

    // Verify file appears in the list
    await dataPage.verifyFileUploaded('sample.csv')

    // Verify file details are shown
    const fileCount = await dataPage.getFileCount()
    expect(fileCount).toBeGreaterThan(0)
  })

  test('User can upload multiple files', async ({ page }) => {
    await dataPage.goto()

    // Upload first file
    await dataPage.uploadFile('sample.csv')
    await dataPage.verifyFileUploaded('sample.csv')

    // Upload second file
    await dataPage.uploadFile('inventory.csv')
    await dataPage.verifyFileUploaded('inventory.csv')

    // Verify both files are in the list
    const fileCount = await dataPage.getFileCount()
    expect(fileCount).toBeGreaterThanOrEqual(2)
  })

  test('User can download an uploaded file', async ({ page }) => {
    await dataPage.goto()

    // Upload a file
    await dataPage.uploadFile('sample.csv')

    // Download the file
    const download = await dataPage.downloadFile('sample.csv')

    // Verify download was successful
    expect(download.suggestedFilename()).toBe('sample.csv')
  })

  test('User can delete an uploaded file', async ({ page }) => {
    await dataPage.goto()

    // Upload a file
    await dataPage.uploadFile('sample.csv')
    await dataPage.verifyFileUploaded('sample.csv')

    // Get initial count
    const initialCount = await dataPage.getFileCount()

    // Delete the file
    await dataPage.deleteFile('sample.csv')

    // Verify file count decreased
    const finalCount = await dataPage.getFileCount()
    expect(finalCount).toBeLessThan(initialCount)
  })

  test('User can view file metadata', async ({ page }) => {
    await dataPage.goto()

    // Upload a file
    await dataPage.uploadFile('sample.csv')

    // Verify file row contains metadata
    const fileRow = page.locator('text=sample.csv').first().locator('..')
    await expect(fileRow).toContainText(/KB/) // File size
    await expect(fileRow).toContainText(/\d/) // Some date info
  })
})
