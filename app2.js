(function() {

  var TFIDF = require('tfidf.js');

  return {
    defaultState: 'loading',

    /* Events */
    events: {
      'app.activated': 'init',
      'ticket.custom_field_{{About field ID}}.changed': 'init',
      'fetchResults.done': 'doneFetching',
      'fetchResultsAgain.done': 'doneFetchingAgain',
      'click .btn-tix': 'switchToTix',
      'click .btn-answer': 'switchToAnswer',
      'click .btn-search': 'manualSearch'
    },

    /* Requests */
    requests: {
      fetchResults: function(searchQuery) {
        var urlWQuery = "/api/v2/search.json?query=" + searchQuery;
        return {
          url: urlWQuery,
          type: 'GET'
        };
      }
    },

    init: function() {
      // Reset searchQuery variable, and get About Field ID
      var searchQuery = '';
      var aboutID = 'custom_field_' + this.setting('About field ID');
      var aboutFieldValue;

      // Get current About Field value
      this.about = this.ticket().customField(aboutID);

      // Call algorithm to analyze keywords and return 5 results
      searchQuery = TFIDF.analyzeTicket(5, this);

      // Log what the query is using for search
      console.log("Search query is using: ", searchQuery);

      // Convert searchQuery to a string so we can append type:ticket and fieldvalue:
      if (this.about === null) {
        searchQuery = searchQuery.join(" ") + " type:ticket";
        aboutFieldValue = this.about;

      } else {
        searchQuery = searchQuery.join(" ") + " type:ticket fieldvalue:" + this.about;
      }

      searchQuery = searchQuery.join(" ") + " type:ticket " + (this.about) ? "fieldvalue:" + this.about : "";

      if (this.about == null) {
        this.about = 'None selected';
      }
      this.ajax('fetchResults', searchQuery);
    }


  }
}());
