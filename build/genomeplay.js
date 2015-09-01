var selectionStateEnum = { EMPTY: "", INCORRECT: "Incorrect", CORRECT: "Correct!!" };

function splitArray(a, n) {
    var len = a.length,out = [], i = 0;
    while (i < len) {
        var size = Math.ceil((len - i) / n--);
        out.push(a.slice(i, i + size));
        i += size;
    }
    return out;
}

var NameOptions = React.createClass({displayName: "NameOptions",
	handleChange: function(event) {
		var selection = event.target.value;
		this.setState({value: selection});
		if(selection == 0) {
			this.setState({selectionState:selectionStateEnum.EMPTY});
		} else if(selection == this.props.UserID) {
			this.setState({selectionState:selectionStateEnum.CORRECT});
			
		} else {
			this.setState({selectionState:selectionStateEnum.INCORRECT});
		}

	},

	getInitialState: function() {
		return {value:"0", selectionState:selectionStateEnum.EMPTY };
	},

	componentWillReceiveProps: function() { //on refresh, set selection back to nothing
		this.setState({value:0});
		this.setState({selectionState:selectionStateEnum.EMPTY});
	},	

	render: function() {
		var options = this.props.options.map(function (opt) {
			return ( React.createElement("option", {value: opt.UserID}, opt.Name) );
		});
		options.unshift ( React.createElement("option", {value: "0"}, "Select a name") );
		var value = this.state.value;
		var selectionState = this.state.selectionState
		return( React.createElement("div", null, 
				React.createElement("img", {src: this.props.imageSrc, className: "genomePic"}), " ", React.createElement("br", null), 
				React.createElement("select", {onChange: this.handleChange, defaultValue: value}, 
					options
				), 
				this.state.selectionState
			)
		);
	}
});

var UserList = React.createClass({displayName: "UserList",
	render: function() {
		var nameOptionData = _.shuffle(this.props.data.map(function (usr) {
			var opt = { UserID: usr.UserID, Name:usr.Name };
			return opt;
		}));

		var usernodes = this.props.data.map(function (usr) {
			return (
				React.createElement("div", null, 
					React.createElement(NameOptions, {imageSrc: usr.ImageSrc, options: nameOptionData, UserID: usr.UserID})
				)
			);
		});
		return (
			React.createElement("div", null, 
				usernodes	
			)
		);
	}
});

var WorkTeamOption = React.createClass({displayName: "WorkTeamOption",
	getWorkTeamData: function() {		
		$.ajax({
			url: this.props.url,
			type: 'GET',
			dataType: 'jsonp',
			jsonCallback: 'myCallback',
			success: function(genomedata) {
				this.setState({data: genomedata.Entries});
			}.bind(this),
			error: function(xhr, status, err) {
				console.error(this.props.url, status, err.toString());
			}.bind(this)
		});
	},	
	handleChange: function(event) {
		var selection = event.target.value;
		this.setState({value: selection});
		this.props.onUpdate(selection);
	},

	getInitialState: function() {
		return {data:[], value: 73}; //workteamid for all in Genome api
	},
	componentDidMount: function() {
		this.getWorkTeamData();
	},
	render: function() {
		var options = this.state.data.map(function (wt) {
			return (
				React.createElement("option", {value: wt.WorkTeamID}, wt.Name)
			);
		});
		
		var value = this.state.value;

		var optionSelected = this.state.data.filter(function (wt) {
			return wt.WorkTeamID == value 	
		})[0];

		return( React.createElement("div", null, 
				React.createElement("label", {htmlFor: "wt_options"}, "WorkTeamFilter:"), 
				React.createElement("select", {name: "wt_options", onChange: this.handleChange, defaultValue: value}, 
					options
				)
			)
		);
	}
});


var UserPicGame = React.createClass({displayName: "UserPicGame",	
	getGenomeUsers: function() {
		var self = this;
		var wtFilter = this.state.workTeamFilter;
		var numUsers = Number(this.props.numUsers); var userEntries = [];

		$.ajax({url: this.props.url, type: 'GET',dataType: 'jsonp'})
		.done(function(genomedata) {
			var batches = splitArray(_.pluck(genomedata.Entries, "UserID"),3);

			var batchRequests = batches.map(function(batch) { 
				return Promise.resolve(
					$.ajax({url: "https://genome.klick.com:443/api/User?UserIDs=" + batch.join(), type: "GET", dataType: 'jsonp', jsonpCallback: 'myCallback' + batch[0]}))
					.then(function(result){ return result.Entries });});
			
			var ps = Promise.all(batchRequests);
			ps.then(function (results) { 
				var combinedResult = results[0].concat(results[1]).concat(results[2]);
				if(wtFilter !== 73)
				{
					combinedResult = combinedResult.filter(function(d) { return d.WorkTeamID === wtFilter; });
					
				}

				var randomsample =  _.sample(combinedResult, numUsers)
				.map(function(entry) { 
					entry.ImageSrc = "https://genome.klick.com" + entry.PhotoPath; 
					return entry; 
				});
				
				self.setState({userdata: randomsample });

			}, function (err) { console.log(err);});

		})
		.fail(function(xhr, status, err) {
				console.error(this.props.url, status, err.tostring());
		});

	},
	getInitialState: function() {
		return {userdata: [], workTeamFilter: 73};
	},
    	componentDidMount: function() {
		this.getGenomeUsers();
	},
	handleRefresh: function() {
		this.getGenomeUsers();
	},
	onFilterUpdate: function(val){ 
	       this.setState({
			workTeamFilter: val
	       }, function() { this.handleRefresh(); });
	},	       
	render:function() {
		return (
			React.createElement("div", null, 
				React.createElement(WorkTeamOption, {url: this.props.wt_url, onUpdate: this.onFilterUpdate}), 
				React.createElement("button", {type: "button", onClick: this.handleRefresh}, "Refresh"), 
				React.createElement("h1", null, "User Pic Game"), 
				React.createElement(UserList, {data: this.state.userdata})
			)
		);
	}
});
	
React.render(
  React.createElement(UserPicGame, {url: "https://genome.klick.com:443/api/User/Search", numUsers: "10", wt_url: "https://genome.klick.com:443/api/WorkTeam"}),
  document.getElementById('example')
);
