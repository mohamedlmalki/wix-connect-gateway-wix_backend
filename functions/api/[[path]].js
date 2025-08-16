// functions/api/[[path]].js

// Import the configuration directly. Note: This will be read-only on the deployed site.
import config from '../../../src/headless/config/headless-config.json';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Main function to handle all incoming requests to /api/*
 * @param {EventContext<any, string, any>} context - The Cloudflare function context.
 */
export async function onRequestPost(context) {
    // Reconstruct the path from the URL, e.g., "/headless/list-members"
    const path = "/" + context.params.path.join('/');

    try {
        const parsedBody = await context.request.json();
        const { siteId } = parsedBody;

        const project = config.find(p => p.siteId === siteId);

        if (!project) {
            return new Response(JSON.stringify({ message: `Project configuration not found for siteId: ${siteId}.` }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const baseOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': project.apiKey,
                'wix-site-id': project.siteId,
            },
        };

        // --- API ROUTER ---
        switch (path) {
            case '/headless/list-members': {
                const wixApiUrl = 'https://www.wixapis.com/members/v1/members?fieldsets=FULL&paging.limit=1000';
                const options = { ...baseOptions, method: 'GET' };
                const wixApiResponse = await fetch(wixApiUrl, options);
                return new Response(wixApiResponse.body, { status: wixApiResponse.status, headers: { 'Content-Type': 'application/json' } });
            }

            case '/headless/search': {
                const { query } = parsedBody;
                const wixApiUrl = 'https://www.wixapis.com/members/v1/members/query';
                const filter = query.includes('@') ? { "loginEmail": query } : { "$or": [{ "loginEmail": { "$contains": query } }, { "profile.nickname": { "$contains": query } }] };
                const requestBody = JSON.stringify({ fieldsets: ["FULL"], query: { filter, paging: { limit: 100 } } });
                const options = { ...baseOptions, method: 'POST', body: requestBody };
                const wixApiResponse = await fetch(wixApiUrl, options);
                return new Response(wixApiResponse.body, { status: wixApiResponse.status, headers: { 'Content-Type': 'application/json' } });
            }

            case '/headless/get-owner-contact-id': {
                 const wixApiUrl = `https://www.wixapis.com/sites/v1/sites/${siteId}/contributors`;
                 const options = { ...baseOptions, method: 'GET' };
                 const wixApiResponse = await fetch(wixApiUrl, options);
                 if (!wixApiResponse.ok) throw new Error("Failed to get contributors");
                 const result = await wixApiResponse.json();
                 const owner = result.contributors.find(c => c.role === 'OWNER');
                 if (owner && owner.contactId) {
                     return new Response(JSON.stringify({ contactId: owner.contactId }), { headers: { 'Content-Type': 'application/json' } });
                 } else {
                     throw new Error('Site owner could not be determined.');
                 }
            }

            case '/headless/bulk-delete-members': {
                const { memberIds } = parsedBody;
                const wixApiUrl = 'https://www.wixapis.com/members/v1/members/bulk/delete';
                const requestBody = JSON.stringify({ memberIds });
                const options = { ...baseOptions, method: 'POST', body: requestBody };
                const wixApiResponse = await fetch(wixApiUrl, options);
                return new Response(wixApiResponse.body, { status: wixApiResponse.status, headers: { 'Content-Type': 'application/json' } });
            }
            
            case '/headless/delete-contact': {
                const { contactId } = parsedBody;
                const wixApiUrl = `https://www.wixapis.com/contacts/v4/contacts/${contactId}`;
                const options = { ...baseOptions, method: 'DELETE' };
                await fetch(wixApiUrl, options);
                return new Response(JSON.stringify({ message: 'Contact deleted successfully.' }), { headers: { 'Content-Type': 'application/json' } });
            }
            
            // Note: add-site and delete-site endpoints are not included as they modify the local file system, which is not supported.

            default:
                return new Response(JSON.stringify({ message: `Endpoint ${path} not found.` }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                });
        }

    } catch (e) {
        return new Response(JSON.stringify({ message: 'An error occurred in the function.', error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}