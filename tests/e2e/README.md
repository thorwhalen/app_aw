# End-to-End Tests

Comprehensive E2E test suite for AW App using Playwright.

## Overview

This test suite covers complete user flows from the frontend through the backend API, validating the entire application stack.

## Test Structure

```
tests/e2e/
├── fixtures/              # Test data files
│   ├── sample.csv
│   └── inventory.csv
├── page-objects/          # Page Object Models
│   ├── DataManagerPage.ts
│   ├── WorkflowsPage.ts
│   └── MonitorPage.ts
├── scenarios/             # Test scenarios
│   ├── 01-data-loading.spec.ts
│   ├── 02-workflow-creation.spec.ts
│   ├── 03-end-to-end-execution.spec.ts
│   └── 04-error-handling.spec.ts
├── playwright.config.ts   # Playwright configuration
├── package.json
└── README.md
```

## Test Scenarios

### 1. Data Loading (01-data-loading.spec.ts)

Tests file upload and management:
- ✅ Upload CSV files
- ✅ Upload multiple files
- ✅ Download files
- ✅ Delete files
- ✅ View file metadata

### 2. Workflow Creation (02-workflow-creation.spec.ts)

Tests workflow builder:
- ✅ Create workflow with loading step
- ✅ Create workflow with multiple steps
- ✅ Create workflow with validation
- ✅ Delete workflows
- ✅ Form validation (requires name and steps)
- ✅ View workflow metadata

### 3. End-to-End Execution (03-end-to-end-execution.spec.ts)

Tests complete user journey:
- ✅ Upload data → Create workflow → Execute → Monitor
- ✅ Execute workflow with/without input data
- ✅ Monitor real-time progress
- ✅ Navigate between views during execution
- ✅ Quick access from dashboard

### 4. Error Handling (04-error-handling.spec.ts)

Tests error scenarios and edge cases:
- ✅ Empty states (no files, no workflows)
- ✅ Loading states
- ✅ Form validation
- ✅ Navigation correctness
- ✅ Delete confirmations
- ✅ State persistence across refreshes

## Setup

### Prerequisites

- Node.js 18+
- Backend server running (or will be started by Playwright)
- Frontend dev server (or will be started by Playwright)

### Install Dependencies

```bash
cd tests/e2e
npm install
npx playwright install
```

## Running Tests

### All Tests

```bash
npm test
```

### With UI Mode (Interactive)

```bash
npm run test:ui
```

### Headed Mode (See Browser)

```bash
npm run test:headed
```

### Debug Mode

```bash
npm run test:debug
```

### Specific Test File

```bash
npx playwright test scenarios/01-data-loading.spec.ts
```

### View Report

```bash
npm run report
```

## Configuration

The `playwright.config.ts` file configures:

- **Base URL**: http://localhost:3000
- **Auto-start servers**: Backend (port 8000) and Frontend (port 3000)
- **Browsers**: Chromium (can add Firefox, Safari)
- **Timeout**: 30s default
- **Screenshots**: On failure
- **Video**: On failure
- **Trace**: On first retry

## Page Object Model

Tests use the Page Object pattern for maintainability:

### DataManagerPage

- `goto()` - Navigate to Data Manager
- `uploadFile(filename)` - Upload a file from fixtures
- `verifyFileUploaded(filename)` - Check file is in list
- `downloadFile(filename)` - Download a file
- `deleteFile(filename)` - Delete a file with confirmation
- `getFileCount()` - Get number of uploaded files

### WorkflowsPage

- `goto()` - Navigate to Workflows
- `createWorkflow(name, description, steps)` - Create a workflow
- `executeWorkflow(name, inputData?)` - Execute a workflow
- `deleteWorkflow(name)` - Delete a workflow
- `verifyWorkflowExists(name)` - Check workflow exists
- `getWorkflowCount()` - Get number of workflows

### MonitorPage

- `goto()` - Navigate to Monitor
- `waitForStatus(status, timeout?)` - Wait for job status
- `waitForCompletion(timeout?)` - Wait for job to complete
- `getProgress()` - Get current progress percentage
- `getJobId()` - Get the job ID
- `verifyJobCompleted()` - Verify job completed successfully
- `verifyJobFailed()` - Verify job failed
- `getResultDataId()` - Get result data ID if available

## Test Data

### sample.csv

Simple CSV with 5 rows:
- Columns: id, name, value, category
- Used for basic workflow testing

### inventory.csv

Inventory data with 10 rows:
- Columns: id, product, price, stock
- Used for more complex workflow testing

## CI/CD Integration

### GitHub Actions

Example workflow (`.github/workflows/e2e.yml`):

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: |
          cd tests/e2e
          npm ci
          npx playwright install --with-deps

      - name: Run E2E tests
        run: |
          cd tests/e2e
          npm test

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: tests/e2e/playwright-report/
```

## Best Practices

### Writing Tests

1. **Use Page Objects** - Abstract UI interactions
2. **Wait for Network** - Use `waitForLoadState('networkidle')`
3. **Explicit Waits** - Use `waitFor()` instead of arbitrary timeouts
4. **Unique Names** - Use timestamps in test data names
5. **Clean Up** - Delete test data when possible
6. **Assertions** - Use Playwright's expect for auto-retrying

### Debugging

1. **UI Mode**: `npm run test:ui` - Interactive debugging
2. **Trace Viewer**: Check `playwright-report/trace.zip`
3. **Screenshots**: Auto-captured on failure
4. **Console Logs**: Check browser console in debug mode

## Troubleshooting

### Tests Timeout

- Increase timeout in `playwright.config.ts`
- Check if backend/frontend started correctly
- Look for network errors in browser devtools

### Server Start Failures

- Make sure ports 3000 and 8000 are available
- Check backend/frontend can start independently
- Review server logs in test output

### Flaky Tests

- Add explicit waits instead of `page.waitForTimeout()`
- Use `waitForLoadState('networkidle')`
- Increase specific operation timeouts
- Check for race conditions

### File Upload Issues

- Verify test fixtures exist in `fixtures/` directory
- Check file paths are correct
- Ensure upload component is fully loaded

## Coverage

The E2E test suite provides user story-level coverage for:

- ✅ Data management (upload, download, delete)
- ✅ Workflow creation and management
- ✅ Workflow execution
- ✅ Job monitoring (basic - needs Redis for full testing)
- ✅ Navigation and UI interactions
- ✅ Error handling and validation
- ✅ State persistence

## Future Enhancements

- [ ] WebSocket real-time update testing (requires Redis/Celery)
- [ ] Performance testing (load times, response times)
- [ ] Accessibility testing
- [ ] Cross-browser testing (Firefox, Safari)
- [ ] Mobile responsive testing
- [ ] Visual regression testing

## Notes

- **Background Jobs**: Full job execution requires Redis and Celery running
- **Mock Mode**: Tests work without Redis but won't see actual job processing
- **Database**: Uses separate test database to avoid conflicts
- **Parallel Execution**: Disabled to avoid database race conditions

## Support

For issues or questions:
1. Check Playwright docs: https://playwright.dev
2. Review test output and screenshots
3. Use debug mode to step through tests
4. Check GitHub issues
