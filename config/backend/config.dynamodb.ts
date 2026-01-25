import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import {apiConfig} from "./config.api";

export const dynamodbConfig = {
    ssm: {
        basePath: `${apiConfig.Ssm__BasePath}/dynamodb`,
        keys: {
            arn: "arn",
            name: "name",
        },
    },
    tables: {
        todos: {
            tableName: 'Todos',
            partitionKey: {
                name: 'UserId',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'TodoId',
                type: dynamodb.AttributeType.STRING
            },
        },
        todoReminders: {
            tableName: 'TodoReminders',
            partitionKey: {
                name: 'UserId',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'TodoId',
                type: dynamodb.AttributeType.STRING
            },
            timeToLiveAttribute: 'RemindAtEpoch',
            // only needs data before removal
            stream: dynamodb.StreamViewType.OLD_IMAGE,
        },
    },
};
