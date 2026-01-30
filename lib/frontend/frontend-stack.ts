import * as cdk from 'aws-cdk-lib';
import { Construct } from "constructs";
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from "path";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as iam from "aws-cdk-lib/aws-iam";
import { feConfig } from "../../config/frontend/config.fe";


export class FrontendStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, {
            ...props,
            description: "Todo App frontend"
        });

        // create S3 bucket
        const bucket = new s3.Bucket(this, 'TodoFrontendBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        // cert
        const certArn = ssm.StringParameter.valueForStringParameter(this, feConfig.ssmParamName4CertArn);
        const cert = acm.Certificate.fromCertificateArn(this, "ImportedFeCert", certArn);

        // create cloudfront
        // cloudfront function for client-side routing in s3
        // e.g.: /callback/ -> /callback/index.html
        // need to enable trailing slash in next.js
        const routeUrlFn = new cloudfront.Function(this, "routeUrlFn", {
            runtime: cloudfront.FunctionRuntime.JS_2_0,
            code: cloudfront.FunctionCode.fromFile({
                filePath: path.join(process.cwd(), "lib/frontend/route-url.js"),
            }),
        });

        const cfDistro = new cloudfront.Distribution(this, 'TodoFrontendDistro', {
            defaultRootObject: 'index.html',
            domainNames: [feConfig.domain],
            certificate: cert,
            // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.ViewerProtocolPolicy.html
            defaultBehavior: {
                origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
                // not necessary as we only need GET method to access S3 index.html and GET is allowed by default
                // allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                functionAssociations: [
                    {
                        function: routeUrlFn,
                        eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
                    },
                ],
            },
        });

        // deploy next static codes onto s3 bucket
        new s3deploy.BucketDeployment(this, 'DeployWebsite', {
            // todo: integrate with s3 artifact from CI
            sources: [s3deploy.Source.asset('C:/Users/Lee58/PhpstormProjects/todo-list/my-app/out')],
            destinationBucket: bucket,
            distribution: cfDistro,
            // to invalidate cloudfront cache
            distributionPaths: ['/*']
        });

        // github oidc for github actions to deploy frontend
        const githubOidcProvider = new iam.OpenIdConnectProvider(this, "GitHubOidcProvider", {
            url: "https://token.actions.githubusercontent.com",
            clientIds: ["sts.amazonaws.com"],
        });

        const githubDeployRole = new iam.Role(this, "GitHubFrontendDeployRole", {
            description: "GitHub Actions role for frontend deploy",
            assumedBy: new iam.FederatedPrincipal(
                githubOidcProvider.openIdConnectProviderArn,
                {
                    "StringEquals": {
                        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                    },
                    "StringLike": {
                        "token.actions.githubusercontent.com:sub": [
                            `repo:${feConfig.githubOidcRepo}:ref:refs/heads/main`,
                            // for github actions workflow (approval)
                            `repo:${feConfig.githubOidcRepo}:environment:production`
                        ],
                        // checked official doc on https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
                        // confirmed the underneath is not necessary and would cause error on assuming oidc role
                        // "token.actions.githubusercontent.com:workflow_ref": `${feConfig.githubOidcRepo}/.github/workflows/deploy.yml@refs/heads/main`,
                    },
                },
                "sts:AssumeRoleWithWebIdentity",
            ),
        });

        githubDeployRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket",
            ],
            resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
        }));

        githubDeployRole.addToPolicy(new iam.PolicyStatement({
            actions: ["cloudfront:CreateInvalidation"],
            resources: [
                `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/${cfDistro.distributionId}`,
            ],
        }));

        new cdk.CfnOutput(this, 'CloudFrontUrl', {
            value: `https://${cfDistro.domainName}`,
        });

        new cdk.CfnOutput(this, "FrontendBucketName", {
            value: bucket.bucketName,
        });

        new cdk.CfnOutput(this, "FrontendDistributionId", {
            value: cfDistro.distributionId,
        });

        new cdk.CfnOutput(this, "FrontendGithubDeployRoleArn", {
            value: githubDeployRole.roleArn,
        });
    }
}
