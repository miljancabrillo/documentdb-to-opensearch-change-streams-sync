import { createMongoClient } from './common';

export async function handler(event: any) {
    console.log('Received event from API gateway: ', JSON.stringify(event));
    const client = await createMongoClient();

    const demoCollection = client.db('demo-db').collection('demo-collection');
    await demoCollection.insertOne(JSON.parse(event.body));

    await client.close();
    return { statusCode: 200 };
}
