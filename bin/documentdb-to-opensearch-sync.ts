#!/usr/bin/env node
import 'source-map-support/register';
import { App, Tags } from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc.stack';

const env = {
    region: 'eu-west-1'
};

const app = new App();
Tags.of(app).add('Application', 'change-streams-demo');

const vpcStack = new VpcStack(app, 'vpc-stack', {
    env
});
