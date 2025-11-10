#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { MusicanatorBackendStack } from "../lib/musicanator-backend-stack.js";

//Create CDK application
const app = new cdk.App();

//deploy main stack to AWS
new MusicanatorBackendStack(app, "MusicanatorBackendStack", {
  env: { region: "us-east-1" },
});




