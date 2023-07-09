import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Domain, EngineVersion } from 'aws-cdk-lib/aws-opensearchservice';
import { Construct } from 'constructs';

export interface OpenSearchStackProps extends StackProps {
    vpc: Vpc;
    openSearchSecurityGroup: SecurityGroup;
}

export class OpenSearchStack extends Stack {
    private openSearchDomain: Domain;

    constructor(scope: Construct, id: string, private props: OpenSearchStackProps) {
        super(scope, id, props);
        this.createDomain();
    }

    private createDomain() {
        this.openSearchDomain = new Domain(this, 'OpenSearchDomain', {
            domainName: 'change-streams-demo-domain',
            version: EngineVersion.OPENSEARCH_2_3,
            vpc: this.props.vpc,
            vpcSubnets: [{ subnetType: SubnetType.PRIVATE_WITH_EGRESS }],
            securityGroups: [this.props.openSearchSecurityGroup],
            capacity: {
                dataNodes: 1,
                dataNodeInstanceType: 't2.small.search'
            },
            removalPolicy: RemovalPolicy.DESTROY
        });
    }

    public getDomainEndpoint(): string {
        return this.openSearchDomain.domainEndpoint;
    }

    public getDomainArn(): string {
        return this.openSearchDomain.domainArn;
    }
}
