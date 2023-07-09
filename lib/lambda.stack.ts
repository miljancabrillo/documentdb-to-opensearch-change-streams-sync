import { Stack, StackProps } from 'aws-cdk-lib';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnEventSourceMapping } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface LambdaStackProps extends StackProps {
    vpc: Vpc;
    lambdSecurityGroup: SecurityGroup;
    documentDbSecretArn: string;
    documentDbEndpoint: string;
    documentDbClusterArn: string;
    openSearchDomainArn: string;
    openSearchDomainEndpoint: string;
}

export class LambdaStack extends Stack {
    private writerFunction: NodejsFunction;
    private readerFunction: NodejsFunction;
    private indexingFunction: NodejsFunction;
    private configFunction: NodejsFunction;

    constructor(scope: Construct, id: string, private props: LambdaStackProps) {
        super(scope, id, props);

        this.createLambdaFunctions();
        this.createApiGateway();
        this.createEventSourceMapping();
    }

    private createLambdaFunctions() {
        const roles = this.createLambdaRoles();

        this.writerFunction = new NodejsFunction(this, 'WriterLambda', {
            functionName: 'change-streams-demo-writer',
            entry: path.join(__dirname, '..', 'functions', 'writer.ts'),
            vpc: this.props.vpc,
            securityGroups: [this.props.lambdSecurityGroup],
            environment: {
                DOCUMENT_DB_SECRET: this.props.documentDbSecretArn,
                DOCUMENT_DB_ENDPOINT: this.props.documentDbEndpoint
            },
            role: roles.documentDbAccessLambdaRole
        });

        this.readerFunction = new NodejsFunction(this, 'ReaderLambda', {
            functionName: 'change-streams-demo-reader',
            entry: path.join(__dirname, '..', 'functions', 'reader.ts'),
            vpc: this.props.vpc,
            securityGroups: [this.props.lambdSecurityGroup],
            environment: {
                OPEN_SEACH_DOMAIN_ENDPOINT: this.props.openSearchDomainEndpoint
            },
            role: roles.openSearchAccessLambdaRole
        });

        this.indexingFunction = new NodejsFunction(this, 'IndexingLambda', {
            functionName: 'change-streams-demo-indexing',
            entry: path.join(__dirname, '..', 'functions', 'indexing.ts'),
            vpc: this.props.vpc,
            securityGroups: [this.props.lambdSecurityGroup],
            environment: {
                OPEN_SEACH_DOMAIN_ENDPOINT: this.props.openSearchDomainEndpoint
            },
            role: roles.indexingLambdaRole
        });

        this.configFunction = new NodejsFunction(this, 'ConfigLambda', {
            functionName: 'change-streams-demo-config',
            entry: path.join(__dirname, '..', 'functions', 'config.ts'),
            vpc: this.props.vpc,
            securityGroups: [this.props.lambdSecurityGroup],
            environment: {
                DOCUMENT_DB_SECRET: this.props.documentDbSecretArn,
                DOCUMENT_DB_ENDPOINT: this.props.documentDbEndpoint
            },
            role: roles.documentDbAccessLambdaRole
        });
    }

    private createApiGateway() {
        const apiGateway = new RestApi(this, 'ApiGateway', {
            restApiName: 'change-streams-demo-api-gateway'
        });

        const resource = apiGateway.root.addResource('demo-data');
        resource.addMethod('POST', new LambdaIntegration(this.writerFunction, { proxy: true }));
        resource.addMethod('GET', new LambdaIntegration(this.readerFunction, { proxy: true }));

        const configResource = apiGateway.root.addResource('config');
        configResource.addMethod('POST', new LambdaIntegration(this.configFunction, { proxy: true }));
    }

    private createEventSourceMapping() {
        new CfnEventSourceMapping(this, 'DocumentDbEventSourceMapping', {
            functionName: this.indexingFunction.functionName,
            eventSourceArn: this.props.documentDbClusterArn,

            sourceAccessConfigurations: [
                {
                    type: 'BASIC_AUTH',
                    uri: this.props.documentDbSecretArn
                }
            ],
            documentDbEventSourceConfig: {
                collectionName: 'demo-data',
                databaseName: 'demo',
                fullDocument: 'fullDocument'
            }
        });
    }

    private createLambdaRoles(): { documentDbAccessLambdaRole: Role; openSearchAccessLambdaRole: Role; indexingLambdaRole: Role } {
        const documentDbAccessLambdaRole = new Role(this, 'DocumentDbAccessLambdaRole', {
            roleName: 'DocumentDbAccessLambdaRole',
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')],
            inlinePolicies: {
                documentDbAccessPolicy: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            sid: 'DocumentDbSecretAccess',
                            resources: [this.props.documentDbSecretArn],
                            actions: ['secretsmanager:GetSecretValue']
                        })
                    ]
                })
            }
        });

        const openSearchAccessLambdaRole = new Role(this, 'OpenSearchAccessLambdaRole', {
            roleName: 'OpenSearchAccessLambdaRole',
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')],
            inlinePolicies: {
                openSearchAccessPolicy: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            sid: 'OpenSearchAccess',
                            resources: [`${this.props.openSearchDomainArn}/*`],
                            actions: ['es:ESHttpPost', 'es:ESHttpPut', 'es:ESHttpGet']
                        })
                    ]
                })
            }
        });

        const indexingLambdaRole = new Role(this, 'IndexingLambdaRole', {
            roleName: 'IndexingLambdaRole',
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')],
            inlinePolicies: {
                indexingLambdaPolicy: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            sid: 'ESMNetworkingAccess',
                            resources: ['*'],
                            actions: [
                                'ec2:CreateNetworkInterface',
                                'ec2:DescribeNetworkInterfaces',
                                'ec2:DescribeVpcs',
                                'ec2:DeleteNetworkInterface',
                                'ec2:DescribeSubnets',
                                'ec2:DescribeSecurityGroups',
                                'kms:Decrypt'
                            ]
                        }),
                        new PolicyStatement({
                            sid: 'ESMAccessDocumentDbAccess',
                            resources: ['*'],
                            actions: ['rds:DescribeDBClusters', 'rds:DescribeDBClusterParameters', 'rds:DescribeDBSubnetGroups']
                        }),
                        new PolicyStatement({
                            sid: 'OpenSearchAccess',
                            resources: [`${this.props.openSearchDomainArn}/*`],
                            actions: ['es:ESHttpPost', 'es:ESHttpPut', 'es:ESHttpGet']
                        })
                    ]
                })
            }
        });

        return { documentDbAccessLambdaRole, openSearchAccessLambdaRole, indexingLambdaRole };
    }
}
