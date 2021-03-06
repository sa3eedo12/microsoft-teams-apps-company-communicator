import * as React from 'react';
import { withTranslation, WithTranslation } from "react-i18next";
import './videoPlayer.scss';
import { getSentNotification, exportNotification } from '../../apis/messageListApi';
import { RouteComponentProps } from 'react-router-dom';
import * as AdaptiveCards from "adaptivecards";
import { initializeIcons } from 'office-ui-fabric-react/lib/Icons';
import { TooltipHost } from 'office-ui-fabric-react';
import { Icon, Loader, List, Image, Button, IconProps } from '@stardust-ui/react';
import * as microsoftTeams from "@microsoft/teams-js";
import {
    getInitAdaptiveCard, setCardVideoPlayerPoster, setCardVideoPlayerUrl
} from '../AdaptiveCard/adaptiveCard';
import { ImageUtil } from '../../utility/imageutility';
import { formatDate, formatDuration, formatNumber } from '../../i18n';
import { TFunction } from "i18next";

export interface IListItem {
    header: string,
    media: JSX.Element,
}

export interface IMessage {
    id: string;
    title: string;
    acknowledgements?: string;
    reactions?: number;
    responses?: string;
    succeeded?: string;
    failed?: string;
    unknown?: string;
    sentDate?: string;
    imageLink?: string;
    summary?: string;
    author?: string;
    buttonLink?: string;
    buttonTitle?: string;
    teamNames?: string[];
    rosterNames?: string[];
    groupNames?: string[];
    allUsers?: boolean;
    sendingStartedDate?: string;
    sendingDuration?: string;
    errorMessage?: string;
    warningMessage?: string;
    canDownload?: boolean;
    sendingCompleted?: boolean;
    videoUrl?: string;
}

export interface IStatusState {
    message: IMessage;
    loader: boolean;
    page: string;
}

interface videoPlayerProps extends RouteComponentProps, WithTranslation { }

class videoPlayer extends React.Component<videoPlayerProps, IStatusState> {
    readonly localize: TFunction;
    private initMessage = {
        id: "",
        title: ""
    };

    private card: any;

    constructor(props: videoPlayerProps) {
        super(props);
        initializeIcons();

        this.localize = this.props.t;

        this.card = getInitAdaptiveCard(this.props.t, 3);

        this.state = {
            message: this.initMessage,
            loader: true,
            page: "videoPlayer",
        };
    }

    public componentDidMount() {
        let params = this.props.match.params;

        if ('id' in params) {
            let id = params['id'];
            this.getItem(id).then(() => {
                this.setState({
                    loader: false
                }, () => {
                        console.log("Message in Video", this.state.message);
                        setCardVideoPlayerUrl(this.card, this.state.message.videoUrl);
                        setCardVideoPlayerPoster(this.card, this.state.message.imageLink);
                    let adaptiveCard = new AdaptiveCards.AdaptiveCard();
                    adaptiveCard.parse(this.card);
                    let renderedCard = adaptiveCard.render();
                    document.getElementsByClassName('adaptiveCardContainer')[0].appendChild(renderedCard!);
                    let link = this.state.message.buttonLink;
                    adaptiveCard.onExecuteAction = function (action) { window.open(link, '_blank'); }
                });
            });
        }
    }

    private getItem = async (id: number) => {
        try {
            const response = await getSentNotification(id);
            response.data.sendingDuration = formatDuration(response.data.sendingStartedDate, response.data.sentDate);
            response.data.sendingStartedDate = formatDate(response.data.sendingStartedDate);
            response.data.sentDate = formatDate(response.data.sentDate);
            response.data.succeeded = formatNumber(response.data.succeeded);
            response.data.reactions = formatNumber(response.data.reactions);
            response.data.failed = formatNumber(response.data.failed);
            response.data.unknown = response.data.unknown && formatNumber(response.data.unknown);
            this.setState({
                message: response.data
            });
        } catch (error) {
            return error;
        }
    }

    public render(): JSX.Element {
        if (this.state.loader) {
            return (
                <div className="Loader">
                    <Loader />
                </div>
            );
        } else {
            const downloadIcon: IconProps = { name: 'download', size: "medium" };
            if (this.state.page === "videoPlayer") {
                return (
                    <div className="taskModule">
                        <div className="formContainer">
                            <div className="adaptiveCardContainer">
                            </div>
                        </div>

                       
                    </div>
                );
            }
            else if (this.state.page === "SuccessPage") {
                return (
                    <div className="taskModule">
                        <div className="formContainer">
                            <div className="displayMessageField">
                                <br />
                                <br />
                                <div><span><Icon className="iconStyle" name="stardust-checkmark" xSpacing="before" size="largest" outline /></span>
                                    <h1>{this.localize("ExportQueueTitle")}</h1></div>
                                <span>{this.localize("ExportQueueSuccessMessage1")}</span>
                                <br />
                                <br />
                                <span>{this.localize("ExportQueueSuccessMessage2")}</span>
                                <br />
                                <span>{this.localize("ExportQueueSuccessMessage3")}</span>
                            </div>
                        </div>
                        <div className="footerContainer">
                            <div className="buttonContainer">
                                <Button content={this.localize("CloseText")} id="closeBtn" onClick={this.onClose} primary />
                            </div>
                        </div>
                    </div>

                );
            }
            else {
                return (
                    <div className="taskModule">
                        <div className="formContainer">
                            <div className="displayMessageField">
                                <br />
                                <br />
                                <div><span><Icon className="iconStyle" name="stardust-close" xSpacing="before" size="largest" outline /></span>
                                    <h1 className="light">{this.localize("ExportErrorTitle")}</h1></div>
                                <span>{this.localize("ExportErrorMessage")}</span>
                            </div>
                        </div>
                        <div className="footerContainer">
                            <div className="buttonContainer">
                                <Button content={this.localize("CloseText")} id="closeBtn" onClick={this.onClose} primary />
                            </div>
                        </div>
                    </div>
                );
            }
        }
    }

    private onClose = () => {
        microsoftTeams.tasks.submitTask();
    }

}

const videoPlayerWithTranslation = withTranslation()(videoPlayer);
export default videoPlayerWithTranslation;