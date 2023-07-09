import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import * as AWS from 'aws-sdk';
import { MongoClient } from 'mongodb';

export function createOpenSearchClient(): Client {
    return new Client({
        ...AwsSigv4Signer({
            region: process.env.AWS_REGION as string,
            getCredentials: () =>
                new Promise((resolve, reject) => {
                    AWS.config.getCredentials((err, credentials) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(credentials);
                        }
                    });
                })
        }),
        node: `https://${process.env.OPEN_SEACH_DOMAIN_ENDPOINT}`
    });
}

export async function createMongoClient(): Promise<MongoClient> {
    const secretsManager = new AWS.SecretsManager();

    const secret = await secretsManager.getSecretValue({ SecretId: process.env.DOCUMENT_DB_SECRET as string }).promise();
    const credentials = JSON.parse(secret.SecretString as string);

    const client = new MongoClient(`mongodb://${credentials.username}:${encodeURIComponent(credentials.password)}@${process.env.DOCUMENT_DB_ENDPOINT}`, {
        tls: true,
        tlsCAFile: 'global-bundle.pem',
        retryWrites: false
    });
    return client.connect();
}
