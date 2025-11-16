/**
 * TypeScript types matching backend Pydantic schemas
 */

export type WorkflowStepType = 'loading' | 'preparing' | 'validation'

export interface WorkflowStep {
  type: WorkflowStepType
  config: Record<string, any>
  require_approval?: boolean
}

export interface Workflow {
  id: string
  name: string
  description?: string
  steps: WorkflowStep[]
  global_config?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface WorkflowCreate {
  name: string
  description?: string
  steps: WorkflowStep[]
  global_config?: Record<string, any>
}

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface Job {
  id: string
  workflow_id?: string
  status: JobStatus
  input_data_id?: string
  result_data_id?: string
  metadata?: Record<string, any>
  error?: string
  progress: number
  logs?: string[]
  created_at: string
  started_at?: string
  completed_at?: string
}

export interface JobCreate {
  workflow_id?: string
  input_data_id?: string
  parameters?: Record<string, any>
}

export interface DataArtifact {
  id: string
  filename: string
  storage_path: string
  size_bytes?: number
  content_type?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface DataSample {
  columns: string[]
  rows: Record<string, any>[]
  total_rows: number
  sample_size: number
}

export interface HealthResponse {
  status: string
  version: string
  database: string
  redis?: string
}

// WebSocket message types
export interface WSMessage {
  type: 'status' | 'complete' | 'error'
  job_id?: string
  status?: JobStatus
  progress?: number
  error?: string
  metadata?: Record<string, any>
  result_data_id?: string
  message?: string
}
