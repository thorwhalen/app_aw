/**
 * Global state management with Zustand
 */

import { create } from 'zustand'
import type { Job } from '../types'

interface AppState {
  // Active jobs being monitored
  activeJobs: Map<string, Job>
  addActiveJob: (job: Job) => void
  updateActiveJob: (jobId: string, updates: Partial<Job>) => void
  removeActiveJob: (jobId: string) => void

  // UI state
  sidebarOpen: boolean
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  // Active jobs
  activeJobs: new Map(),
  addActiveJob: (job) =>
    set((state) => {
      const newMap = new Map(state.activeJobs)
      newMap.set(job.id, job)
      return { activeJobs: newMap }
    }),
  updateActiveJob: (jobId, updates) =>
    set((state) => {
      const newMap = new Map(state.activeJobs)
      const existingJob = newMap.get(jobId)
      if (existingJob) {
        newMap.set(jobId, { ...existingJob, ...updates })
      }
      return { activeJobs: newMap }
    }),
  removeActiveJob: (jobId) =>
    set((state) => {
      const newMap = new Map(state.activeJobs)
      newMap.delete(jobId)
      return { activeJobs: newMap }
    }),

  // UI state
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))
