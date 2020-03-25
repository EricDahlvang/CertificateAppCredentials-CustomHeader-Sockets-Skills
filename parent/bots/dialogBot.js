// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, ActivityTypes, InputHints, DeliveryModes } = require('botbuilder');

class DialogBot extends ActivityHandler {
    /**
     *
     * @param {ConversationState} conversationState
     * @param {UserState} userState
     * @param {Dialog} dialog
     */
    constructor(conversationState, userState, dialog, skillConfig, skillClient) {
        super();
        if (!conversationState) throw new Error('[DialogBot]: Missing parameter. conversationState is required');
        if (!userState) throw new Error('[DialogBot]: Missing parameter. userState is required');
        if (!dialog) throw new Error('[DialogBot]: Missing parameter. dialog is required');

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialog = dialog;
        this.dialogState = this.conversationState.createProperty('DialogState');
        this.skillClient = skillClient;
        this.skillsConfig = skillConfig;

        // We use a single skill in this example.
        const targetSkillId = 'EchoSkillBot';
        this.targetSkill = skillConfig.skills[targetSkillId];
        if (!this.targetSkill) {
            throw new Error(`[RootBot] Skill with ID "${ targetSkillId }" not found in configuration`);
        }

        // Create state property to track the active skill
        this.activeSkillProperty = this.conversationState.createProperty('activeSkillProperty');

        this.onTurn(async (context, next) => {
            // Forward all activities except EndOfConversation to the active skill.
            if (context.activity.type !== ActivityTypes.EndOfConversation) {
                // Try to get the active skill
                const activeSkill = await this.activeSkillProperty.get(context);

                if (activeSkill) {
                    context.activity.deliveryMode = DeliveryModes.ExpectReplies;
                    // Send the activity to the skill
                    await this.sendToSkill(context, activeSkill);
                    return;
                }
            } else {
                await this.activeSkillProperty.set(context, undefined);

                // Show status message, text and value returned by the skill
                let eocActivityMessage = `Received ${ ActivityTypes.EndOfConversation }.\n\nCode: ${ context.activity.code }`;
                if (context.activity.text) {
                    eocActivityMessage += `\n\nText: ${ context.activity.text }`;
                }

                if (context.activity.value) {
                    eocActivityMessage += `\n\nValue: ${ context.activity.value }`;
                }

                await context.sendActivity(eocActivityMessage, null, InputHints.AcceptingInput);

                await this.dialog.run(context, this.dialogState);

                // Save conversation state
                // await this.conversationState.saveChanges(context, true);
                // await this.userState.saveChanges(context, true);
            }

            // Ensure next BotHandler is executed.
            await next();
        });

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            console.log(context.activity.text);
            await this.dialog.run(context, this.dialogState);

            // await conversationState.saveChanges(context);

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onUnrecognizedActivityType(async (context, next) => {
            // Handle EndOfConversation returned by the skill.

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

    /**
     * Override the ActivityHandler.run() method to save state changes after the bot logic completes.
     */
    async run(context) {
        await super.run(context);

        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }
}

module.exports.DialogBot = DialogBot;
