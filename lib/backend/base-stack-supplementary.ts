import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ssm from "aws-cdk-lib/aws-ssm";
import { feConfig } from "../../config/frontend/config.fe";
import { apiConfig } from "../../config/backend/config.api";

export class BaseStackSupplementary extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      description: "Todo App supplementary base infra: Cognito app client"
    });

    const userPoolId = ssm.StringParameter.valueForStringParameter(
      this,
      `${apiConfig.Ssm__BasePath}/cognito/userPoolId`
    );

    const userPool = cognito.UserPool.fromUserPoolId(this, "TodoAppUserpool", userPoolId);

    const appClient = userPool.addClient("TodoAppClient", {
      authFlows: {
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          ...feConfig.callbackUrls,
        ],
      },
      generateSecret: false,
    });

    appClient.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

    const branding = new cognito.CfnManagedLoginBranding(this, "TodoAppManagedLoginBranding", {
      userPoolId: userPoolId,
      clientId: appClient.userPoolClientId,
      useCognitoProvidedValues: true,
    });

    branding.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

  }
}
