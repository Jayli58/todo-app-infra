import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { ciConfig } from '../../config/backend/config.ci';

export class BackendPipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const sourceBucket = new s3.Bucket(this, 'BackendSourceBucket', {
            versioned: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        const backendSourceObjectKey = ciConfig.backendSourceObjectKey;
        const infraSourceObjectKey = ciConfig.infraSourceObjectKey;


        const backendSourceOutput = new codepipeline.Artifact('BackendSourceOutput');
        const infraSourceOutput = new codepipeline.Artifact('InfraSourceOutput');

        const deployProject = new codebuild.PipelineProject(this, 'BackendDeployProject', {
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
                privileged: false,
            },
            environmentVariables: {
                AWS_REGION: { value: cdk.Stack.of(this).region },
            },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        'runtime-versions': {
                            nodejs: '20',
                        },
                    },
                    pre_build: {
                        commands: [
                            'infra_dir="$CODEBUILD_SRC_DIR"',
                            'app_dir="$CODEBUILD_SRC_DIR_BackendSourceOutput"',
                            'export MYAPP_ROOT="$app_dir"',
                            'cd "$infra_dir"',
                            'npm ci',
                        ],
                    },
                    build: {
                        commands: [
                            'cd "$infra_dir"',
                            'npx cdk deploy TodoApiStack ReminderStack --require-approval never -c skipFrontend=true',
                        ],
                    },
                },
            }),
        });

        deployProject.role?.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
        );

        const pipeline = new codepipeline.Pipeline(this, 'BackendPipeline', {
            pipelineName: 'todoapp-backend-pipeline',
            // when pipeline definition itself is updated, restart the pipeline
            restartExecutionOnUpdate: true,
        });

        // github oidc provider already exists as part of the frontend pipeline
        const githubOidcProviderArn = `arn:aws:iam::${cdk.Stack.of(this).account}:oidc-provider/token.actions.githubusercontent.com`;
        const githubOidcProvider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
            this,
            'GitHubOidcProvider',
            githubOidcProviderArn
        );

        // role for github actions to upload artifacts to s3
        const githubDeployRole = new iam.Role(this, 'GitHubBackendDeployRole', {
            description: 'GitHub Actions role for backend artifact uploads',
            assumedBy: new iam.FederatedPrincipal(
                githubOidcProvider.openIdConnectProviderArn,
                {
                    'StringEquals': {
                        'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                    },
                    'StringLike': {
                        'token.actions.githubusercontent.com:sub': [
                            `repo:${ciConfig.infraGithubOidcRepo}:ref:refs/heads/main`,
                            `repo:${ciConfig.backendGithubOidcRepo}:ref:refs/heads/main`,
                        ],
                    },
                },
                'sts:AssumeRoleWithWebIdentity'
            ),
        });

        githubDeployRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                's3:GetBucketLocation',
                's3:ListBucket',
            ],
            resources: [sourceBucket.bucketArn],
        }));

        githubDeployRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                's3:PutObject',
                's3:DeleteObject',
            ],
            resources: [`${sourceBucket.bucketArn}/*`],
        }));

        pipeline.addStage({
            stageName: 'Source',
            actions: [
                new codepipelineActions.S3SourceAction({
                    actionName: 'BackendSource',
                    bucket: sourceBucket,
                    bucketKey: backendSourceObjectKey,
                    output: backendSourceOutput,
                    trigger: codepipelineActions.S3Trigger.EVENTS,
                }),
                new codepipelineActions.S3SourceAction({
                    actionName: 'InfraSource',
                    bucket: sourceBucket,
                    bucketKey: infraSourceObjectKey,
                    output: infraSourceOutput,
                    trigger: codepipelineActions.S3Trigger.NONE,
                }),
            ],
        });

        pipeline.addStage({
            stageName: 'Deploy',
            actions: [
                new codepipelineActions.CodeBuildAction({
                    actionName: 'DeployBackend',
                    project: deployProject,
                    input: infraSourceOutput,
                    extraInputs: [backendSourceOutput],
                }),
            ],
        });

        new cdk.CfnOutput(this, 'BackendSourceBucketName', {
            value: sourceBucket.bucketName,
        });

        new cdk.CfnOutput(this, 'BackendSourceObjectKey', {
            value: backendSourceObjectKey,
        });

        new cdk.CfnOutput(this, 'InfraSourceObjectKey', {
            value: infraSourceObjectKey,
        });

        new cdk.CfnOutput(this, 'BackendGithubDeployRoleArn', {
            value: githubDeployRole.roleArn,
        });
    }
}
