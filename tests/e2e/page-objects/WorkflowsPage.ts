/**
 * Page Object Model for the Workflows page
 */

import { Page, Locator, expect } from '@playwright/test'

export class WorkflowsPage {
  readonly page: Page
  readonly navWorkflows: Locator
  readonly workflowNameInput: Locator
  readonly descriptionInput: Locator
  readonly addLoadingStepButton: Locator
  readonly addPreparingStepButton: Locator
  readonly addValidationStepButton: Locator
  readonly createWorkflowButton: Locator
  readonly workflowsList: Locator

  constructor(page: Page) {
    this.page = page
    this.navWorkflows = page.getByRole('button', { name: /workflows/i })
    this.workflowNameInput = page.getByLabel(/workflow name/i)
    this.descriptionInput = page.getByLabel(/description/i)
    this.addLoadingStepButton = page.getByRole('button', { name: /add loading step/i })
    this.addPreparingStepButton = page.getByRole('button', { name: /add preparing step/i })
    this.addValidationStepButton = page.getByRole('button', { name: /add validation step/i })
    this.createWorkflowButton = page.getByRole('button', { name: /create workflow/i })
    this.workflowsList = page.locator('.card').filter({ hasText: /workflows \(/i })
  }

  async goto() {
    await this.navWorkflows.click()
    await this.page.waitForURL(/.*/, { waitUntil: 'networkidle' })
  }

  async createWorkflow(name: string, description: string, steps: Array<'loading' | 'preparing' | 'validation'>) {
    // Fill in workflow details
    await this.workflowNameInput.fill(name)
    if (description) {
      await this.descriptionInput.fill(description)
    }

    // Add steps
    for (const step of steps) {
      if (step === 'loading') {
        await this.addLoadingStepButton.click()
      } else if (step === 'preparing') {
        await this.addPreparingStepButton.click()
      } else if (step === 'validation') {
        await this.addValidationStepButton.click()
      }
      await this.page.waitForTimeout(300) // Small delay for UI update
    }

    // Create the workflow
    await this.createWorkflowButton.click()

    // Wait for success (workflow should appear in list or alert)
    await this.page.waitForTimeout(1000)
  }

  async executeWorkflow(workflowName: string, inputData?: string) {
    const workflowCard = this.page.locator('.card').filter({ hasText: workflowName }).first()

    // Select input data if provided
    if (inputData) {
      const dataSelect = this.page.locator('select').filter({ hasText: /input data/i })
      if (await dataSelect.isVisible()) {
        await dataSelect.selectOption({ label: inputData })
      }
    }

    // Click execute button
    const executeButton = workflowCard.getByRole('button', { name: /execute/i })
    await executeButton.click()

    // Wait for navigation to monitor page or for job to start
    await this.page.waitForTimeout(1000)
  }

  async deleteWorkflow(workflowName: string) {
    const workflowCard = this.page.locator('.card').filter({ hasText: workflowName }).first()
    const deleteButton = workflowCard.getByRole('button', { name: /delete/i })

    // Click delete and confirm
    this.page.once('dialog', dialog => dialog.accept())
    await deleteButton.click()

    // Wait for workflow to be removed
    await expect(workflowCard).not.toBeVisible({ timeout: 5000 })
  }

  async verifyWorkflowExists(workflowName: string) {
    const workflowCard = this.page.locator('.card').filter({ hasText: workflowName })
    await expect(workflowCard).toBeVisible()
  }

  async getWorkflowCount(): Promise<number> {
    const workflows = this.page.locator('.card').filter({ hasText: /workflows \(/i }).locator('[style*="border"]')
    return workflows.count()
  }
}
