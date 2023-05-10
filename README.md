# streetview_publish_api_example
A Street View Publish API example written in node.js for both service account and OAuth2<br>

<small>Note: GPS location MUST be included in exif data</small><br>
<small>Note 2: Remember to turn on the API for your Google project (if using OAuth2: add your email to allowed list)</small>
# Installation
```bash
git clone https://github.com/nextu1337/streetview_publish_api_example.git
```
and then inside the folder
```bash
npm install
```
# Configuration and Launch

## Service account:
- change `credentials.json` to whatever Google gives you after creating service account (structure MUST stay the same)
- `npm i googleapis streetview-publish-client-libraries-v1`
- `node service_account.js ./photosphere.jpg`

## OAuth2
- change `CREDENTIALS` constant inside `oauth2.js` to what id and secret Google assigned you
- `node oauth2.js ./photosphere.jpg`
<br>


# Why bother making this?
Well the reason is simple, Google doesn't have a SINGLE node.js example for doing this. Sure, you may say "but they link their npm library". Well, that client afaik can only use service accounts and I don't want my photospheres to be uploaded by `serviceaccount-589345@projectname-92439234.gserviceaccount.com` and actually from <b>MY ACCOUNT</b><br>
And I know, I could've used their Python examples but guess what, it didn't work at all, import errors and all that stuff, I had to fix it manually and eventually succeeded but I don't like Python all that much

I might write a nicer wrapper in TypeScript