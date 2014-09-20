(function() {

  var Lexer = require('lexer.js');
  var resultList = [];
  var about = "";
  var algoVersion = 1;

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
      },
      fetchResultsAgain: function(searchQuery) {
        var urlWQuery = "/api/v2/search.json?query=" + searchQuery;
        return {
          url: urlWQuery,
          type: 'GET'
        };
      },
      requestDF: function(term) {
        return {
          url: helpers.fmt('/api/v2/search.json?per_page=%@&query=%@ type:topic', 1, term),
          type: 'GET'
        };
      }
    },

    switchToTix: function() {
      if (this.$('.btn-tix').hasClass('active')) {
        this.switchTo('loading');
        this.init();
      }

    },

    switchToAnswer: function() {
      if (this.$('.btn-answer').hasClass('active')) {
        this.switchTo('loading');
        console.log("Switch to Answer Suggestion App");
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
      keywords = Lexer.extractKeywords(5, this);

      // Log what the query is using for search
      console.log("Search query is using: ", keywords);

      // Convert searchQuery to a string so we can append type:ticket and fieldvalue:
      searchQuery = keywords.join(" ") + " type:ticket " + (this.about ? "fieldvalue:" + this.about : "");

      if (this.about == null) {
        this.about = 'None selected';
      }
      this.ajax('fetchResults', searchQuery);
    },









    doneFetching: function(data) {
      this.resultList = [];
      var resCount = 0;
      for (var resInd = 0; resCount < 5 && resInd < data.count; resInd++) {
        if (this.ticket().id() != data.results[resInd].id) {
          var tempLink = '/agent/#/tickets/' + data.results[resInd].id;
          var temp = {
            'title': data.results[resInd].subject,
            'link': tempLink
          };
          this.resultList.push(temp);
          resCount++;
        }
      }
      if (this.resultList.length == 0) {
        var query = this.getKeywords() + "%20type:ticket";
        this.about += ': no results with this filter';
        this.resultList = this.ajax('fetchResultsAgain', query);
      }

      this.switchTo('scaffolding', {
        resultList: this.resultList,
        aboutFilter: this.aboutFieldValue
      });

      if (algoVersion == 1) {
        this.$('.btn-tix').addClass('active');
      } else {
        this.$('.btn-answer').addClass('active');
      }

    },

    doneFetchingAgain: function(data) {
      this.resultList = [];
      var resCount = 0;
      for (var resInd = 0; resCount < 5 && resInd < data.count; resInd++) {
        if (this.ticket().id() != data.results[resInd].id) {
          var tempLink = '/agent/#/tickets/' + data.results[resInd].id;
          var temp = {
            'title': data.results[resInd].subject,
            'link': tempLink
          };
          this.resultList.push(temp);
          resCount++;
        }
      }
      if (this.resultList.length == 0) {
        this.resultList.push({
          'title': 'No relevant tickets found',
          'link': '/agent/#/tickets/' + this.ticket().id()
        });
      }
      //this.switchTo('scaffolding', {resultList:this.resultList, aboutFilter:this.about});
      return this.resultList;
    },

    manualSearch: function() {
      var manualSearchTermsArray = [];
      var finalManualSearchTermsArray = [];
      var manualSearchTerms = this.$('input.manualSearch').val();
      manualSearchTermsArray = manualSearchTerms.split(" ");

      for (var i = 0; i < manualSearchTermsArray.length; i++) {
        finalManualSearchTermsArray += manualSearchTermsArray[i];
        finalManualSearchTermsArray += "%20";
      }

      finalManualSearchTermsArray = finalManualSearchTermsArray.substring(0, finalManualSearchTermsArray.length - 3);

      console.log(finalManualSearchTermsArray);
      var searchQuery = finalManualSearchTermsArray;
      this.ajax('fetchResults', searchQuery);

    }

  };

}());