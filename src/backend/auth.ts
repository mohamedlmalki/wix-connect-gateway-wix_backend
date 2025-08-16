import { authentication } from 'wix-members-backend';
import { contacts } from 'wix-crm-backend';

/**
 * Registers a new user on the site. This function is designed to be called
 * from the frontend for each user being imported.
 *
 * @param email - The user's email address.
 * @param password - The temporary password for the user.
 * @returns A result object indicating success or failure.
 */
export async function registerUser(email: string, password: string) {
  // First, check if a contact with this email already exists.
  // This helps prevent creating duplicate contacts if a member already exists.
  const existingContacts = await contacts.listContacts({ query: { "info.emails.email": { $eq: email } } });

  let contactId;

  if (existingContacts.items.length > 0) {
    // If contact exists, use its ID.
    contactId = existingContacts.items[0]._id;
  }
  // If no contact exists, the register function will create one automatically.

  try {
    const registrationResult = await authentication.register(email, password, {
      contactInfo: {
        // You can add more details here if needed, e.g., firstName, lastName.
        // For now, we only need the email which is handled by the main register function.
      },
    });

    // The registration was successful.
    return {
      success: true,
      status: registrationResult.status,
      member: registrationResult.member,
    };
  } catch (error) {
    console.error("Error during user registration:", error);
    // The registration failed.
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to register ${email}. Reason: ${errorMessage}`,
    };
  }
}