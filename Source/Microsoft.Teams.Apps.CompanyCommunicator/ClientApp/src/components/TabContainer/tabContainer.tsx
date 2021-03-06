import * as React from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import Messages from '../Messages/messages';
import DraftMessages from '../DraftMessages/draftMessages';
import './tabContainer.scss';
import * as microsoftTeams from '@microsoft/teams-js';
import { getBaseUrl } from '../../configVariables';
import { Accordion, Button, Input } from '@stardust-ui/react';
import { getDraftMessagesList, searchBarChanged, getFilteredList, getMessagesList } from '../../actions';
import { connect } from 'react-redux';
import { TFunction } from 'i18next';

interface ITaskInfo {
	title?: string;
	height?: number;
	width?: number;
	url?: string;
	card?: string;
	fallbackUrl?: string;
	completionBotId?: string;
}

export interface ITaskInfoProps extends WithTranslation {
	getDraftMessagesList?: any;
	searchBarChanged?: any;
	getFilteredList?: any;
	getMessagesList?: any;
}

export interface ITabContainerState {
	url: string;
	searchText: string;
}

class TabContainer extends React.Component<ITaskInfoProps, ITabContainerState> {
	readonly localize: TFunction;
	isContent: boolean;
	constructor(props: ITaskInfoProps) {
		super(props);
		this.isContent = false;
		this.localize = this.props.t;
		this.state = {
			url: getBaseUrl() + '/newmessage?locale={locale}',
			searchText: ''
		};
		this.escFunction = this.escFunction.bind(this);
	}
	public checkSearchContent() {
		return this.isContent;
	}
	public componentDidMount() {
		microsoftTeams.initialize();
		//- Handle the Esc key
		document.addEventListener('keydown', this.escFunction, false);
	}

	public componentWillUnmount() {
		document.removeEventListener('keydown', this.escFunction, false);
	}

	public escFunction(event: any) {
		if (event.keyCode === 27 || event.key === 'Escape') {
			microsoftTeams.tasks.submitTask();
		}
	}

	public async searchTextChanged(e, newProp) {
		var searchttxt = new String(newProp.value);
		if (searchttxt.length >= 3) {
			console.log('inside textchanged', newProp.value);
			this.props.searchBarChanged(newProp);
			this.props.getFilteredList(newProp.value);
		}
		else if (searchttxt.length === 0) {
			this.props.searchBarChanged(newProp);
			this.props.getMessagesList();
        }
	}

	public render(): JSX.Element {
		const panels = [
			{
				title: this.localize('DraftMessagesSectionTitle'),
				content: {
					key: 'sent',
					content: (
						<div className="messages">
							<DraftMessages />
						</div>
					)
				}
			},
			{
				title: this.localize('SentMessagesSectionTitle'),
				content: {
					key: 'draft',
					content: (
						<div>
							<Input
								placeholder={this.localize('Search')}
								icon="search"
								className="searchBox"
								onChange={this.searchTextChanged.bind(this)}
							/>
							<br/>
							<div className="messages">
								<Messages />
							</div>
						</div>
					)
				}
			}
		];
		return (
			<div className="tabContainer">
				<div className="newPostBtn">
					<Button content={this.localize('NewMessage')} onClick={this.onNewMessage} primary />
				</div>
				<div className="messageContainer">
					<Accordion defaultActiveIndex={[ 0, 1 ]} panels={panels} />
				</div>
			</div>
		);
	}

	public onNewMessage = () => {
		let taskInfo: ITaskInfo = {
			url: this.state.url,
			title: this.localize('NewMessage'),
			height: 800,
			width: 1000,
			fallbackUrl: this.state.url
		};

		let submitHandler = (err: any, result: any) => {
			this.props.getDraftMessagesList();
		};

		microsoftTeams.tasks.startTask(taskInfo, submitHandler);
	};
}

const mapStateToProps = (state: any) => {
	return { messages: state.draftMessagesList };
};

const tabContainerWithTranslation = withTranslation()(TabContainer);
export default connect(mapStateToProps, { getDraftMessagesList, searchBarChanged, getFilteredList, getMessagesList })(
	tabContainerWithTranslation
);
