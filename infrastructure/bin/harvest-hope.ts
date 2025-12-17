#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { HarvestHopeStack } from '../lib/harvest-hope-stack';

const app = new cdk.App();
new HarvestHopeStack(app, 'HarvestHopeStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});