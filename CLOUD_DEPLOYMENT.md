# Cloud Deployment Guide

This guide covers deploying the AW App to production cloud environments (AWS, GCP, Azure).

## Prerequisites

- Docker installed
- Cloud CLI tools (`aws`, `gcloud`, or `az`)
- Domain name (optional, for custom URLs)
- SSL certificate (Let's Encrypt or cloud provider)

## Architecture Overview

```
┌─────────────────┐
│  Load Balancer  │ ← HTTPS/SSL termination
└────────┬────────┘
         │
    ┌────┴────┐
    │  Web    │ Frontend (React + Nginx)
    │ Tier    │
    └────┬────┘
         │
    ┌────┴────┐
    │  App    │ Backend (FastAPI + Celery)
    │ Tier    │
    └────┬────┘
         │
    ┌────┴─────┬──────────┬──────────┐
    │ Database │  Storage │  Cache   │
    │(Postgres)│   (S3)   │ (Redis)  │
    └──────────┴──────────┴──────────┘
```

## AWS Deployment

### 1. Database Setup (RDS PostgreSQL)

```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier aw-app-db \
  --db-instance-class db.t3.small \
  --engine postgres \
  --engine-version 15.4 \
  --master-username awapp \
  --master-user-password <SECURE_PASSWORD> \
  --allocated-storage 20 \
  --backup-retention-period 7 \
  --multi-az \
  --storage-encrypted

# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier aw-app-db \
  --query 'DBInstances[0].Endpoint.Address'
```

### 2. Storage Setup (S3)

```bash
# Create S3 bucket
aws s3 mb s3://aw-app-artifacts-prod

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket aw-app-artifacts-prod \
  --versioning-configuration Status=Enabled

# Set lifecycle policy (optional)
aws s3api put-bucket-lifecycle-configuration \
  --bucket aw-app-artifacts-prod \
  --lifecycle-configuration file://s3-lifecycle.json
```

**s3-lifecycle.json**:
```json
{
  "Rules": [
    {
      "Id": "Delete old versions after 90 days",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    }
  ]
}
```

### 3. Cache/Queue Setup (ElastiCache Redis)

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id aw-app-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --port 6379

# Get endpoint
aws elasticache describe-cache-clusters \
  --cache-cluster-id aw-app-redis \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address'
```

### 4. Container Registry (ECR)

```bash
# Create ECR repository
aws ecr create-repository --repository-name aw-app-backend
aws ecr create-repository --repository-name aw-app-frontend

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build and push images
cd backend
docker build -t aw-app-backend:latest .
docker tag aw-app-backend:latest \
  <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/aw-app-backend:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/aw-app-backend:latest

cd ../frontend
docker build -t aw-app-frontend:latest .
docker tag aw-app-frontend:latest \
  <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/aw-app-frontend:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/aw-app-frontend:latest
```

### 5. ECS Fargate Deployment

**task-definition.json**:
```json
{
  "family": "aw-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/aw-app-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "postgresql+asyncpg://awapp:<PASSWORD>@<RDS_ENDPOINT>:5432/awapp"
        },
        {
          "name": "STORAGE_BACKEND",
          "value": "s3"
        },
        {
          "name": "S3_BUCKET",
          "value": "aw-app-artifacts-prod"
        },
        {
          "name": "S3_REGION",
          "value": "us-east-1"
        },
        {
          "name": "REDIS_URL",
          "value": "redis://<REDIS_ENDPOINT>:6379/0"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/aw-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "backend"
        }
      }
    },
    {
      "name": "celery-worker",
      "image": "<AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/aw-app-backend:latest",
      "command": ["celery", "-A", "app.core.task_queue", "worker", "--loglevel=info"],
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "postgresql+asyncpg://awapp:<PASSWORD>@<RDS_ENDPOINT>:5432/awapp"
        },
        {
          "name": "REDIS_URL",
          "value": "redis://<REDIS_ENDPOINT>:6379/0"
        }
      ]
    },
    {
      "name": "frontend",
      "image": "<AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/aw-app-frontend:latest",
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ]
    }
  ]
}
```

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create ECS cluster
aws ecs create-cluster --cluster-name aw-app-cluster

# Create service
aws ecs create-service \
  --cluster aw-app-cluster \
  --service-name aw-app-service \
  --task-definition aw-app \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=backend,containerPort=8000"
```

### 6. Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name aw-app-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx \
  --scheme internet-facing

