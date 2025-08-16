// api/headless.js
import fs from 'fs';
import path from 'path';
import https from 'https';

// Vercel can access files from the project root during the build.
// Note: This makes the config read-only. For a writeable solution, Vercel KV would be needed.
const configPath = path.resolve(process.cwd(), 'src/headless/config/headless-config.json');

const getConfig = () => {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
};

const makeApiRequest = (url, options, body = null) => {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(data ? JSON.parse(data) : {});
                    } catch (e) { resolve(data); }
                } else {
                    reject({ statusCode: res.statusCode, message: `API Error: ${data}` });
                }
            });
        });
        req.on('error', (e) => reject({ statusCode: 500, message: e.message }));
        if (body) req.write(body);
        req.end();
    });
};

export default async function handler(req, res) {
    // We get the specific endpoint from a query parameter, e.g., /api/headless?endpoint=list-members
    const { endpoint } = req.query;
    const parsedBody = req.body;

    try {
        const config = getConfig();
        const { siteId } = parsedBody;
        const project = config.find(p => p.siteId === siteId);

        if (!project) {
            return res.status(404).json({ message: `Project configuration not found for siteId: ${siteId}.` });
        }

        const baseOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': project.apiKey,
                'wix-site-id': project.siteId,
            },
        };

        switch (endpoint) {
            case 'list-members': {
                const wixApiUrl = 'https://www.wixapis.com/members/v1/members?fieldsets=FULL&paging.limit=1000';
                const result = await makeApiRequest(wixApiUrl, { ...baseOptions, method: 'POST' }, JSON.stringify(parsedBody));
                return res.status(200).json(result);
            }
            case 'search': {
                const { query } = parsedBody;
                const wixApiUrl = 'https://www.wixapis.com/members/v1/members/query';
                const filter = query.includes('@') ? { "loginEmail": query } : { "$or": [{ "loginEmail": { "$contains": query } }, { "profile.nickname": { "$contains": query } }] };
                const requestBody = JSON.stringify({ fieldsets: ["FULL"], query: { filter, paging: { limit: 100 } } });
                const result = await makeApiRequest(wixApiUrl, { ...baseOptions, method: 'POST' }, requestBody);
                return res.status(200).json(result);
            }
             case 'delete': {
                const { membersToDelete } = parsedBody;
                // This logic would need to be expanded for full functionality
                console.log('Delete logic to be implemented for:', membersToDelete);
                return res.status(200).json({ message: "Delete endpoint called." });
            }
            default:
                return res.status(404).json({ message: `Endpoint /api/headless?endpoint=${endpoint} not found.` });
        }
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message });
    }
}