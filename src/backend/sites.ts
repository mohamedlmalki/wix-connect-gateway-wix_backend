// src/backend/sites.ts

import { webMethod, Permissions } from 'wix-web-module';
import { ok, created, badRequest, notFound, serverError } from 'wix-http-functions';
import wixData from 'wix-data';

// This is the structure of the data we expect to receive from the frontend
interface SiteData {
  siteName: string;
  siteId: string;
  apiKey: string;
}

/**
 * Adds a new site to the 'Sites' collection.
 * This web method is only accessible by site admins.
 */
export const addSite = webMethod(Permissions.Admin, async (siteData: SiteData) => {
  // 1. Validate that we received all the necessary data
  if (!siteData || !siteData.siteName || !siteData.siteId || !siteData.apiKey) {
    return badRequest({ body: { error: 'Missing required site information.' } });
  }

  try {
    // 2. Prepare the item to be inserted into the Wix Collection
    const toInsert = {
      siteName: siteData.siteName,
      siteId: siteData.siteId,
      apiKey: siteData.apiKey, // Note: For production, use Wix Secrets Manager to store API keys securely.
    };

    // 3. Insert the item into the "Sites" collection
    const result = await wixData.insert('Sites', toInsert);

    // 4. Return a successful "Created" response with the new item
    return created({ body: result });

  } catch (error) {
    console.error("Error in addSite function:", error);
    // 5. Return a server error if something goes wrong
    return serverError({ body: { error: 'Failed to add site to the database.' } });
  }
});

/**
 * Lists all sites from the 'Sites' collection.
 * This web method is only accessible by site admins.
 */
export const listSites = webMethod(Permissions.Admin, async () => {
  try {
    const results = await wixData.query('Sites').find();
    return ok({ body: results.items });
  } catch (error) {
    console.error("Error in listSites function:", error);
    return serverError({ body: { error: 'Could not retrieve sites from the database.' } });
  }
});