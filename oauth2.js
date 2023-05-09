const { OAuth2Client } = require('google-auth-library');
const { promises } = require("fs");
const destroyer = require('server-destroy');
const fetch = require("node-fetch");
const http = require("http");   
const open = require('open');
const url = require('url');

const CREDENTIALS = {
  client_id: 'client_id_here',
  client_secret: 'client_secret_here'
}

/**
 * Path to the photosphere file
 */
const PHOTOSPHERE_PATH = process.argv[2]; 

/**
 * API URLs, do not edit
 */
const AUTH_SCOPE = "https://www.googleapis.com/auth/streetviewpublish";
const BASE_URL   = "https://streetviewpublish.googleapis.com/v1/photo"; 

/**
 * Acquire user tokens using OAuth2
 * @returns {Promise} access and refresh token
 */
function getAuthenticatedClient() {
  return new Promise((resolve, reject) => {
    // create an oAuth client to authorize the API call.  Secrets are kept in a `keys.json` file,
    const oAuth2Client = new OAuth2Client(CREDENTIALS.client_id, CREDENTIALS.client_secret, "http://localhost:8080");

    // Generate the url that will be used for the consent dialog.
    const authorizeUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: AUTH_SCOPE });

    // Open an http server to accept the oauth callback.
    const server = http.createServer(async (req, res) => {
        try {
            // acquire the code from the querystring, and close the web server.
            const qs = new url.URL(req.url, 'http://localhost:8080').searchParams;
            const code = qs.get('code');

            res.end('Authentication successful! Please return to the console.');
            server.destroy();

            // get tokens
            const r = await oAuth2Client.getToken(code);

            // resolve them
            resolve(r.tokens);
        } catch (e) { reject(e); }
      }).listen(8080, () => open(authorizeUrl, {wait: false}).then(cp => cp.unref()));
    destroyer(server);
  });
}

/**
 * Try to acquire the Bearer auth token using credentials file
 * @returns {Promise<string>} accessToken
 */
async function getBearer() {
    let c = await getAuthenticatedClient();

    console.log(`Successfully acquired accessToken: ${c.access_token.substring(0,24)}...`)

    return c.access_token;
}

/**
 * Get the upload URL
 * @param {string} accessToken auth token
 * @param {Buffer} bytes photo bytes
 * @returns {Promise<string>} url
 */
async function startUpload(accessToken, bytes) {
    // Make a call to the Google API
    let upload = await fetch(BASE_URL+':startUpload', {
        method: 'POST',
        headers: { 'authorization': 'Bearer '+accessToken, 'Content-Length': bytes.length }
    });
      
    let json = await upload.json();
    let url  = json["uploadUrl"];

    console.log(`Successfully retrieved upload URL: ${url.substring(0,24)}...`);

    return url;
} 

/**
 * Try to get the bytes from file using its path
 * @param {string} fileName path of the file
 * @returns {Promise<Buffer>}
 */
async function getBytes(fileName) {
    // Get file bytes
    let bytes = await promises.readFile(fileName);

    console.log(`Read ${String(bytes.length)} bytes`);

    return bytes;
}

/**
 * Try to publish the file to Google Maps servers
 * @param {string} accessToken auth token 
 * @param {string} ref Reference URL from startUpload()
 * @returns {Promise<fetch.Response>}
 */
async function create(accessToken, ref) {
    // Publish photo to the server
    let photo = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer '+accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          "uploadReference": {
            "uploadUrl": ref
          }
        })
      });
    
    let result = await photo.json();
    
    return result;
}

async function uploadAndPublish(fileName) {
    if(!fileName) throw Error("File name cannot be empty");

    // Try to get bytes (read file, will throw Error if doesn't exist)
    let bytes = await getBytes(fileName);

    // Get the Bearer token and upload URL
    let token = await getBearer();
    let url = await startUpload(token, bytes);
    
    // Prepare the headers
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "image/jpeg",
      "X-Goog-Upload-Protocol": "raw",
      "X-Goog-Upload-Content-Length": String(bytes.length)
    }

    // Try to upload the file
    console.log("Uploading the file...")
    let upload = await fetch(url, { method: "POST", headers: headers, body: bytes });

    if(!upload.ok) throw Error("Upload Failed")

    // Try to create (publish) the photo
    let result = await create(token, url);

    console.log(JSON.stringify(result));
}
uploadAndPublish(PHOTOSPHERE_PATH);