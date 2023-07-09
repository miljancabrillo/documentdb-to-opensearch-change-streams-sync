import { createMongoClient } from './common';

export async function handler(event: any) {
    const client = await createMongoClient();
    const db = client.db('demo-db');

    await db.createCollection('demo-collection');
    await db.admin().command({
        modifyChangeStreams: 1,
        database: 'demo-db',
        collection: 'demo-collection',
        enable: true
    });

    client.close();
    return { statusCode: 200 };
}
