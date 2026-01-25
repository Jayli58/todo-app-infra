import {ddbParam} from "../lib/backend/dynamodb-param-helper";
import { describe, it, expect } from "@jest/globals";
import {apiConfig} from "../config/backend/config.api";


describe("ddbParam", () => {
    it("generates correct SSM path for todos table ARN", () => {
        const result = ddbParam("todos", "arn");

        expect(result).toBe("/todoapp/base/dynamodb/todos/arn");
    });

    it("generates correct SSM path for todos table name", () => {
        const result = ddbParam("todos", "name");

        // expect(result).toBe("/todoapp/base/dynamodb/todos/name");
        expect(result).toBe(`${apiConfig.Ssm__BasePath}/dynamodb/todos/name`);
    });
});
