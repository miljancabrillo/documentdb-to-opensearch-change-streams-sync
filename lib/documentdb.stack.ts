import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { DatabaseCluster } from 'aws-cdk-lib/aws-docdb';
import { InstanceClass, InstanceSize, InstanceType, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
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
            dbClusterName: 'documentdb-cluster',
            masterUser: {
                username: 'admin',
                secretName: 'documentdb/admin'
            },
            instanceType: InstanceType.of(InstanceClass.STANDARD5, InstanceSize.MICRO),
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

    public getClusterArn(): string {
        return this.documentDbCluster.clusterIdentifier;
    }
}
