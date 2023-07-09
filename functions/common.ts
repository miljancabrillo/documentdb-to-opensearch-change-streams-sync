import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import * as AWS from 'aws-sdk';
import { MongoClient } from 'mongodb';

export const DOCUMENTDB_DATABASE = 'demo';
export const DOCUMENTDB_COLLECTION = 'demo-data';
export const OPENSEARCH_INDEX = 'demo-data';

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
        node: process.env.OPEN_SEACH_DOMAIN_ENDPOINT
    });
}

export async function createMongoClient(): Promise<MongoClient> {
    const secretsManager = new AWS.SecretsManager();

    const secret = await secretsManager.getSecretValue({ SecretId: process.env.DOCUMENT_DB_SECRET as string }).promise();
    const credentials = JSON.parse(secret.SecretString as string);

    return new MongoClient(`mongodb://${credentials.username}:${credentials.password}@${process.env.DOCUMENT_DB_ENDPOINT}`);
}
