/**
 * Page Object Model for the Job Monitor page
 */

import { Page, Locator, expect } from '@playwright/test'

export class MonitorPage {
  readonly page: Page
  readonly navMonitor: Locator
  readonly statusBadge: Locator
  readonly progressBar: Locator
  readonly progressText: Locator
  readonly jobId: Locator
  readonly errorMessage: Locator
  readonly resultMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.navMonitor = page.getByRole('button', { name: /monitor/i })
    this.statusBadge = page.locator('.badge')
    this.progressBar = page.locator('.progress-bar-fill')
    this.progressText = page.locator('text=/progress/i').locator('..')
    this.jobId = page.locator('text=/job id:/i')
    this.errorMessage = page.locator('[style*="fee2e2"]') // Error background color
    this.resultMessage = page.locator('[style*="d1fae5"]') // Success background color
  }

  async goto() {
    await this.navMonitor.click()
    await this.page.waitForURL(/.*/, { waitUntil: 'networkidle' })
  }

  async waitForStatus(status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED', timeout = 60000) {
    await expect(this.statusBadge).toContainText(status, { timeout })
  }

  async waitForCompletion(timeout = 60000) {
    await this.waitForStatus('COMPLETED', timeout)
  }

  async getProgress(): Promise<number> {
    const text = await this.progressText.textContent()
    const match = text?.match(/(\d+)%/)
    return match ? parseInt(match[1]) : 0
  }

  async getJobId(): Promise<string> {
    const text = await this.jobId.textContent()
    const match = text?.match(/Job ID:\s*(.+)/)
    return match ? match[1].trim() : ''
  }

  async verifyJobCompleted() {
    await this.waitForCompletion()
    await expect(this.resultMessage).toBeVisible()
  }

  async verifyJobFailed() {
    await this.waitForStatus('FAILED')
    await expect(this.errorMessage).toBeVisible()
  }

  async getResultDataId(): Promise<string | null> {
    if (await this.resultMessage.isVisible()) {
      const text = await this.resultMessage.textContent()
      const match = text?.match(/Results available:\s*(.+)/)
      return match ? match[1].trim() : null
    }
    return null
  }
}
