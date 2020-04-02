# CertificateAppCredentials-CustomHeader-Sockets-Skills

This bot has been created using [Bot Framework](https://dev.botframework.com), it shows how to use CertificateAppCredentials, a CustomHeader, Web Socket connection and Skills.

## Prerequisites

- [Node.js](https://nodejs.org) version 10.14 or higher

    ```bash
    # determine node version
    node --version

## Key concepts in this sample

This sample is a modified version of [80.skills-simple-bot-to-bot](https://github.com/microsoft/BotBuilder-Samples/tree/master/samples/javascript_nodejs/80.skills-simple-bot-to-bot).  The solution includes a parent bot and a skill bot and shows how the parent bot can receive a socket connection, use a CertificateAppCredentials implementation, add a custom header, and receive synchronous responses from a skill bot using Skill Dialog.

```javascript

class SignRequestAppCredentials extends CertificateAppCredentials {
    async signRequest(webResource) {
        webResource.headers.set('x-api-key', process.env.xapikey);
        const token = await this.getToken();
        return new msrest.TokenCredentials(token).signRequest(webResource);
    }
}

class CustomCredentialsBotFrameworkAdapter extends BotFrameworkAdapter {
    async buildCredentials(appId, oAuthScope) {
        return new SignRequestAppCredentials(appId, adapterSettings.certificateThumbprint, adapterSettings.certificatePrivateKey, undefined, oAuthScope);
    }
}

```

## To try this sample

- Clone the repository

    ```bash
    git clone https://github.com/EricDahlvang/CertificateAppCredentials-CustomHeader-Sockets-Skills.git
    ```

- Create a bot registration in the azure portal for the `parent` and update [parent/example.env](parent/example.env) with the `MicrosoftAppId` of the new bot registration.
- Create a certificate, and upload it to the parent bot's App Registration https://ms.portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/Credentials/appId/YourParentBotMicrosoftAppId/objectId//defaultBlade/Credentials/isMSAApp/ ([more info](https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-certificate-credentials#register-your-certificate-with-microsoft-identity-platform))
- Export the private key for the certificate, and overwrite [parent/private-key.pem](parent/private-key.pem).  Also update [parent/example.env](parent.exampleenv) with the `CertificateThumbprint`.
- Create a bot registration in the azure portal for the `child` and update [child/example.env](child/example.env) with the `MicrosoftAppId` and `MicrosoftAppPassword` of the new bot registration.
- Update the `SkillAppId` variable in [parent/example.env](parent/example.env) with the `AppId` for the child skill you created in the previous step
- Add the `parent` `MicrosoftAppId` to the `AllowedCallers` comma separated list in [child/example.env](child/example.env)
- In a terminal, navigate to `.\child`

    ```bash
    cd .\child
    ```

- Install npm modules and start the bot

    ```bash
    npm install
    npm start
    ```

- Open a **second** terminal window and navigate to `.\parent`

    ```bash
    cd .\parent
    ```

- Install npm modules and start the bot

    ```bash
    npm install
    npm start
    ```

## Testing the bot using Windows Voice Assistant Client

[Windows Voice Assistant Client](https://github.com/Azure-Samples/Cognitive-Services-Voice-Assistant/tree/master/clients/csharp-wpf) is a Windows desktop application that allows bot developers to test and debug their bots on localhost or running remotely through a tunnel. 

For more information, see [tutorial-voice-enable-your-bot-speech-sdk](https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/tutorial-voice-enable-your-bot-speech-sdk)

