(function() {

	return {
		events: {
			'app.activated': 'doSomething',
			'click.searchAPI': 'searchAPITikcets',
			'click.searchEmail': 'searchEmailTikcets'
		},

		requests: {
			getAPITikcets: function() {
				return {
					url: '/api/v2/search.json?query=tags:about_api',
					type: 'GET'
				};
			},
			getEmailTickets: function() {
				return {
					url: '/api/v2/search.json?query=tags:about_email',
					type: 'GET'
				};
			}
		},

		doSomething: function() {
			console.log("Hello world!");
		},

		searchAPITikcets: function() {
			this.ajax('getAPITikcets');
			console.log("I made the following request: /api/v2/search.json?query=tags:about_api");
		},

		searchEmailTikcets: function() {
			this.ajax('getEmailTickets');
			console.log("I made the following request: /api/v2/search.json?query=tags:about_email");
		}
	};

}());