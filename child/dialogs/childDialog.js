// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { MessageFactory, ActivityTypes, InputHints } = require('botbuilder');
const {
    AttachmentPrompt,
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    ConfirmPrompt,
    DialogSet,
    DialogTurnStatus,
    NumberPrompt,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');

const ATTACHMENT_PROMPT = 'ATTACHMENT_PROMPT';
const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const USER_PROFILE = 'USER_PROFILE';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

class ChildDialog extends ComponentDialog {
    constructor() {
        super('ChildDialog');

        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.introStep.bind(this),
            this.actionStep.bind(this),
            this.finalStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
        if (results.status === DialogTurnStatus.complete || results.status === DialogTurnStatus.cancelled) {
            console.log('ending dialog')
            const endMessageText = `**SkillBot** The child skill has completed. Sending endOfConversation`;
            await turnContext.sendActivity(MessageFactory.text(endMessageText, endMessageText, InputHints.AcceptingInput));

            const activity = { type: ActivityTypes.EndOfConversation, value: results.result };
            await turnContext.sendActivity(activity, null, InputHints.AcceptingInput);
        }
    }

    async introStep(step) {
        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        // Running a prompt here means the next WaterfallStep will be run when the user's response is received.
        const prompt = MessageFactory.text('Choose thing', 'Choose thing', InputHints.ExpectingInput);
        return await step.prompt(CHOICE_PROMPT, {
            prompt: prompt,
            choices: ChoiceFactory.toChoices(['Apple', 'Banana', 'Cake'])
        });
    }

    async actionStep(step) {
        await step.context.sendActivity('action step', null, InputHints.AcceptingInput);
        return await step.next(step.result.value);
    }

    async finalStep(step) {
        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is the end.
        return await step.endDialog(step.result);
    }
}

module.exports.ChildDialog = ChildDialog;
