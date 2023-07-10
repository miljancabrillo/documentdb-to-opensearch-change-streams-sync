import { createOpenSearchClient } from './common';

export async function handler() {
    const client = createOpenSearchClient();

    const searchResponse = await client.search({
        index: 'demo-index',
        body: {
            query: {
                match_all: {}
            }
        }
    });

    client.close();
    return { statusCode: 200, body: JSON.stringify(searchResponse.body.hits?.hits) };
}
