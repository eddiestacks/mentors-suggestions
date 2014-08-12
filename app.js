(function() {

  return {
    defaultState: 'scaffolding',
    events: {
      'app.activated': 'init',
      'getYahooKeywords.done': 'handleYahooKeywords'
    },
    requests: {
      // ajax requests 
      getYahooKeywords: function(query) {
        return {
          url: 'http://query.yahooapis.com/v1/yql',
          type: 'POST',
          proxy_v2: true,
          contentType: "json",
          data: this.toQueryString({
            q: query,
            format: 'json'
          })
        }
      }
    },

    init: function() {
      console.log("App has started!!")
      console.log("Making yahoo ajax request")
      var testQuery = "Italian sculptors and painters of the renaissance favored the Virgin Mary for inspiration.";
      var param = this.createYQLQuery(testQuery);
      this.ajax('getYahooKeywords', param)
    },

    handleYahooKeywords: function(rsp) {
      //Handle data
      console.log("handling data:\n" + rsp)
      var yql_results = "";
      if (rsp.data) {
        yql_results = rsp.data;
        console.log("ajax results: \n" + yql_results);
      }
    },

    createYQLQuery: function(description) {
      var yql_query_base = "select * from contentanalysis.analyze where text=";
      var query = yql_query_base + "'" + description + "'";
      console.log(query)
      return query;
      // TODO: Join the description on '\n'
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