# Create target groups
aws elbv2 create-target-group \
  --name aw-app-backend-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id vpc-xxx \
  --target-type ip \
  --health-check-path /api/v1/health

aws elbv2 create-target-group \
  --name aw-app-frontend-tg \
  --protocol HTTP \
  --port 80 \
  --vpc-id vpc-xxx \
  --target-type ip \
  --health-check-path /

# Create listeners
aws elbv2 create-listener \
  --load-balancer-arn <ALB_ARN> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<ACM_CERT_ARN> \
  --default-actions Type=forward,TargetGroupArn=<FRONTEND_TG_ARN>

# Add routing rule for API
aws elbv2 create-rule \
  --listener-arn <LISTENER_ARN> \
  --priority 1 \
  --conditions Field=path-pattern,Values='/api/*' \
  --actions Type=forward,TargetGroupArn=<BACKEND_TG_ARN>
```

## GCP Deployment

### 1. Cloud SQL (PostgreSQL)

```bash
# Create instance
gcloud sql instances create aw-app-db \
  --database-version=POSTGRES_15 \
  --tier=db-custom-1-3840 \
  --region=us-central1

# Create database
gcloud sql databases create awapp --instance=aw-app-db

# Create user
gcloud sql users create awapp \
  --instance=aw-app-db \
  --password=<SECURE_PASSWORD>

# Get connection name
gcloud sql instances describe aw-app-db \
  --format='get(connectionName)'
```

### 2. Cloud Storage

```bash
# Create bucket
gsutil mb -p <PROJECT_ID> -l us-central1 gs://aw-app-artifacts-prod/

# Enable versioning
gsutil versioning set on gs://aw-app-artifacts-prod/

# Set lifecycle
gsutil lifecycle set gs-lifecycle.json gs://aw-app-artifacts-prod/
```

### 3. Cloud Run Deployment

```bash
# Build with Cloud Build
gcloud builds submit --tag gcr.io/<PROJECT_ID>/aw-app-backend ./backend
gcloud builds submit --tag gcr.io/<PROJECT_ID>/aw-app-frontend ./frontend

# Deploy backend
gcloud run deploy aw-app-backend \
  --image gcr.io/<PROJECT_ID>/aw-app-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="postgresql+asyncpg://awapp:<PASSWORD>@/<DB_NAME>?host=/cloudsql/<CONNECTION_NAME>",STORAGE_BACKEND=s3,S3_BUCKET=aw-app-artifacts-prod \
  --add-cloudsql-instances <CONNECTION_NAME>

# Deploy frontend
gcloud run deploy aw-app-frontend \
  --image gcr.io/<PROJECT_ID>/aw-app-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Azure Deployment

### 1. Azure Database for PostgreSQL

```bash
# Create server
az postgres flexible-server create \
  --resource-group aw-app-rg \
  --name aw-app-db \
  --location eastus \
  --admin-user awapp \
  --admin-password <SECURE_PASSWORD> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 15

# Create database
az postgres flexible-server db create \
  --resource-group aw-app-rg \
  --server-name aw-app-db \
  --database-name awapp
```

### 2. Azure Blob Storage

```bash
# Create storage account
az storage account create \
  --name awappstorprod \
  --resource-group aw-app-rg \
  --location eastus \
  --sku Standard_LRS

# Create container
az storage container create \
  --name artifacts \
  --account-name awappstorprod
```

### 3. Container Instances

```bash
# Create container group
az container create \
  --resource-group aw-app-rg \
  --name aw-app \
  --image <ACR_NAME>.azurecr.io/aw-app-backend:latest \
  --cpu 1 \
  --memory 1 \
  --ports 8000 \
  --environment-variables \
    DATABASE_URL="postgresql+asyncpg://awapp:<PASSWORD>@<DB_SERVER>.postgres.database.azure.com:5432/awapp" \
    STORAGE_BACKEND=s3 \
    S3_BUCKET=awappstorprod/artifacts
```

## Environment Variables Reference

### Required for Production

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname

# Storage
STORAGE_BACKEND=s3  # or 'local' for development
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key  # If not using IAM roles
AWS_SECRET_ACCESS_KEY=your-secret

# Redis/Celery
REDIS_URL=redis://host:6379/0
CELERY_BROKER_URL=redis://host:6379/0  # Optional, defaults to REDIS_URL
CELERY_RESULT_BACKEND=redis://host:6379/0  # Optional

