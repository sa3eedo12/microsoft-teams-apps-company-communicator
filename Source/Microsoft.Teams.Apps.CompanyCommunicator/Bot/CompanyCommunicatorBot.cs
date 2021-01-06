// <copyright file="CompanyCommunicatorBot.cs" company="Microsoft">
// Copyright (c) Microsoft. All rights reserved.
// </copyright>

namespace Microsoft.Teams.Apps.CompanyCommunicator.Bot
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using Microsoft.Bot.Builder;
    using Microsoft.Bot.Builder.Teams;
    using Microsoft.Bot.Schema;
    using Microsoft.Bot.Schema.Teams;
    using Microsoft.Extensions.Localization;
    using Microsoft.Teams.Apps.CompanyCommunicator.Common.Repositories.NotificationData;
    using Microsoft.Teams.Apps.CompanyCommunicator.Common.Repositories.SentNotificationData;
    using Microsoft.Teams.Apps.CompanyCommunicator.Common.Resources;

    /// <summary>
    /// Company Communicator Bot.
    /// Captures user data, team data, upload files.
    /// </summary>
    public class CompanyCommunicatorBot : TeamsActivityHandler
    {
        private static readonly string TeamRenamedEventType = "teamRenamed";

        private readonly TeamsDataCapture teamsDataCapture;
        private readonly TeamsFileUpload teamsFileUpload;
        private readonly IStringLocalizer<Strings> localizer;
        private readonly SentNotificationDataRepository sentNotificationDataRepository;
        private readonly NotificationDataRepository NotificationDataRepository;


        /// <summary>
        /// Initializes a new instance of the <see cref="CompanyCommunicatorBot"/> class.
        /// </summary>
        /// <param name="teamsDataCapture">Teams data capture service.</param>
        /// <param name="teamsFileUpload">change this.</param>
        /// <param name="localizer">Localization service.</param>
        public CompanyCommunicatorBot(
            TeamsDataCapture teamsDataCapture,
            TeamsFileUpload teamsFileUpload,
            IStringLocalizer<Strings> localizer)
        {
            this.teamsDataCapture = teamsDataCapture ?? throw new ArgumentNullException(nameof(teamsDataCapture));
            this.teamsFileUpload = teamsFileUpload ?? throw new ArgumentNullException(nameof(teamsFileUpload));
            this.localizer = localizer ?? throw new ArgumentNullException(nameof(localizer));
            //this.sentNotificationDataRepository=sentNotificationDataRepository ?? throw new ArgumentNullException(nameof(sentNotificationDataRepository));
            //this.NotificationDataRepository = NotificationDataRepository ?? throw new ArgumentNullException(nameof(NotificationDataRepository));
        }

        /// <summary>
        /// Invoked when a conversation update activity is received from the channel.
        /// </summary>
        /// <param name="turnContext">The context object for this turn.</param>
        /// <param name="cancellationToken">A cancellation token that can be used by other objects
        /// or threads to receive notice of cancellation.</param>
        /// <returns>A task that represents the work queued to execute.</returns>
        protected override async Task OnConversationUpdateActivityAsync(
            ITurnContext<IConversationUpdateActivity> turnContext,
            CancellationToken cancellationToken)
        {
            // base.OnConversationUpdateActivityAsync is useful when it comes to responding to users being added to or removed from the conversation.
            // For example, a bot could respond to a user being added by greeting the user.
            // By default, base.OnConversationUpdateActivityAsync will call <see cref="OnMembersAddedAsync(IList{ChannelAccount}, ITurnContext{IConversationUpdateActivity}, CancellationToken)"/>
            // if any users have been added or <see cref="OnMembersRemovedAsync(IList{ChannelAccount}, ITurnContext{IConversationUpdateActivity}, CancellationToken)"/>
            // if any users have been removed. base.OnConversationUpdateActivityAsync checks the member ID so that it only responds to updates regarding members other than the bot itself.
            await base.OnConversationUpdateActivityAsync(turnContext, cancellationToken);

            var activity = turnContext.Activity;

            var isTeamRenamed = this.IsTeamInformationUpdated(activity);
            if (isTeamRenamed)
            {
                await this.teamsDataCapture.OnTeamInformationUpdatedAsync(activity);
            }

            if (activity.MembersAdded != null)
            {
                await this.teamsDataCapture.OnBotAddedAsync(activity);
            }

            if (activity.MembersRemoved != null)
            {
                await this.teamsDataCapture.OnBotRemovedAsync(activity);
            }
        }

        /// <summary>
        /// Invoke when a file upload accept consent activitiy is received from the channel.
        /// </summary>
        /// <param name="turnContext">The context object for this turn.</param>
        /// <param name="fileConsentCardResponse">The accepted response object of File Card.</param>
        /// <param name="cancellationToken">A cancellation token that can be used by other objects
        /// or threads to receive notice of cancellation.</param>
        /// <returns>A task reprsenting asynchronous operation.</returns>
        protected override async Task OnTeamsFileConsentAcceptAsync(
            ITurnContext<IInvokeActivity> turnContext,
            FileConsentCardResponse fileConsentCardResponse,
            CancellationToken cancellationToken)
        {
            var (fileName, notificationId) = this.teamsFileUpload.ExtractInformation(fileConsentCardResponse.Context);
            try
            {
                await this.teamsFileUpload.UploadToOneDrive(
                    fileName,
                    fileConsentCardResponse.UploadInfo.UploadUrl,
                    cancellationToken);

                await this.teamsFileUpload.FileUploadCompletedAsync(
                    turnContext,
                    fileConsentCardResponse,
                    fileName,
                    notificationId,
                    cancellationToken);
            }
            catch (Exception e)
            {
                await this.teamsFileUpload.FileUploadFailedAsync(
                    turnContext,
                    notificationId,
                    e.ToString(),
                    cancellationToken);
            }
        }

        /// <summary>
        /// Invoke when a file upload decline consent activitiy is received from the channel.
        /// </summary>
        /// <param name="turnContext">The context object for this turn.</param>
        /// <param name="fileConsentCardResponse">The declined response object of File Card.</param>
        /// <param name="cancellationToken">A cancellation token that can be used by other objects
        /// or threads to receive notice of cancellation.</param>
        /// <returns>A task reprsenting asynchronous operation.</returns>
        protected override async Task OnTeamsFileConsentDeclineAsync(ITurnContext<IInvokeActivity> turnContext, FileConsentCardResponse fileConsentCardResponse, CancellationToken cancellationToken)
        {
            var (fileName, notificationId) = this.teamsFileUpload.ExtractInformation(
                fileConsentCardResponse.Context);

            await this.teamsFileUpload.CleanUp(
                turnContext,
                fileName,
                notificationId,
                cancellationToken);

            var reply = MessageFactory.Text(this.localizer.GetString("PermissionDeclinedText"));
            reply.TextFormat = "xml";
            await turnContext.SendActivityAsync(reply, cancellationToken);
        }
        private async void UpdateReactions(string conversationId, string Type)
        {
            
            var x = await this.NotificationDataRepository.GetWithFilterAsync("converstaionId eq '"+conversationId+"'");
            var result = new List<NotificationDataEntity>(x);
            switch(Type)
            {
                case "like":
                    result[0].Like++;
                    break;
                case "heart":
                    result[0].Heart++;
                    break;
                case "surprised":
                    result[0].Surprised++;
                    break;
                case "sad":
                    result[0].Sad++;
                    break;
                case "angry":
                    result[0].Angry++;
                    break;
                case "laugh":
                    result[0].Laugh++;
                    break;
            }
            await this.NotificationDataRepository.CreateOrUpdateAsync(result[0]);
        }
        protected override async Task OnReactionsAddedAsync(IList<MessageReaction> messageReactions, ITurnContext<IMessageReactionActivity> turnContext, CancellationToken cancellationToken)
        {
            foreach (var reaction in messageReactions)
            {
                
                var newReaction = $"You reacted with test '{reaction.Type}' to the following message: '{turnContext.Activity.Conversation.Id.Remove(turnContext.Activity.Conversation.Id.IndexOf(';'))}' Type: '{turnContext.Activity.From}'";
                var replyActivity = MessageFactory.Text(newReaction);
               
                var resourceResponse = await turnContext.SendActivityAsync(replyActivity, cancellationToken);
                this.UpdateReactions(turnContext.Activity.Conversation.Id.Remove(turnContext.Activity.Conversation.Id.IndexOf(';')), reaction.Type);
            }
        }
        protected override async Task OnReactionsRemovedAsync(IList<MessageReaction> messageReactions, ITurnContext<IMessageReactionActivity> turnContext, CancellationToken cancellationToken)
        {
            foreach (var reaction in messageReactions)
            {
                var newReaction = $"You removed a reaction of type '{reaction.Type}' to the following message: '{turnContext.Activity.Conversation.Id.Remove(turnContext.Activity.Conversation.Id.IndexOf(';'))}";
                var replyActivity = MessageFactory.Text(newReaction);
                var resourceResponse = await turnContext.SendActivityAsync(replyActivity, cancellationToken);
            }
        }

        private bool IsTeamInformationUpdated(IConversationUpdateActivity activity)
        {
            if (activity == null)
            {
                return false;
            }

            var channelData = activity.GetChannelData<TeamsChannelData>();
            if (channelData == null)
            {
                return false;
                
            }

            return CompanyCommunicatorBot.TeamRenamedEventType.Equals(channelData.EventType, StringComparison.OrdinalIgnoreCase);
        }
       
        
    }
}