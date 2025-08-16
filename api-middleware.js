import fs from 'fs';
import path from 'path';
import https from 'https';

// Define paths
const configDir = path.resolve(process.cwd(), 'src/headless/config');
const configPath = path.resolve(configDir, 'headless-config.json');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to ensure the config file exists
const ensureConfigFileExists = () => {
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, '[]', 'utf-8');
    }
};

// Helper function for making API requests
const makeApiRequest = (url, options, body = null) => {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        // Handle empty response body for success cases
                        if (data === '') {
                            resolve({ statusCode: res.statusCode, body: {} });
                            return;
                        }
                        resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                    } catch (e) {
                        resolve({ statusCode: res.statusCode, body: data });
                    }
                } else {
                     try {
                        const parsedError = JSON.parse(data);
                        reject({ statusCode: res.statusCode, message: parsedError.message || data, details: parsedError.details });
                    } catch (e) {
                        reject({ statusCode: res.statusCode, message: `API Error with non-JSON response: ${data}` });
                    }
                }
            });
        });
        req.on('error', (e) => reject({ statusCode: 500, message: e.message }));
        if (body) {
            req.write(body);
        }
        req.end();
    });
};


export const apiMiddleware = (req, res, next) => {
  if (!req.url.startsWith('/api/headless-')) {
    return next();
  }

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const parsedBody = body ? JSON.parse(body) : {};
      
      ensureConfigFileExists();

      if (req.url === '/api/headless-add-site' && req.method === 'POST') {
        const { siteName, siteId, apiKey, campaignId, originalSiteId } = parsedBody;
        if (!siteName || !siteId || !apiKey) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ message: "Request must include siteName, siteId, and apiKey." }));
        }
        
        try {
          const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          const lookupId = originalSiteId || siteId;
          const siteIndex = currentConfig.findIndex(site => site.siteId === lookupId);
          
          const newSiteEntry = { projectName: siteName, siteId, apiKey, campaignId };

          if (siteIndex > -1) {
            currentConfig[siteIndex] = newSiteEntry;
          } else {
            currentConfig.push(newSiteEntry);
          }

          fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));
          
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ message: 'Local config updated successfully.' }));

        } catch (writeError) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ message: 'Failed to write to local config file.', error: writeError.message }));
        }
      }
      
      if (req.url === '/api/headless-delete-site' && req.method === 'POST') {
          const { siteId } = parsedBody;
          if (!siteId) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ message: "Request must include a siteId." }));
          }
          try {
              let currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
              const newConfig = currentConfig.filter(site => site.siteId !== siteId);
              
              fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ message: 'Site successfully removed from local config.' }));
          } catch (writeError) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ message: 'Failed to update local config file.', error: writeError.message }));
          }
      }
      
      // Handle new campaign/validation endpoints separately
      if (req.url === '/api/headless-validate-html' || req.url === '/api/headless-validate-url' || req.url === '/api/headless-send-test-email') {
            const { siteId } = parsedBody;
            const projects = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            const project = projects.find(p => p.siteId === siteId);

            if (!project) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ message: "Project configuration not found." }));
            }
            // These APIs do NOT use wix-site-id header
            const options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': project.apiKey,
                }
            };
            
            let apiUrl = '';
            let requestBody = '';

            try {
                if (req.url === '/api/headless-send-test-email') {
                    const { toEmailAddress, emailSubject } = parsedBody;
                    if (!project.campaignId) {
                        throw new Error("No Campaign ID is configured for this site.");
                    }
                    apiUrl = `https://www.wixapis.com/email-marketing/v1/campaigns/${project.campaignId}/test`;
                    
                    // Reordered payload to match Wix documentation
                    requestBody = JSON.stringify({ emailSubject, toEmailAddress });
                    
                    options.method = 'POST';
                    options.headers['Content-Length'] = Buffer.byteLength(requestBody);
                    const result = await makeApiRequest(apiUrl, options, requestBody);
                    res.statusCode = result.statusCode;
                    res.end(JSON.stringify(result.body));
                } else if (req.url === '/api/headless-validate-html') {
                    const { html } = parsedBody;
                    apiUrl = `https://www.wixapis.com/email-marketing/v1/campaign-validation/validate-html-links`;
                    requestBody = JSON.stringify({ html });
                    options.method = 'POST';
                    options.headers['Content-Length'] = Buffer.byteLength(requestBody);
                    const result = await makeApiRequest(apiUrl, options, requestBody);
                    res.statusCode = result.statusCode;
                    res.end(JSON.stringify(result.body));
                } else if (req.url === '/api/headless-validate-url') {
                    const { url } = parsedBody;
                    apiUrl = `https://www.wixapis.com/email-marketing/v1/campaign-validation/validate-link`;
                    requestBody = JSON.stringify({ url });
                    options.method = 'POST';
                    options.headers['Content-Length'] = Buffer.byteLength(requestBody);
                    const result = await makeApiRequest(apiUrl, options, requestBody);
                    res.statusCode = result.statusCode;
                    res.end(JSON.stringify(result.body));
                }
            } catch (error) {
                // Enhanced error logging
                console.error(`\n[API Middleware] Error making request to: ${req.url}`);
                console.error(`[API Middleware] Wix URL: ${apiUrl}`);
                console.error(`[API Middleware] Payload: ${requestBody}`);
                console.error(`[API Middleware] Status Code: ${error.statusCode || 500}`);
                console.error(`[API Middleware] Response Body:`, { message: error.message, details: error.details || 'No details provided.' });
                
                res.statusCode = error.statusCode || 500;
                res.end(JSON.stringify({ message: error.message, details: error.details || {} }));
            }
            return;
      }

      const { siteId } = parsedBody;
      const headlessProjects = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const project = headlessProjects.find(p => p.siteId === siteId);

      if (!project) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ message: `Project configuration not found for siteId: ${siteId}. Please add it to headless-config.json.` }));
      }

      const defaultOptions = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': project.apiKey,
          'wix-site-id': project.siteId,
        }
      };
      
      if (req.url === '/api/headless-get-owner-contact-id') {
        const wixApiUrl = `https://www.wixapis.com/sites/v1/sites/${siteId}/contributors`;
        const options = { ...defaultOptions, method: 'GET' };
        try {
            const result = await makeApiRequest(wixApiUrl, options);
            const owner = result.body.contributors.find(c => c.role === 'OWNER');
            if (owner && owner.contactId) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ contactId: owner.contactId }));
            } else {
                throw new Error('Site owner could not be determined from contributors list.');
            }
        } catch (error) {
            res.statusCode = error.statusCode || 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: 'Failed to retrieve site owner information.', error: error.message }));
        }
        return;
      }
      
      if (req.url === '/api/headless-bulk-delete-members') {
          const { memberIds } = parsedBody;
          if (!memberIds || !Array.isArray(memberIds)) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ message: 'Request must include a memberIds array.' }));
          }
          const wixApiUrl = 'https://www.wixapis.com/members/v1/members/bulk/delete';
          const requestBody = JSON.stringify({ memberIds });
          const options = { ...defaultOptions, method: 'POST', headers: { ...defaultOptions.headers, 'Content-Length': Buffer.byteLength(requestBody) } };
          
          try {
              const result = await makeApiRequest(wixApiUrl, options, requestBody);
              res.statusCode = result.statusCode;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result.body));
          } catch (error) {
              res.statusCode = error.statusCode || 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ message: 'Failed to delete members.', error: error.message }));
          }
          return;
      }
      
      if (req.url === '/api/headless-delete-contact') {
        const { contactId } = parsedBody;
        if (!contactId) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ message: "Request must include a contactId." }));
        }
        const wixApiUrl = `https://www.wixapis.com/contacts/v4/contacts/${contactId}`;
        const options = { ...defaultOptions, method: 'DELETE' };
        try {
            const result = await makeApiRequest(wixApiUrl, options);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: 'Contact deleted successfully.' }));
        } catch (error) {
            res.statusCode = error.statusCode || 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: `Failed to delete contact ${contactId}.`, error: error.message }));
        }
        return;
    }

      if (req.url === '/api/headless-list-members') {
          const wixApiUrl = 'https://www.wixapis.com/members/v1/members?fieldsets=FULL&paging.limit=1000';
          const options = { ...defaultOptions, method: 'GET' };
          const apiReq = https.request(wixApiUrl, options, apiRes => {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = apiRes.statusCode;
              apiRes.pipe(res);
          });
          apiReq.on('error', (e) => { 
              res.statusCode = 500; 
              res.end(JSON.stringify({ message: 'API call error.', error: e.message })); 
          });
          apiReq.end();
          return;
      }
      if (req.url === '/api/headless-search') {
        const { query } = parsedBody;
        const wixApiUrl = 'https://www.wixapis.com/members/v1/members/query';
        
        let filter;

        if (query.includes('@')) {
            filter = { "loginEmail": query };
        } else {
            filter = {
              "$or": [
                { "loginEmail": { "$contains": query } },
                { "profile.nickname": { "$contains": query } }
              ]
            };
        }

        const requestBody = JSON.stringify({
          fieldsets: ["FULL"],
          query: {
            filter: filter,
            paging: {
                limit: 100
            }
          }
        });

        const options = { ...defaultOptions, method: 'POST', headers: { ...defaultOptions.headers, 'Content-Length': Buffer.byteLength(requestBody) } };
        const apiReq = https.request(wixApiUrl, options, apiRes => apiRes.pipe(res));
        apiReq.on('error', (e) => { res.statusCode = 500; res.end(JSON.stringify({ message: 'API call error.' })); });
        apiReq.write(requestBody);
        apiReq.end();
      } 
      else if (req.url === '/api/headless-delete') {
          const { membersToDelete } = parsedBody;
          if (!membersToDelete || !Array.isArray(membersToDelete)) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ message: "Request must include a 'membersToDelete' array." }));
          }

          try {
            for (const member of membersToDelete) {
                const { memberId, contactId } = member;
                if (!memberId || !contactId) continue;
                
                const memberApiUrl = `https://www.wixapis.com/members/v1/members/${memberId}`;
                await new Promise((resolve, reject) => {
                    const delReq = https.request(memberApiUrl, { method: 'DELETE', headers: defaultOptions.headers }, (delRes) => {
                        if (delRes.statusCode >= 200 && delRes.statusCode < 300) {
                            delRes.resume();
                            resolve();
                        } else {
                            reject(new Error(`Failed to delete member. Status: ${delRes.statusCode}`));
                        }
                    });
                    delReq.on('error', reject);
                    delReq.end();
                });

                await sleep(500);

                const contactApiUrl = `https://www.wixapis.com/contacts/v4/contacts/${contactId}`;
                await new Promise((resolve, reject) => {
                    const delReq = https.request(contactApiUrl, { method: 'DELETE', headers: defaultOptions.headers }, (delRes) => {
                        if (delRes.statusCode >= 200 && delRes.statusCode < 300) {
                            delRes.resume();
                            resolve();
                        } else {
                            reject(new Error(`Failed to delete contact. Status: ${delRes.statusCode}`));
                        }
                    });
                    delReq.on('error', reject);
                    delReq.end();
                });
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: "SUCCESS", message: `${membersToDelete.length} members deleted successfully.` }));

          } catch (error) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ message: 'An error occurred during deletion.', error: error.message }));
          }
      } else {
        next();
      }
    } catch (e) {
      res.statusCode = 400;
      res.end(JSON.stringify({ message: 'Invalid request body or critical server error in middleware.' }));
    }
  });
};
