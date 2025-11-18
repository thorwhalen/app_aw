/**
 * E2E Test: Workflow Creation and Management
 *
 * Tests the complete user journey for creating and managing workflows
 */

import { test, expect } from '@playwright/test'
import { WorkflowsPage } from '../page-objects/WorkflowsPage'

test.describe('Workflow Creation Flow', () => {
  let workflowsPage: WorkflowsPage

  test.beforeEach(async ({ page }) => {
    workflowsPage = new WorkflowsPage(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await workflowsPage.goto()
  })

  test('User can create a simple workflow with loading step', async ({ page }) => {
    const workflowName = `Test Loading Workflow ${Date.now()}`

    await workflowsPage.createWorkflow(
      workflowName,
      'A test workflow with loading step',
      ['loading']
    )

    // Verify workflow appears in the list
    await workflowsPage.verifyWorkflowExists(workflowName)
  })

  test('User can create a complete workflow with multiple steps', async ({ page }) => {
    const workflowName = `Complete Workflow ${Date.now()}`

    await workflowsPage.createWorkflow(
      workflowName,
      'A complete workflow with loading and preparing',
      ['loading', 'preparing']
    )

    // Verify workflow exists
    await workflowsPage.verifyWorkflowExists(workflowName)

    // Verify workflow card shows step count
    const workflowCard = page.locator('.card').filter({ hasText: workflowName })
    await expect(workflowCard).toContainText('2 steps')
  })

  test('User can create workflow with validation step', async ({ page }) => {
    const workflowName = `Validation Workflow ${Date.now()}`

    await workflowsPage.createWorkflow(
      workflowName,
      'Workflow with validation',
      ['loading', 'validation']
    )

    await workflowsPage.verifyWorkflowExists(workflowName)
  })

  test('User can delete a workflow', async ({ page }) => {
    const workflowName = `Delete Me ${Date.now()}`

    // Create workflow
    await workflowsPage.createWorkflow(workflowName, '', ['loading'])
    await workflowsPage.verifyWorkflowExists(workflowName)

    // Get initial count
    const initialCount = await workflowsPage.getWorkflowCount()

    // Delete workflow
    await workflowsPage.deleteWorkflow(workflowName)

    // Verify count decreased
    const finalCount = await workflowsPage.getWorkflowCount()
    expect(finalCount).toBeLessThan(initialCount)
  })

  test('User cannot create workflow without name', async ({ page }) => {
    // Try to create without filling name
    await workflowsPage.addLoadingStepButton.click()

    // Create button should be disabled or do nothing
    const createButton = workflowsPage.createWorkflowButton
    const isDisabled = await createButton.isDisabled()
    expect(isDisabled).toBeTruthy()
  })

  test('User cannot create workflow without steps', async ({ page }) => {
    // Fill name but don't add steps
    await workflowsPage.workflowNameInput.fill('No Steps Workflow')

    // Create button should be disabled
    const createButton = workflowsPage.createWorkflowButton
    const isDisabled = await createButton.isDisabled()
    expect(isDisabled).toBeTruthy()
  })

  test('User can see workflow metadata', async ({ page }) => {
    const workflowName = `Metadata Test ${Date.now()}`

    await workflowsPage.createWorkflow(workflowName, 'Test description', ['loading'])

    const workflowCard = page.locator('.card').filter({ hasText: workflowName })

    // Should show description
    await expect(workflowCard).toContainText('Test description')

    // Should show creation date
    await expect(workflowCard).toContainText(/created/i)

    // Should show number of steps
    await expect(workflowCard).toContainText(/1 step/i)
  })
})
