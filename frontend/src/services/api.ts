/**
 * API client for AW App backend
 */

import axios, { AxiosInstance } from 'axios'
import type {
  Workflow,
  WorkflowCreate,
  Job,
  JobCreate,
  DataArtifact,
  DataSample,
  HealthResponse,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  // Health
  async getHealth(): Promise<HealthResponse> {
    const { data } = await this.client.get<HealthResponse>('/health')
    return data
  }

  // Workflows
  async getWorkflows(): Promise<Workflow[]> {
    const { data } = await this.client.get<Workflow[]>('/workflows')
    return data
  }

  async getWorkflow(id: string): Promise<Workflow> {
    const { data } = await this.client.get<Workflow>(`/workflows/${id}`)
    return data
  }

  async createWorkflow(workflow: WorkflowCreate): Promise<Workflow> {
    const { data } = await this.client.post<Workflow>('/workflows', workflow)
    return data
  }

  async updateWorkflow(id: string, workflow: Partial<WorkflowCreate>): Promise<Workflow> {
    const { data } = await this.client.put<Workflow>(`/workflows/${id}`, workflow)
    return data
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.client.delete(`/workflows/${id}`)
  }

  async executeWorkflow(id: string, inputDataId?: string): Promise<Job> {
    const { data } = await this.client.post<Job>(
      `/workflows/${id}/execute`,
      null,
      { params: inputDataId ? { input_data_id: inputDataId } : undefined }
    )
    return data
  }

  // Data artifacts
  async getDataArtifacts(): Promise<DataArtifact[]> {
    const { data } = await this.client.get<DataArtifact[]>('/data')
    return data
  }

  async getDataArtifact(id: string): Promise<DataArtifact> {
    const { data } = await this.client.get<DataArtifact>(`/data/${id}`)
    return data
  }

  async uploadData(file: File): Promise<DataArtifact> {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await this.client.post<DataArtifact>('/data/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  }

  async downloadData(id: string): Promise<Blob> {
    const { data } = await this.client.get(`/data/${id}/download`, {
      responseType: 'blob',
    })
    return data
  }

  async getDataSample(id: string, limit: number = 10): Promise<DataSample> {
    const { data } = await this.client.get<DataSample>(`/data/${id}/sample`, {
      params: { limit },
    })
    return data
  }

  async deleteDataArtifact(id: string): Promise<void> {
    await this.client.delete(`/data/${id}`)
  }

  // Jobs
  async getJobs(workflowId?: string, status?: string): Promise<Job[]> {
    const { data } = await this.client.get<Job[]>('/jobs', {
      params: {
        workflow_id: workflowId,
        status_filter: status,
      },
    })
    return data
  }

  async getJob(id: string): Promise<Job> {
    const { data } = await this.client.get<Job>(`/jobs/${id}`)
    return data
  }

  async createJob(job: JobCreate): Promise<Job> {
    const { data } = await this.client.post<Job>('/jobs', job)
    return data
  }

  async executeJob(id: string): Promise<Job> {
    const { data } = await this.client.post<Job>(`/jobs/${id}/execute`)
    return data
  }

  async cancelJob(id: string): Promise<Job> {
    const { data } = await this.client.post<Job>(`/jobs/${id}/cancel`)
    return data
  }

  async getJobResult(id: string): Promise<{ job_id: string; result_data_id?: string; metadata?: Record<string, any> }> {
    const { data } = await this.client.get(`/jobs/${id}/result`)
    return data
  }
}

export const api = new ApiClient()
export default api
