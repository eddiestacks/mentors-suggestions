(function() {

  return {
    defaultState: 'scaffolding',

    requests: {
      // ajax requests 
      getYahooKeywords: function(query) {
        return {
          url: 'http://query.yahooapis.com/v1/public/yql',
          type: 'GET',
          proxy_v2: false,
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
      'getYahooKeywords.fail': 'handleFail'

    },

    init: function() {
      console.log("App has started!!")
      console.log("Making yahoo ajax request")
      // MAX Characters for Yahoo Query: 620
      // TODO: implement hard coded limit of 620 characters for yahoo queries
      var testQuery = "Hi, my company uses your dashboard for a more than 2 years and now we are searching for new options, like the support on Twitter is. I've watched the demo, but still have some questions. The main topic is how we can convert a tweet in to a ticket, because we found only an option for converting a DM to a tweet? Another question is can we do integrated support on the single Twitter channel for more than one product and can we measure the effort of our support team separately for different projects? Also, how can we measure it? Do we have to convert every tweet to a ticket and than measure the success based on Good ";//Another question is can we do integrated support on the single Twitter channel for more than one product and can we measure the effort of our support team separately for different projects? Also, how can we measure it? Do we have to convert every tweet to a ticket and than measure the success based on Good and Bad marks given by customer, just like the standard measuring process works? We are very serious in our intentions to implement this in our everyday support process, so can you please answer these questions or prepare some tutorial for us? Many thanks! Best regards.";
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
    handleFail: function(rsp) {
      console.log(rsp)
    },

    createYQLQuery: function(query) {
      
      var yql_query_base = "select * from contentanalysis.analyze where text=";
      // TODO: Join the query on '\n'
      // todo: Test if escaping quotes is necessary...
      // todo: append to yql_query_base
      var query = yql_query_base + "\"" + query + "\"";
      console.log(query)
      return query;
      
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
