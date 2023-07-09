import { createMongoClient } from './common';

export async function handler(event: any) {
    console.log('Received event from API gateway: ', JSON.stringify(event));
    const client = createMongoClient();

    const moviesCollection = client.db('').collection('');
    await moviesCollection.insertOne(JSON.parse(event.body));
}
