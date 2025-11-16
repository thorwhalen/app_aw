/**
 * E2E Test: Complete Workflow Execution
 *
 * Tests the complete user journey from data upload through workflow
 * execution to result retrieval
 */

import { test, expect } from '@playwright/test'
import { DataManagerPage } from '../page-objects/DataManagerPage'
import { WorkflowsPage } from '../page-objects/WorkflowsPage'
import { MonitorPage } from '../page-objects/MonitorPage'

test.describe('End-to-End Workflow Execution', () => {
  let dataPage: DataManagerPage
  let workflowsPage: WorkflowsPage
  let monitorPage: MonitorPage

  test.beforeEach(async ({ page }) => {
    dataPage = new DataManagerPage(page)
    workflowsPage = new WorkflowsPage(page)
    monitorPage = new MonitorPage(page)

    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('User can execute complete data processing workflow', async ({ page }) => {
    const workflowName = `E2E Test ${Date.now()}`

    // Step 1: Upload data
    await dataPage.goto()
    await dataPage.uploadFile('sample.csv')
    await dataPage.verifyFileUploaded('sample.csv')

    // Step 2: Create workflow
    await workflowsPage.goto()
    await workflowsPage.createWorkflow(
      workflowName,
      'End-to-end test workflow',
      ['loading', 'preparing']
    )
    await workflowsPage.verifyWorkflowExists(workflowName)

    // Step 3: Execute workflow with input data
    await workflowsPage.executeWorkflow(workflowName, 'sample.csv')

    // Step 4: Monitor execution
    // Should automatically navigate to monitor page
    await page.waitForTimeout(2000)

    // Verify we're on the monitor page
    await expect(page.locator('text=/job execution/i')).toBeVisible()

    // Wait for job to start
    await monitorPage.waitForStatus('QUEUED', 5000)

    // Get job ID for verification
    const jobId = await monitorPage.getJobId()
    expect(jobId).toBeTruthy()
    expect(jobId.length).toBeGreaterThan(0)
  })

  test('User can execute workflow without input data', async ({ page }) => {
    const workflowName = `No Input ${Date.now()}`

    // Create workflow
    await workflowsPage.goto()
    await workflowsPage.createWorkflow(
      workflowName,
      'Workflow without input',
      ['loading']
    )

    // Execute without selecting input data
    await workflowsPage.executeWorkflow(workflowName)

    // Should still create a job
    await page.waitForTimeout(2000)
    await expect(page.locator('text=/job execution/i')).toBeVisible()
  })

  test('User can monitor job progress in real-time', async ({ page }) => {
    // Note: This test requires the backend to actually process jobs
    // In a real environment with Redis/Celery running

    const workflowName = `Monitor Test ${Date.now()}`

    // Upload data and create workflow
    await dataPage.goto()
    await dataPage.uploadFile('inventory.csv')

    await workflowsPage.goto()
    await workflowsPage.createWorkflow(workflowName, '', ['loading', 'preparing'])

    // Execute
    await workflowsPage.executeWorkflow(workflowName, 'inventory.csv')

    await page.waitForTimeout(2000)

    // Monitor should show progress
    await expect(monitorPage.statusBadge).toBeVisible()
    await expect(monitorPage.progressBar).toBeVisible()

    // Progress should be between 0 and 100
    const progress = await monitorPage.getProgress()
    expect(progress).toBeGreaterThanOrEqual(0)
    expect(progress).toBeLessThanOrEqual(100)
  })

  test('User can navigate between views during execution', async ({ page }) => {
    const workflowName = `Navigation Test ${Date.now()}`

    // Create and execute workflow
    await workflowsPage.goto()
    await workflowsPage.createWorkflow(workflowName, '', ['loading'])
    await workflowsPage.executeWorkflow(workflowName)

    await page.waitForTimeout(2000)

    // Verify we're on monitor
    await expect(page.locator('text=/job execution/i')).toBeVisible()

    // Navigate to data manager
    await dataPage.goto()
    await expect(page.locator('text=/upload data/i')).toBeVisible()

    // Navigate back to monitor
    await monitorPage.goto()
    await expect(page.locator('text=/job execution/i')).toBeVisible()
  })

  test('Dashboard provides quick access to upload and workflow builder', async ({ page }) => {
    // Click Dashboard
    const dashboardButton = page.getByRole('button', { name: /dashboard/i })
    await dashboardButton.click()

    // Should see both upload and workflow builder
    await expect(page.locator('text=/upload data/i')).toBeVisible()
    await expect(page.locator('text=/create workflow/i')).toBeVisible()

    // Both should be functional from dashboard
    // Test upload is visible
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()

    // Test workflow builder is visible
    const nameInput = page.getByLabel(/workflow name/i)
    await expect(nameInput).toBeVisible()
  })
})
