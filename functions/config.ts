import { createMongoClient } from './common';

export async function handler(event: any) {
    const client = createMongoClient();
    const database = client.db('');

    await database.createCollection('');
    await database.admin().command({
        modifyChangeStreams: 1,
        database: '',
        collection: '',
        enable: true
    });
}
