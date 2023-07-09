import { DOCUMENTDB_COLLECTION, DOCUMENTDB_DATABASE, createMongoClient } from './common';

export async function handler(event: any) {
    const client = await createMongoClient();
    const db = client.db(DOCUMENTDB_DATABASE);

    await db.createCollection(DOCUMENTDB_COLLECTION);
    await db.admin().command({
        modifyChangeStreams: 1,
        database: DOCUMENTDB_DATABASE,
        collection: DOCUMENTDB_COLLECTION,
        enable: true
    });
}
