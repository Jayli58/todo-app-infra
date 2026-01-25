import * as cdk from 'aws-cdk-lib';
import {Construct} from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import {mailConfig} from "../../config/backend/config.mail";
import * as ssm from "aws-cdk-lib/aws-ssm";
import {ddbParam} from "./dynamodb-param-helper";


export class ReminderStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, {
            ...props,
            description: "Reminder Lambda for TodoApp"
        });

        const fn = new lambda.Function(this, 'ReminderFn', {
            runtime: lambda.Runtime.DOTNET_8,

            // Assembly::Namespace.Class::Method
            handler: 'RemainderLambda::RemainderLambda.Function::FunctionHandler',

            memorySize: 256,
            timeout: cdk.Duration.seconds(30),

            code: lambda.Code.fromAsset(
                path.join(process.cwd(), '../MyApp/RemainderLambda/bin/lambda-publish')
            ),

            environment: {
                MAIL_SENDER: mailConfig.fromEmail,
                RESEND_API_KEY_PARAM: mailConfig.ssmParamName4ResendApiKey
            },
        });

        // allow lambda to read dynamodb stream
        const todoRemindersArn = ssm.StringParameter.valueForStringParameter(
            this,
            ddbParam("todoReminders", "arn")
        );
        const remindersStreamArn = ssm.StringParameter.valueForStringParameter(
            this,
            ddbParam("todoReminders", "streamArn")
        );

        const todoRemindersTable = dynamodb.Table.fromTableAttributes(this, "TodoRemindersTable", {
            tableArn: todoRemindersArn,
            tableStreamArn: remindersStreamArn,
        });

        todoRemindersTable.grantStreamRead(fn);

        // create event source mapping for lambda to DynamoDB stream
        fn.addEventSource(new eventsources.DynamoEventSource(todoRemindersTable, {
            startingPosition: lambda.StartingPosition.LATEST,
            batchSize: 10,
            retryAttempts: 2,
        }));

        // Allow Lambda to send email via SES
        // const region = cdk.Stack.of(this).region;
        // const account = cdk.Stack.of(this).account;

        // const sesIdentityArn = `arn:aws:ses:${region}:${account}:identity/${mailConfig.domain}`;
        //
        // fn.addToRolePolicy(new iam.PolicyStatement({
        //     actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        //     // for ses production
        //     // resources: [sesIdentityArn],
        //     // for ses sandbox
        //     resources: ['*'],
        // }));

        // Let Lambda read Resend api key in ssm
        fn.addToRolePolicy(new iam.PolicyStatement({
            actions: ['ssm:GetParameter'],
            resources: [
                `arn:aws:ssm:${this.region}:${this.account}:parameter${mailConfig.ssmParamName4ResendApiKey}`,
            ],
        }));

        // Allow decrypt
        fn.addToRolePolicy(new iam.PolicyStatement({
            actions: ['kms:Decrypt'],
            resources: ['*']
        }));
    }
}
