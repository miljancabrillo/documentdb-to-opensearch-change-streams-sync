import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import * as AWS from 'aws-sdk';
import { MongoClient } from 'mongodb';

export function createOpenSearchClient() {
    return new Client({
        ...AwsSigv4Signer({
            region: 'process.env.AWS_REGION',
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
        node: process.env.OPEN_SEARCH_API
    });
}

export function createMongoClient() {
    return new MongoClient(`mongodb://${'USERNAME'}:${'PASSWORD'}@${'HOST'}`);
}
