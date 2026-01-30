# Todo App Infra (AWS CDK)

Infrastructure for the Todo App using AWS CDK (TypeScript). It provisions backend and frontend stacks, including API, DynamoDB tables, Cognito auth, and supporting SSM parameters.

## Stacks

- Backend API stack
- DynamoDB tables for todos and reminders
- Cognito user pool and app client
- Frontend distribution and certificate support

## CI/CD

- Frontend CI runs in GitHub Actions: build artifact, clear S3, upload artifact to S3, then invalidate CloudFront cache.
- Backend CI is handled by `lib/ci/backend-pipeline-stack.ts`: an AWS CodePipeline watches an S3 bucket for artifacts built by GitHub Actions. When the S3 content is overwritten, the pipeline triggers and deploys `TodoApiStack` and `ReminderStack`.

## Common commands

- `npm run build` compile TypeScript
- `npm run watch` watch and compile
- `npm run test` run Jest tests
- `npx cdk deploy` deploy stacks
- `npx cdk diff` compare deployed vs local
- `npx cdk synth` synthesize CloudFormation
