/**
 * Page Object Model for the Data Manager page
 */

import { Page, Locator, expect } from '@playwright/test'
import path from 'path'

export class DataManagerPage {
  readonly page: Page
  readonly uploadDropzone: Locator
  readonly fileInput: Locator
  readonly uploadedFilesList: Locator
  readonly navDataManager: Locator

  constructor(page: Page) {
    this.page = page
    this.navDataManager = page.getByRole('button', { name: /data manager/i })
    this.uploadDropzone = page.locator('[data-testid="dropzone"], .dropzone').first()
    this.fileInput = page.locator('input[type="file"]')
    this.uploadedFilesList = page.locator('.card').filter({ hasText: /uploaded files/i })
  }

  async goto() {
    await this.navDataManager.click()
    await this.page.waitForURL(/.*/, { waitUntil: 'networkidle' })
  }

  async uploadFile(filename: string) {
    const filePath = path.join(__dirname, '../fixtures', filename)

    // Wait for the file input to be attached
    await this.fileInput.waitFor({ state: 'attached' })

    // Upload the file
    await this.fileInput.setInputFiles(filePath)

    // Wait for upload to complete (look for success message)
    await expect(
      this.page.locator('text=/upload.*success/i')
    ).toBeVisible({ timeout: 10000 })
  }

  async getUploadedFiles() {
    await this.uploadedFilesList.waitFor({ state: 'visible', timeout: 5000 })
    return this.page.locator('.card').filter({ hasText: /uploaded files/i }).locator('[style*="border"]')
  }

  async verifyFileUploaded(filename: string) {
    const fileRow = this.page.locator(`text=${filename}`).first()
    await expect(fileRow).toBeVisible()
  }

  async downloadFile(filename: string) {
    const fileRow = this.page.locator(`text=${filename}`).first().locator('..')
    const downloadButton = fileRow.getByRole('button', { name: /download/i })

    const downloadPromise = this.page.waitForEvent('download')
    await downloadButton.click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toBe(filename)
    return download
  }

  async deleteFile(filename: string) {
    const fileRow = this.page.locator(`text=${filename}`).first().locator('..')
    const deleteButton = fileRow.getByRole('button', { name: /delete/i })

    // Click delete and confirm
    this.page.once('dialog', dialog => dialog.accept())
    await deleteButton.click()

    // Wait for file to be removed from list
    await expect(this.page.locator(`text=${filename}`).first()).not.toBeVisible({
      timeout: 5000,
    })
  }

  async getFileCount(): Promise<number> {
    const files = await this.getUploadedFiles()
    return files.count()
  }
}