# Authentication
JWT_SECRET_KEY=your-very-secure-random-secret-key-change-this
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Application
ENVIRONMENT=production
DEBUG=false
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Optional
OPENAI_API_KEY=sk-...  # If using OpenAI features
DEFAULT_LLM=gpt-4
```

## Security Best Practices

### 1. Secrets Management

**AWS Secrets Manager**:
```bash
# Store database password
aws secretsmanager create-secret \
  --name aw-app/db-password \
  --secret-string '<PASSWORD>'

# Reference in ECS task definition
{
  "secrets": [
    {
      "name": "DB_PASSWORD",
      "valueFrom": "arn:aws:secretsmanager:region:account:secret:aw-app/db-password"
    }
  ]
}
```

**GCP Secret Manager**:
```bash
# Create secret
echo -n '<PASSWORD>' | gcloud secrets create db-password --data-file=-

# Grant access
gcloud secrets add-iam-policy-binding db-password \
  --member serviceAccount:<SA_EMAIL> \
  --role roles/secretmanager.secretAccessor
```

### 2. Network Security

- Use VPC/private subnets for backend services
- Database should NOT be publicly accessible
- Use security groups/firewall rules to restrict access
- Enable SSL/TLS for all connections
- Use private service endpoints when possible

### 3. IAM/Permissions

**AWS**: Create IAM role for ECS tasks with minimum required permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::aw-app-artifacts-prod/*"
    }
  ]
}
```

## Monitoring & Logging

### CloudWatch (AWS)

```bash
# Create log group
aws logs create-log-group --log-group-name /ecs/aw-app

# Set retention
aws logs put-retention-policy \
  --log-group-name /ecs/aw-app \
  --retention-in-days 30

# Create alarms
aws cloudwatch put-metric-alarm \
  --alarm-name aw-app-high-cpu \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

### Application Insights (Azure)

```bash
# Create Application Insights
az monitor app-insights component create \
  --app aw-app \
  --location eastus \
  --resource-group aw-app-rg

# Get instrumentation key
az monitor app-insights component show \
  --app aw-app \
  --resource-group aw-app-rg \
  --query instrumentationKey
```

## Scaling Configuration

### Auto Scaling (ECS)

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/aw-app-cluster/aw-app-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# CPU-based scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/aw-app-cluster/aw-app-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

**scaling-policy.json**:
```json
{
  "TargetValue": 70.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleInCooldown": 300,
  "ScaleOutCooldown": 60
}
```

## Backup & Disaster Recovery

### Database Backups

**AWS RDS**:
- Automated daily backups (7-35 day retention)
- Manual snapshots for long-term retention
- Point-in-time recovery (up to 5 minutes)

```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier aw-app-db \
  --db-snapshot-identifier aw-app-db-snapshot-$(date +%Y%m%d)
```

### S3 Versioning & Replication

```bash
# Enable cross-region replication
aws s3api put-bucket-replication \
  --bucket aw-app-artifacts-prod \
  --replication-configuration file://replication.json
```

## Cost Optimization

### Right-Sizing
- Start with smaller instances (t3.small, db.t3.small)
- Monitor CPU/memory usage
- Scale up only when needed

### Reserved Instances/Savings Plans
- Commit to 1-3 year terms for 30-70% savings
- Use for baseline capacity

### S3 Lifecycle Policies
- Move to Intelligent-Tiering after 30 days
- Move to Glacier after 90 days
- Delete after 365 days (if applicable)

## Troubleshooting

### Common Issues

**Database Connection Errors**:
```bash
# Check security groups allow PostgreSQL (5432)
# Verify connection string format
# Test with psql:
psql postgresql://user:pass@host:5432/dbname
```

**S3 Access Denied**:
```bash
# Check IAM role/policy
# Verify bucket policy
# Test with AWS CLI:
aws s3 ls s3://your-bucket/
```

**High Latency**:
- Check database query performance
- Enable connection pooling
- Add Redis caching
- Review application logs

### Health Checks

Backend health endpoint: `GET /api/v1/health`
Expected response:
```json
{
  "status": "ok",
  "version": "0.1.0",
  "database": "connected",
  "redis": "connected"
}
```

## Rollback Procedures

### ECS
```bash
# Update to previous task definition revision
aws ecs update-service \
  --cluster aw-app-cluster \
  --service aw-app-service \
  --task-definition aw-app:PREVIOUS_REVISION
```

### Cloud Run
```bash
# Rollback to previous revision
gcloud run services update-traffic aw-app-backend \
  --to-revisions=PREVIOUS_REVISION=100
```

---

For questions or issues, refer to the main [README.md](README.md) or create an issue on GitHub.
