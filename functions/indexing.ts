import { createOpenSearchClient } from './common';

export async function handler(changeStream: any) {
    const client = createOpenSearchClient();

    for (const { event } of changeStream.events) {
        console.log(`Received change stream event: `, JSON.stringify(event));
        await client.index({
            index: 'movies',
            body: event.fullDocument
        });
    }
}
