// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, ActivityTypes, EndOfConversationCodes, MessageFactory } = require('botbuilder');

class EchoBot extends ActivityHandler {
    constructor(conversationState, dialog) {
        super();

        this.dialog = dialog;
        this.conversationState = conversationState;
        this.dialogState = this.conversationState.createProperty('DialogState');

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            console.log(context.activity.text);
            switch (context.activity.text.toLowerCase()) {
                case 'end':
                case 'stop':
                    await context.sendActivity({
                        type: ActivityTypes.EndOfConversation,
                        code: EndOfConversationCodes.CompletedSuccessfully
                    });
                    break;
                case 'echo':
                    await context.sendActivity(`Echo (JS) : '${ context.activity.text }'`);
                    await context.sendActivity('Say "end" or "stop" and I\'ll end the conversation and back to the parent.');
                    break;
                default:
                    await this.dialog.run(context, this.dialogState);
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello and welcome!';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

    async run(context) {
        await super.run(context);

        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context, false);
    }
}

module.exports.EchoBot = EchoBot;
