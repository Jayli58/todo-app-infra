#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import {InfraStack} from "../lib/index";
import {FrontendCertStack} from "../lib/frontend/frontend-cert-stack";
import {BackendPipelineStack} from "../lib/ci/backend-pipeline-stack";

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT!;
const region = process.env.CDK_DEFAULT_REGION!;

// 1) Cert stack in us-east-1 for cloudfront
new FrontendCertStack(app, "TodoFrontendCertStack", {
  env: { account, region: "us-east-1" },
});

new InfraStack(app, 'InfraStack', {
  env: { account: account, region: region },
});

new BackendPipelineStack(app, 'BackendPipelineStack', {
  env: { account: account, region: region },
});
