import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { dynamodbConfig } from "../../config/backend/config.dynamodb";
// import * as ses from 'aws-cdk-lib/aws-ses';
// import {mailConfig} from "../../config/backend/config.mail";
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { feConfig } from "../../config/frontend/config.fe";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { ddbParam } from "./dynamodb-param-helper";
import { apiConfig } from "../../config/backend/config.api";


export class BaseStack extends cdk.Stack {
  public readonly todosTable: dynamodb.Table;
  public readonly todoRemindersTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      description: "Base infra: DynamoDB, SES, Cognito for TodoApp"
    });

    const cfg4Todo = dynamodbConfig.tables.todos;
    const cfg4Reminder = dynamodbConfig.tables.todoReminders;

    // Create dynamo db tables
    // 1) Todos table
    this.todosTable = new dynamodb.Table(this, 'TodosTable', {
      tableName: cfg4Todo.tableName,
      partitionKey: {
        name: cfg4Todo.partitionKey.name,
        type: cfg4Todo.partitionKey.type
      },
      sortKey: {
        name: cfg4Todo.sortKey.name,
        type: cfg4Todo.sortKey.type
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // secondary index added for load more functionality
    this.todosTable.addGlobalSecondaryIndex({
      indexName: 'UserIdActiveTodoId',
      partitionKey: {
        name: 'UserId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'ActiveTodoId',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: [
        'Title',
        'Content',
        'RemindTimestamp',
        'StatusCode',
      ],
    });

    // 2) TodoReminders table + Stream + TTL
    this.todoRemindersTable = new dynamodb.Table(this, 'TodoRemindersTable', {
      tableName: cfg4Reminder.tableName,
      partitionKey: {
        name: cfg4Reminder.partitionKey.name,
        type: cfg4Reminder.partitionKey.type
      },
      sortKey: {
        name: cfg4Reminder.sortKey.name,
        type: cfg4Reminder.sortKey.type
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,

      stream: cfg4Reminder.stream,
      timeToLiveAttribute: cfg4Reminder.timeToLiveAttribute,

      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // output dynamo tbl info to ssm for later uses in other stacks
    new ssm.StringParameter(this, "TodosTableArnParam", {
      parameterName: ddbParam("todos", "arn"),
      stringValue: this.todosTable.tableArn,
    });

    new ssm.StringParameter(this, "TodoRemindersTableArnParam", {
      parameterName: ddbParam("todoReminders", "arn"),
      stringValue: this.todoRemindersTable.tableArn,
    });

    // output stream arn
    new ssm.StringParameter(this, "TodoRemindersTableStreamArnParam", {
      parameterName: ddbParam("todoReminders", "streamArn"),
      stringValue: this.todoRemindersTable.tableStreamArn!,
    });

    // --- SES: verify sender domain
    // new ses.EmailIdentity(this, 'SesDomainIdentity', {
    //   identity: ses.Identity.domain(mailConfig.domain),
    // });

    // configure Cognito
    const userpool = new cognito.UserPool(this, 'TodoAppUserpool', {
      userPoolName: 'todo-app-userpool',
      signInCaseSensitive: false,
      selfSignUpEnabled: true,
      // sign in with email only
      signInAliases: {
        email: true,
      },
      // autoVerify: { email: true }
      // need email, name for sign up
      standardAttributes: {
        email: {
          required: true,
          mutable: false,
        },
        fullname: {
          required: true,
          mutable: false,
        },
      },
      // email: cognito.UserPoolEmail.withSES({
      //   fromEmail: mailConfig.fromEmail,
      //   fromName: mailConfig.senderName,
      //   replyTo: mailConfig.replyTo,
      //   sesVerifiedDomain: mailConfig.domain,
      //   sesRegion: mailConfig.region
      // }),
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: false,
        requireDigits: true,
        requireSymbols: false,
      },
    });

    // add cognito domain
    const stack = cdk.Stack.of(this);

    const domain = userpool.addDomain('TodoAppUserpoolDomain', {
      cognitoDomain: {
        domainPrefix: `todoapp-dev-jayli-${stack.region}`,
      },
      managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
    });

    // create app client
    const appClient = userpool.addClient("TodoAppClient", {
      authFlows: {
        userSrp: true
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
      // PKCE
      generateSecret: false,
    });

    // 2) enable login UI
    new cognito.CfnManagedLoginBranding(this, "TodoAppManagedLoginBranding", {
      userPoolId: userpool.userPoolId,
      clientId: appClient.userPoolClientId,
      useCognitoProvidedValues: true,
    });

    // store cognito info into ssm
    new ssm.StringParameter(this, "UserPoolIdParam", {
      parameterName: `${apiConfig.Ssm__BasePath}/cognito/userPoolId`,
      stringValue: userpool.userPoolId,
    });

    new ssm.StringParameter(this, "UserPoolClientIdParam", {
      parameterName: `${apiConfig.Ssm__BasePath}/cognito/clientId`,
      stringValue: appClient.userPoolClientId,
    });

    new ssm.StringParameter(this, "CognitoRegionParam", {
      parameterName: `${apiConfig.Ssm__BasePath}/cognito/region`,
      stringValue: cdk.Stack.of(this).region,
    });
  }
}
