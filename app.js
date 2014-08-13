(function() {

  return {
    defaultState: 'scaffolding',

    requests: {
      // ajax requests 
      getYahooKeywords: function(query) {
        return {
          url: 'http://query.yahooapis.com/v1/public/yql',
          type: 'GET',
          proxy_v2: true,
          data: {
            q: query,
            format: 'json'
          }
        }
      }
    },

    events: {
      'app.activated': 'init',
      'getYahooKeywords.done': 'handleYahooKeywords',
      'getYahooKeywords.fail': 'handleYahooKeywords'

    },

    init: function() {
      console.log("App has started!!")
      console.log("Making yahoo ajax request")
      var testQuery = "Italian sculptors and painters of the renaissance favored the Virgin Mary for inspiration.";
      this.fetchYahooKeywords(testQuery);
    },

    fetchYahooKeywords: function(description) {
      this.ajax('getYahooKeywords', this.createYQLQuery(description));
    },

    handleYahooKeywords: function(rsp) {
      //Handle data
      console.log("handling data:\n")
      console.log(rsp)
      var yql_results = "";
      if (rsp.query.results) {
        yql_results = rsp.query.results;
        console.log(yql_results);
      } 
    },

    createYQLQuery: function(query) {
      var yql_query_base = "select * from contentanalysis.analyze where text=";
      var query = yql_query_base + "'" + query + "'";
      console.log(query)
      return query;
      // TODO: Join the query on '\n'
      // todo: then quote it
      // todo: append to yql_query_base
    },
    // This utility function creates the query string
    // to be appended to the base URI of the YQL Web
    // service.
    toQueryString: function(obj) {
      var parts = [];
      for (var each in obj)
        if (obj.hasOwnProperty(each)) {
          parts.push(encodeURIComponent(each) + '=' + encodeURIComponent(obj[each]));
        }
      return parts.join('&');
    }
  };

}());
