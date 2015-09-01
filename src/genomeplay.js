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

var NameOptions = React.createClass({
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
			return ( <option value={opt.UserID}>{opt.Name}</option> );
		});
		options.unshift ( <option value="0">Select a name</option> );
		var value = this.state.value;
		var selectionState = this.state.selectionState
		return( <div>
				<img src={this.props.imageSrc} className='genomePic' /> <br/> 
				<select onChange={this.handleChange} defaultValue={value}>
					{options}
				</select> 
				{this.state.selectionState}
			</div>
		);
	}
});

var UserList = React.createClass({
	render: function() {
		var nameOptionData = _.shuffle(this.props.data.map(function (usr) {
			var opt = { UserID: usr.UserID, Name:usr.Name };
			return opt;
		}));

		var usernodes = this.props.data.map(function (usr) {
			return (
				<div >
					<NameOptions imageSrc={usr.ImageSrc} options={nameOptionData} UserID = {usr.UserID} />
				</div>
			);
		});
		return (
			<div>
				{usernodes}	
			</div>
		);
	}
});

var WorkTeamOption = React.createClass({
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
				<option value={wt.WorkTeamID}>{wt.Name}</option>
			);
		});
		
		var value = this.state.value;

		var optionSelected = this.state.data.filter(function (wt) {
			return wt.WorkTeamID == value 	
		})[0];

		return( <div>
				<label htmlFor="wt_options">WorkTeamFilter:</label>
				<select name="wt_options" onChange={this.handleChange} defaultValue={value}>
					{options}
				</select>
			</div>
		);
	}
});

function filterByWorkTeam(uids, wtFilter) {  
	return $.ajax({url: "https://genome.klick.com:443/api/User?UserIDs=" + uids.join(), type: "GET", dataType: 'jsonp', jsonpCallback: 'myCallback' + uids[0]})
		.done(function(p) {return p;})
	.pipe(function(p) {
		return p.Entries.filter(function(d) {
			return d.WorkTeamID == wtFilter; 
		});
	});
}


var UserPicGame = React.createClass({	
	getGenomeUsers: function() {
		var self = this;
		var wtFilter = this.state.workTeamFilter;
		var numUsers = Number(this.props.numUsers); var userEntries = [];

		$.ajax({url: this.props.url, type: 'GET',dataType: 'jsonp'})
		.done(function(genomedata) {
			console.log("I work?"); 
		//	if(wtFilter !== 73) {
				var batches = splitArray(_.pluck(genomedata.Entries, "UserID"),3);

				var p1 = Promise.resolve($.ajax({url: "https://genome.klick.com:443/api/User?UserIDs=" + batches[0].join(), type: "GET", dataType: 'jsonp', jsonpCallback: 'myCallback' + batches[0][1]}))
					.then(function(result){ return result.Entries });
				var p2 = Promise.resolve($.ajax({url: "https://genome.klick.com:443/api/User?UserIDs=" + batches[1].join(), type: "GET", dataType: 'jsonp', jsonpCallback: 'myCallback' + batches[1][1]}))
					.then(function(result){ return result.Entries });
				var p3 = Promise.resolve($.ajax({url: "https://genome.klick.com:443/api/User?UserIDs=" + batches[2].join(), type: "GET", dataType: 'jsonp', jsonpCallback: 'myCallback' + batches[2][1]}))
					.then(function(result){ return result.Entries });
				
				var ps = Promise.all([p1,p2,p3]);
				ps.then(function (results) { 
					var combinedResult = results[0].concat(results[1]).concat(results[2]); console.log(combinedResult);
					if(wtFilter !== 73)
					{
						combinedResult = combinedResult.filter(function(d) { return d.WorkTeamID === wtFilter; });
						
					}

					var randomsample =  _.sample(combinedResult, numUsers)
					.map(function(entry) { 
						entry.ImageSrc = "https://genome.klick.com" + entry.PhotoPath; 
						return entry; 
					});
					console.log(randomsample);
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
		//TODO: check filter
		this.getGenomeUsers();
	},
	onFilterUpdate: function(val){ 
	       this.setState({
			workTeamFilter: val
	       });

	       this.handleRefresh();
	},	       
	render:function() {
		return (
			<div>
				<WorkTeamOption url={this.props.wt_url} onUpdate={this.onFilterUpdate}/> 
				<button type="button" onClick={this.handleRefresh}>Refresh</button>
				<h1>User Pic Game</h1>
				<UserList data={this.state.userdata} />
			</div>
		);
	}
});
	
console.log('test');
React.render(
  <UserPicGame url="https://genome.klick.com:443/api/User/Search" numUsers="10" wt_url="https://genome.klick.com:443/api/WorkTeam" />,
  document.getElementById('example')
);
