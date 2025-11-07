async function getMachineToMachineToken() {
  try {
    const response = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.AUTH0_MACHINE_TO_MACHINE_CLIENT_ID,
        client_secret: process.env.AUTH0_MACHINE_TO_MACHINE_CLIENT_SECRET,
        audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
        grant_type: 'client_credentials'
      })
    });
    const data = await response.json();
    console.log('Machine to machine token obtenido:', data);
    return data.access_token;
  } catch (error) {
    console.error('Error getting machine to machine token:', error);
    throw error;
  }
}

async function blockUserInAuth0(auth0Id) {
  try {
    const token = await getMachineToMachineToken();
    const response = await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/users/${auth0Id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ blocked: true })
    });
    return response;
  } catch (error) {
    console.error(`Error blocking user ${auth0Id} in Auth0:`, error);
    throw error;
  }
}

async function unblockUserInAuth0(auth0Id) {
  try {
    const token = await getMachineToMachineToken();
    const response = await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/users/${auth0Id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ blocked: false })
    });
    return response;
  } catch (error) {
    console.error(`Error unblocking user ${auth0Id} in Auth0:`, error);
    throw error;
  }
}

module.exports = { getMachineToMachineToken, blockUserInAuth0, unblockUserInAuth0 };