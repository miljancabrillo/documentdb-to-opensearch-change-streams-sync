import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { LambdaIntegration, Resource, RestApi } from 'aws-cdk-lib/aws-apigateway';
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
    documentDbClusterIdentifier: string;
    openSearchDomainArn: string;
    openSearchDomainEndpoint: string;
}

export class LambdaStack extends Stack {
    private syncFunction: NodejsFunction;
    private demoResource: Resource;
    private configResource: Resource;

    constructor(scope: Construct, id: string, private props: LambdaStackProps) {
        super(scope, id, props);

        this.createApiGateway();
        this.createLambdaFunctions();
        this.createEventSourceMapping();
    }

    private createApiGateway() {
        const apiGateway = new RestApi(this, 'ApiGateway', {
            restApiName: 'change-streams-demo-api-gateway'
        });

        this.demoResource = apiGateway.root.addResource('demo-data');
        this.configResource = apiGateway.root.addResource('config');
    }

    private createLambdaFunctions() {
        const roles = this.createLambdaRoles();

        const writerFunction = new NodejsFunction(this, 'WriterLambda', {
            functionName: 'change-streams-demo-writer',
            entry: path.join(__dirname, '..', 'functions', 'writer.ts'),
            vpc: this.props.vpc,
            securityGroups: [this.props.lambdSecurityGroup],
            environment: {
                DOCUMENT_DB_SECRET: this.props.documentDbSecretArn,
                DOCUMENT_DB_ENDPOINT: this.props.documentDbEndpoint
            },
            role: roles.documentDbAccessLambdaRole,
            timeout: Duration.seconds(15),
            bundling: {
                commandHooks: {
                    afterBundling: (inputDir: string, outputDir: string): string[] => [`cp ${inputDir}/certificate/global-bundle.pem ${outputDir}`],
                    beforeBundling: (inputDir: string, outputDir: string): string[] => [],
                    beforeInstall: (inputDir: string, outputDir: string): string[] => []
                }
            }
        });
        this.demoResource.addMethod('POST', new LambdaIntegration(writerFunction, { proxy: true }));

        const readerFunction = new NodejsFunction(this, 'ReaderLambda', {
            functionName: 'change-streams-demo-reader',
            entry: path.join(__dirname, '..', 'functions', 'reader.ts'),
            vpc: this.props.vpc,
            securityGroups: [this.props.lambdSecurityGroup],
            environment: {
                OPEN_SEACH_DOMAIN_ENDPOINT: this.props.openSearchDomainEndpoint
            },
            role: roles.openSearchAccessLambdaRole,
            timeout: Duration.seconds(15)
        });
        this.demoResource.addMethod('GET', new LambdaIntegration(readerFunction, { proxy: true }));

        this.syncFunction = new NodejsFunction(this, 'SyncLambda', {
            functionName: 'change-streams-demo-sync',
            entry: path.join(__dirname, '..', 'functions', 'sync.ts'),
            vpc: this.props.vpc,
            securityGroups: [this.props.lambdSecurityGroup],
            environment: {
                OPEN_SEACH_DOMAIN_ENDPOINT: this.props.openSearchDomainEndpoint
            },
            role: roles.indexingLambdaRole,
            timeout: Duration.seconds(15)
        });

        const configFunction = new NodejsFunction(this, 'ConfigLambda', {
            functionName: 'change-streams-demo-config',
            entry: path.join(__dirname, '..', 'functions', 'config.ts'),
            vpc: this.props.vpc,
            securityGroups: [this.props.lambdSecurityGroup],
            environment: {
                DOCUMENT_DB_SECRET: this.props.documentDbSecretArn,
                DOCUMENT_DB_ENDPOINT: this.props.documentDbEndpoint
            },
            role: roles.documentDbAccessLambdaRole,
            timeout: Duration.seconds(15),
            bundling: {
                commandHooks: {
                    afterBundling: (inputDir: string, outputDir: string): string[] => [`cp ${inputDir}/certificate/global-bundle.pem ${outputDir}`],
                    beforeBundling: (inputDir: string, outputDir: string): string[] => [],
                    beforeInstall: (inputDir: string, outputDir: string): string[] => []
                }
            }
        });
        this.configResource.addMethod('POST', new LambdaIntegration(configFunction, { proxy: true }));
    }

    private createEventSourceMapping() {
        const esm = new CfnEventSourceMapping(this, 'DocumentDbEventSourceMapping', {
            functionName: this.syncFunction.functionName,
            eventSourceArn: `arn:aws:rds:${Stack.of(this).region}:${Stack.of(this).account}:cluster:${this.props.documentDbClusterIdentifier}`,
            sourceAccessConfigurations: [
                {
                    type: 'BASIC_AUTH',
                    uri: this.props.documentDbSecretArn
                }
            ],
            enabled: false,
            documentDbEventSourceConfig: {
                collectionName: 'demo-collection',
                databaseName: 'demo-db',
                fullDocument: 'UpdateLookup'
            }
        });

        new CfnOutput(this, 'EventSourceMappingId', {
            value: esm.attrId,
            description: 'The id of the ESM',
            exportName: 'esm-id'
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

        const syncLambdaRole = new Role(this, 'SyncLambdaRole', {
            roleName: 'SyncLambdaRole',
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')],
            inlinePolicies: {
                syncLambdaPolicy: new PolicyDocument({
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
                            sid: 'ESMADocumentDbAccess',
                            resources: ['*'],
                            actions: ['rds:DescribeDBClusters', 'rds:DescribeDBClusterParameters', 'rds:DescribeDBSubnetGroups']
                        }),
                        new PolicyStatement({
                            sid: 'ESMDocumentDbSecretAccess',
                            resources: [this.props.documentDbSecretArn],
                            actions: ['secretsmanager:GetSecretValue']
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

        return { documentDbAccessLambdaRole, openSearchAccessLambdaRole, indexingLambdaRole: syncLambdaRole };
    }
}
