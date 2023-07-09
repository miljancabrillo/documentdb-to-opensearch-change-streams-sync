#!/usr/bin/env node
import 'source-map-support/register';
import { App, Tags } from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc.stack';
import { DocumentDbStack } from '../lib/documentdb.stack';
import { OpenSearchStack } from '../lib/opensearch.stack';
import { LambdaStack } from '../lib/lambda.stack';

const env = {
    region: 'eu-west-1'
};

const app = new App();
Tags.of(app).add('Application', 'change-streams-demo');

const vpcStack = new VpcStack(app, 'change-streams-demo-vpc-stack', {
    env
});

const documentDbStack = new DocumentDbStack(app, 'change-streams-demo-documentdb-stack', {
    env,
    vpc: vpcStack.vpc,
    documentDbSecurityGroup: vpcStack.documentDbSecurityGroup
});

const openSearchStack = new OpenSearchStack(app, 'change-streams-demo-opensearch-stack', {
    env,
    vpc: vpcStack.vpc,
    openSearchSecurityGroup: vpcStack.openSearchSecurityGroup
});

new LambdaStack(app, 'change-streams-demo-lambda-stack', {
    env,
    vpc: vpcStack.vpc,
    lambdSecurityGroup: vpcStack.lambdaSecurityGroup,
    documentDbSecretArn: documentDbStack.getSecretArn(),
    documentDbEndpoint: documentDbStack.getClusterEndpoint(),
    documentDbClusterIdentifier: documentDbStack.getClusterIdentifier(),
    openSearchDomainArn: openSearchStack.getDomainArn(),
    openSearchDomainEndpoint: openSearchStack.getDomainEndpoint()
});
