import * as cdk from 'aws-cdk-lib/core';
import {Stack} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {BaseStack} from "./backend/base-stack";
import {ApiStack} from "./backend/api-stack";
import {ReminderStack} from "./backend/reminder-stack";
import {FrontendStack} from "./frontend/frontend-stack";


export class InfraStack extends Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // The code that defines your stack goes here
        const baseStack = new BaseStack(this, 'BaseStack');

        const apiStack = new ApiStack(this, 'TodoApiStack');

        const reminderStack = new ReminderStack(this, 'ReminderStack');

        const frontendStack = new FrontendStack(this, 'TodoFrontendStack');
    }
}
