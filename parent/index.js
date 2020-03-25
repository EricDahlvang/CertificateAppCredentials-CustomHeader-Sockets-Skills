// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const fs = require("fs");
const restify = require('restify');
const path = require('path');

const axios = require('axios');
axios.interceptors.request.use(function(config) {
    config.headers['x-api-key'] = process.env.xapikey;
  return config;
}, function(err) {
  return Promise.reject(err);
});

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter, ChannelServiceRoutes, ConversationState, MemoryStorage, UserState, SkillHandler, SkillHttpClient } = require('botbuilder');
const { AuthenticationConfiguration, SimpleCredentialProvider, CertificateAppCredentials } = require('botframework-connector');
const { SkillDialog } = require('botbuilder-dialogs');

// Import our custom bot class that provides a turn handling function.
const { DialogBot } = require('./bots/dialogBot');
const { MainDialog } = require('./dialogs/mainDialog');

// Read environment variables from .env file
const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });
const { allowedSkillsClaimsValidator } = require('./authentication/allowedSkillsClaimsValidator');
const { SkillsConfiguration } = require('./skillsConfiguration');
const { SkillConversationIdFactory } = require('./skillConversationIdFactory');

const url = require('url');
const msrest = require('@azure/ms-rest-js');

// Create the adapter. See https://aka.ms/about-bot-adapter to learn more about using information from
// the .bot file when configuring your adapter.

const keyPemFile = "./private-key.pem";
const pkFromFile = fs.readFileSync(
    path.resolve(__dirname, keyPemFile),
    { encoding: 'utf8'}
);

const adapterSettings = {
    appId: process.env.MicrosoftAppId,
    // appPassword: process.env.MicrosoftAppPassword,
    certificatePrivateKey: pkFromFile,
    certificateThumbprint: process.env.CertificateThumbprint,
    authConfig: new AuthenticationConfiguration([], allowedSkillsClaimsValidator)
}

class SignRequestAppCredentials extends CertificateAppCredentials {
    async signRequest(webResource) {
        //if(AppCredentials.isTrustedServiceUrl(webResource.url)){
            webResource.headers.set('x-api-key', process.env.xapikey);
            const token = await this.getToken();
            return new msrest.TokenCredentials(token).signRequest(webResource);
        //}
        //return webResource;
    }
}

class CustomCredentialsBotFrameworkAdapter extends BotFrameworkAdapter {
    async buildCredentials(appId, oAuthScope) {
        return new SignRequestAppCredentials(appId, adapterSettings.certificateThumbprint, adapterSettings.certificatePrivateKey, undefined, oAuthScope);
    }
}

const adapter = new CustomCredentialsBotFrameworkAdapter(adapterSettings);

const onTurnErrorHandler = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError] unhandled error: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

// Set the onTurnError for the singleton BotFrameworkAdapter.
adapter.onTurnError = onTurnErrorHandler;

// Define the state store for your bot.
// See https://aka.ms/about-bot-state to learn more about using MemoryStorage.
// A bot requires a state storage system to persist the dialog and user state between messages.
const memoryStorage = new MemoryStorage();

// Create conversation state with in-memory storage provider.
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

class BuildCredentialsSkillHttpClient extends SkillHttpClient {
    async buildCredentials(appId, oAuthScope) {
        return new SignRequestAppCredentials(appId, adapterSettings.certificateThumbprint, adapterSettings.certificatePrivateKey, undefined, oAuthScope);
    }
}

const credentialProvider = new SimpleCredentialProvider(process.env.MicrosoftAppId, '');
const conversationIdFactory = new SkillConversationIdFactory();
const skillClient = new BuildCredentialsSkillHttpClient(credentialProvider, conversationIdFactory);


// Load skills configuration
const skillsConfig = new SkillsConfiguration();

const skillDialog = new SkillDialog({
    botId: process.env.MicrosoftAppId,
    conversationIdFactory,
    conversationState,
    skill: {
        id: process.env.SkillId,
        appId: process.env.SkillAppId,
        skillEndpoint: process.env.SkillEndpoint
    },
    skillHostEndpoint: process.env.SkillHostEndpoint,
    skillClient
}, 'skillDialog');

// Create the main dialog.
const dialog = new MainDialog(userState, skillDialog);
const bot = new DialogBot(conversationState, userState, dialog, skillsConfig, skillClient);

// Create HTTP server.
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function() {
    console.log(`\n${ server.name } listening to ${ server.url }.`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

// Listen for incoming requests.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        // Route the message to the bot's main handler.
        await bot.run(context);
    });
});

// Create and initialize the skill classes
const authConfig = new AuthenticationConfiguration([], allowedSkillsClaimsValidator);
const handler = new SkillHandler(adapter, bot, conversationIdFactory, credentialProvider, authConfig);
const skillEndpoint = new ChannelServiceRoutes(handler);
skillEndpoint.register(server, '/api/skills');

// Listen for GET requests to the same route to accept Upgrade requests for Streaming.
server.on('upgrade', async (req, socket, head) => {
    // Create an adapter scoped to this WebSocket connection to allow storing session data.
    const streamingAdapter = new CustomCredentialsBotFrameworkAdapter(adapterSettings);
    // Set onTurnError for the BotFrameworkAdapter created for each connection.
    streamingAdapter.onTurnError = onTurnErrorHandler;

    await adapter.useWebSocket(req, socket, head, async (context) => {
        // After connecting via WebSocket, run this logic for every request sent over
        // the WebSocket connection.
        await bot.run(context);
    });
});
