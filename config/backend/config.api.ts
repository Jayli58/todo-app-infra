import { sharedConfig } from "../shared";

export const apiConfig = {
    // env vars needed by asp.net
    Cognito__Region: 'ap-southeast-2',
    Cognito__UserPoolId: 'filled-by-cdk-deployment',
    Cognito__ClientId: 'filled-by-cdk-deployment',
    AWS__DynamoDB__Region: 'ap-southeast-2',
    Frontend__Url: `https://${sharedConfig.domain}`,
    // needs to be .net project name
    Handler__Name: 'MyApp',
    Ssm__BasePath: '/todoapp/base',
    Domain: `api.${sharedConfig.domain}`
}
