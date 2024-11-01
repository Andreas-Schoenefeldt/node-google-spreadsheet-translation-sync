const pKey = require('./key');

pKey.unshift("-----BEGIN PRIVATE KEY-----");
pKey.push("-----END PRIVATE KEY-----");
pKey.push("");

const creds = {};

['comment', 'type', 'project_id', 'private_key_id',
    'private_key', 'client_email', 'client_id',
    'auth_uri', 'token_uri', 'auth_provider_x509_cert_url',
    'client_x509_cert_url', 'universe_domain'
].forEach((key) => {
    let val;
    switch (key) {
        case 'comment':
            val = "This is my the spreadsheet translation sync project at  https://console.developers.google.com";
            break;
        case 'type':
            val = "service" + "_account";
            break;
        case 'project_id':
            val = "seismic" + "-hexagon-" + "171311";
            break;
        case 'private_key_id':
            val = "02a1ae685c" + "a6acbfbb39a5f5b" + "b1ad46f278c58df";
            break;
        case 'private_key':
            val = pKey.join('\n');
            break;
        case 'client_email':
            val = "service" + "@" + "seismic-hex" + "agon-171311.iam.gservic" + "eaccount.com";
            break;
        case 'client_id':
            val = "116216769" + "033616725253";
            break;
        case 'auth_uri':
            val = "https://accounts.go" + "ogle.com/o/oauth2/auth";
            break;
        case 'token_uri':
            val = "https://oauth2.go" + "ogleapis.com/token";
            break;
        case 'auth_provider_x509_cert_url':
            val = "https://www.go" + "ogleapis.com/oauth2/v1/certs";
            break;
        case 'client_x509_cert_url':
            val = "https://www.go" + "ogleapis.com/robot/v1/metadata/x509/service%40sei" +
                "smic-hexagon-171311.iam.gserv" +
                "iceaccount.com";
            break;
        case 'universe_domain':
            val = "go" + "ogleapis.com";
            break;
    }

    creds[key] = val;
});

module.exports = creds;