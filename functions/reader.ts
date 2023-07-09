import { OPENSEARCH_INDEX, createOpenSearchClient } from './common';

export async function handler() {
    const client = createOpenSearchClient();

    const searchResponse = await client.search({
        index: OPENSEARCH_INDEX,
        body: {
            query: {
                match_all: {}
            }
        }
    });

    return searchResponse.body.hits.hits;
}
