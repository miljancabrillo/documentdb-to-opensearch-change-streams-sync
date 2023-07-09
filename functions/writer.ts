import { DOCUMENTDB_COLLECTION, DOCUMENTDB_DATABASE, createMongoClient } from './common';

export async function handler(event: any) {
    console.log('Received event from API gateway: ', JSON.stringify(event));
    const client = await createMongoClient();

    const demoCollection = client.db(DOCUMENTDB_DATABASE).collection(DOCUMENTDB_COLLECTION);
    await demoCollection.insertOne(JSON.parse(event.body));
}
