import { Stack, StackProps } from 'aws-cdk-lib';
import { Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class VpcStack extends Stack {
    public vpc: Vpc;
    public lambdaSecurityGroup: SecurityGroup;
    public documentDbSecurityGroup: SecurityGroup;
    public openSearchSecurityGroup: SecurityGroup;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.createVpc();
        this.createSecurityGroups();
    }

    private createVpc() {
        this.vpc = new Vpc(this, 'Vpc', { vpcName: 'change-streams-demo-vpc' });
    }

    private createSecurityGroups() {
        this.lambdaSecurityGroup = new SecurityGroup(this, 'LambdaSecurityGroup', {
            vpc: this.vpc
        });

        this.openSearchSecurityGroup = new SecurityGroup(this, 'OpenSearchSecurityGroup', {
            vpc: this.vpc
        });

        this.documentDbSecurityGroup = new SecurityGroup(this, 'DocumentDbSecurityGroup', {
            vpc: this.vpc
        });

        this.openSearchSecurityGroup.addIngressRule(this.lambdaSecurityGroup, Port.tcp(443), 'Access from Lambda functions');

        this.documentDbSecurityGroup.addIngressRule(this.lambdaSecurityGroup, Port.tcp(27017), 'Access from Lambda functions');

        this.documentDbSecurityGroup.addIngressRule(
            this.documentDbSecurityGroup,
            Port.tcp(27017),
            'Self referencing inbound rule - access from Event Source Mapping'
        );
    }
}
