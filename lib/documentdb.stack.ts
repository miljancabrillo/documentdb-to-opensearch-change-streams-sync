import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { DatabaseCluster } from 'aws-cdk-lib/aws-docdb';
import { InstanceClass, InstanceSize, InstanceType, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface DocumentDbStackProps extends StackProps {
    vpc: Vpc;
    documentDbSecurityGroup: SecurityGroup;
}

export class DocumentDbStack extends Stack {
    private documentDbCluster: DatabaseCluster;

    constructor(scope: Construct, id: string, private props: DocumentDbStackProps) {
        super(scope, id, props);

        this.createDocumentDbCluster();
    }

    private createDocumentDbCluster() {
        this.documentDbCluster = new DatabaseCluster(this, 'DocumentDbCluster', {
            dbClusterName: 'change-streams-demo-cluster',
            engineVersion: '4.0.0',
            masterUser: {
                username: 'admin_user',
                secretName: 'documentdb/admin_user'
            },
            instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_WITH_EGRESS
            },
            vpc: this.props.vpc,
            removalPolicy: RemovalPolicy.DESTROY,
            securityGroup: this.props.documentDbSecurityGroup
        });
    }

    public getSecretArn(): string {
        return this.documentDbCluster.secret!.secretArn;
    }

    public getClusterEndpoint(): string {
        return this.documentDbCluster.clusterEndpoint.hostname;
    }

    public getClusterIdentifier(): string {
        return this.documentDbCluster.clusterIdentifier;
    }
}
