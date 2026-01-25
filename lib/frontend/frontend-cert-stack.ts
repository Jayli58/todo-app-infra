import * as cdk from 'aws-cdk-lib';
import {Construct} from "constructs";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import {feConfig} from "../../config/frontend/config.fe";


export class FrontendCertStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: cdk.StackProps) {
        super(scope, id, {
            ...props,
            description: "ACM cert for Todo App frontend"
        });

        // cert
        const cert = new acm.Certificate(this, "TodoFeCert", {
            domainName: feConfig.domain,
            validation: acm.CertificateValidation.fromDns(),
        });

        new cdk.CfnOutput(this, "FrontendCertArn", {
            value: cert.certificateArn,
        });
    }
}
