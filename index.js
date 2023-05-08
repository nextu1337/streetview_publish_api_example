const { StreetViewPublishServiceClient } = require('streetview-publish-client-libraries-v1');
const {  google  } = require('googleapis');
const { promises } = require("fs");
const fetch = require("node-fetch");

/**
 * File containing project_id, private_key, client_email, client_id etc.
 */
const CREDENTIALS_FILE = "./credentials.json";

/**
 * Path to the photosphere file
 */
const PHOTOSPHERE_PATH = process.argv[1]; 
const AUTH_SCOPE = "https://www.googleapis.com/auth/streetviewpublish"; // do not edit

/**
 * Try to acquire the Bearer auth token using credentials file
 * @returns {Promise<string>} accessToken
 */
async function getBearer() {
    // Create instance of GoogleAuth class
    const auth = new google.auth.GoogleAuth({ keyFile: CREDENTIALS_FILE, scopes: [ AUTH_SCOPE ] });

    // Get the access token
    const accessToken = await auth.getAccessToken();

    console.log(`Successfully acquired accessToken: ${accessToken.substring(0,24)}...`)

    return accessToken;
}

/**
 * Get the upload URL
 * @param {StreetViewPublishServiceClient} client Publish service client
 * @param {Buffer} bytes
 * @returns {Promise<string>} url
 */
async function startUpload(client, bytes) {
    // Make a call to the Google API
    let upload = await client.startUpload(bytes);

    // Will throw Error if response (or structure changes in the future which is unlikely)
    let url = upload[0].uploadUrl;

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

    console.log(`Read ${bytes.length} bytes`);

    return bytes;
}

/**
 * Try to publish the file to Google Maps servers
 * @param {StreetViewPublishServiceClient} client Publish service client
 * @param {string} ref Reference URL from startUpload()
 * @returns {Promise<fetch.Response>}
 */
async function create(client, ref) {
    // Publish photo to the server
    let photo = await client.createPhoto({photo: { uploadReference: { uploadUrl: ref } }});
    
    return photo;
}

async function uploadAndPublish(fileName) {
    if(!fileName) throw Error("File name cannot be empty");

    // Try to get bytes (read file, will throw Error if doesn't exist)
    let bytes = await getBytes(fileName);

    // Read credentials file
    let content = await promises.readFile(CREDENTIALS_FILE);
    let credentials = JSON.parse(content.toString());

    const client = new StreetViewPublishServiceClient({ credentials, projectId: credentials.project_id });

    // Get the Bearer token and upload URL
    let token = await getBearer();
    let url = await startUpload(client, bytes);

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
    let [ result ] = await create(client, url);

    console.log(result);
}

uploadAndPublish(PHOTOSPHERE_PATH);