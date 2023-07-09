import { createOpenSearchClient } from './common';

export async function handler(changeStream: any) {
    const client = createOpenSearchClient();

    for (const { event } of changeStream.events) {
        console.log(`Received change stream event: `, JSON.stringify(event));

        const { _id, ...document } = event.fullDocument;
        await client.index({
            index: 'demo-index',
            id: _id.$oid,
            body: document
        });
    }
}
