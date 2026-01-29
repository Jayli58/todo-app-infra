# Todo App Infra (AWS CDK)

Infrastructure for the Todo App using AWS CDK (TypeScript). It provisions backend and frontend stacks, including API, DynamoDB tables, Cognito auth, and supporting SSM parameters.

## Stacks

- Backend API stack
- DynamoDB tables for todos and reminders
- Cognito user pool and app client
- Frontend distribution and certificate support

## Common commands

- `npm run build` compile TypeScript
- `npm run watch` watch and compile
- `npm run test` run Jest tests
- `npx cdk deploy` deploy stacks
- `npx cdk diff` compare deployed vs local
- `npx cdk synth` synthesize CloudFormation
