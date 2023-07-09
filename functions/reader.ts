import { createOpenSearchClient } from './common';

export async function handler() {
    const client = createOpenSearchClient();
    const searchResponse = await client.search({
        index: 'demo-data',
        body: {
            query: {
                match_all: {}
            }
        }
    });

    return searchResponse.body.hits.hits;
}
