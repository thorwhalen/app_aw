/**
 * Pre-built workflow templates to help users get started
 */

import type { WorkflowStep } from '../types'

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'data-processing' | 'validation' | 'etl' | 'analytics'
  steps: WorkflowStep[]
  icon?: string
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'basic-data-loader',
    name: 'Basic Data Loader',
    description: 'Simple workflow to load and validate data files.',
    category: 'data-processing',
    icon: '📥',
    steps: [
      {
        type: 'loading',
        config: {},
        require_approval: false,
      },
      {
        type: 'validation',
        config: { validation_type: 'schema' },
        require_approval: false,
      },
    ],
  },
  {
    id: 'data-preparation',
    name: 'Data Preparation Pipeline',
    description: 'Load, prepare data to cosmo-ready format, and validate the output.',
    category: 'data-processing',
    icon: '🔧',
    steps: [
      {
        type: 'loading',
        config: {},
        require_approval: false,
      },
      {
        type: 'preparing',
        config: { target: 'cosmo-ready' },
        require_approval: false,
      },
      {
        type: 'validation',
        config: { validation_type: 'info_dict' },
        require_approval: false,
      },
    ],
  },
  {
    id: 'validated-etl',
    name: 'Validated ETL Pipeline',
    description: 'Extract, transform, and load data with validation at each step.',
    category: 'etl',
    icon: '🔄',
    steps: [
      {
        type: 'loading',
        config: {},
        require_approval: false,
      },
      {
        type: 'validation',
        config: { validation_type: 'schema' },
        require_approval: false,
      },
      {
        type: 'preparing',
        config: { target: 'cosmo-ready' },
        require_approval: false,
      },
      {
        type: 'validation',
        config: { validation_type: 'functional' },
        require_approval: false,
      },
    ],
  },
  {
    id: 'quality-check',
    name: 'Data Quality Check',
    description: 'Comprehensive data validation workflow with multiple validation types.',
    category: 'validation',
    icon: '✅',
    steps: [
      {
        type: 'loading',
        config: {},
        require_approval: false,
      },
      {
        type: 'validation',
        config: { validation_type: 'schema' },
        require_approval: false,
      },
      {
        type: 'validation',
        config: { validation_type: 'info_dict' },
        require_approval: false,
      },
      {
        type: 'validation',
        config: { validation_type: 'functional' },
        require_approval: false,
      },
    ],
  },
  {
    id: 'approval-workflow',
    name: 'Manual Approval Workflow',
    description: 'Workflow with approval gates for careful data processing.',
    category: 'data-processing',
    icon: '✋',
    steps: [
      {
        type: 'loading',
        config: {},
        require_approval: true,
      },
      {
        type: 'preparing',
        config: { target: 'cosmo-ready' },
        require_approval: true,
      },
      {
        type: 'validation',
        config: { validation_type: 'schema' },
        require_approval: false,
      },
    ],
  },
]

export const TEMPLATE_CATEGORIES = [
  { id: 'all', label: 'All Templates' },
  { id: 'data-processing', label: 'Data Processing' },
  { id: 'validation', label: 'Validation' },
  { id: 'etl', label: 'ETL' },
  { id: 'analytics', label: 'Analytics' },
] as const
