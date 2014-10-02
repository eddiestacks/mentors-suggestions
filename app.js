(function() {

  var Lexer = require('lexer.js');

  return {

    // SET GLOBALS
    aboutFieldID: '',

    // SET APP DEFAULTS
    defaultState: 'loading',
    defaultNumberOfEntriesToDisplay: 5,

    events: {
      // APP EVENTS
      'app.activated': 'init',
      'ticket.subject.changed': _.debounce(function() {
        this.init();
      }, 500), // Rerun the search if the subject changes
      'ticket.custom_field_{{About Field ID}}.changed': _.debounce(function() {
        this.init();
      }, 500), // Rerun the search if the About field changes

      // AJAX EVENTS
      'runTicketSearch.done': 'displayResults',
      'runTicketSearch.fail': 'displayError',

      // DOM EVENTS
      'click .toggle-app': 'toggleAppContainer',
      'click .btn-search': 'manualSearch',
      'click .btn-ticketSuggestions': function() {
        if (this.$('.btn-ticketSuggestions').hasClass('active') !== true) {
          this.$('.app-btn').toggleClass('active');
          this.switchTo(this.defaultState);
          this.init();
        }
      },
      'click .btn-answerSuggestions': function() {
        if (this.$('.btn-answerSuggestions').hasClass('active') !== true) {
          this.$('.app-btn').toggleClass('active');
          this.switchTo(this.defaultState);
        }
      }

    },

    requests: {
      runTicketSearch: function(query, aboutField) {
        // if About Field is empty, leave it out of the search.
        var searchQuery = query + ' type:ticket ' + (!_.isEmpty(aboutField) ? 'fieldvalue:' + this.aboutFieldContents : '');
        console.log('searchQuery ', searchQuery);
        return {
          url: helpers.fmt('/api/v2/search.json?query=%@', searchQuery),
          type: 'GET'
        };
      }
    },

    init: function() {
      // Get the ID for the About Field, store its contents, and declare necessary variables
      this.aboutFieldID = 'custom_field_' + this.setting('About Field ID');
      this.aboutFieldContents = this.ticket().customField(this.aboutFieldID);

      // Call algorithm to analyze keywords and return 5 results
      var keywords = Lexer.extractKeywords(5, this);

      // Search for tickets in the current about field with the extracted keywords
      this.ajax('runTicketSearch', keywords.join(' '), this.aboutFieldContents);
    },

    displayResults: function(data) {
      var resultList = [],
        resCount = data.count,
        resTicketID,
        resTicketSubject;

      // Loop through results and prep them for display
      for (var resultIndex = 0; resultIndex < this.defaultNumberOfEntriesToDisplay && resultIndex < resCount; resultIndex++) {

        // Set result Ticket ID to resTicketID, and result Ticket Subject to resTicketSubject
        resTicketID = data.results[resultIndex].id;
        resTicketSubject = data.results[resultIndex].subject;

        // Test if result is not current ticket being viewed, and if not, add it to resultList array
        if (this.ticket().id() != data.results[resultIndex].id) {
          resultList.push({
            'title': resTicketSubject,
            'link': '/agent/#/tickets/' + resTicketID
          });
        }
      }

      this.switchTo('ticketSuggestion', {
        resultList: resultList,
        aboutFilter: this.aboutFieldContents
      });
      // If zero results were returned, display message
      if (resultList.length === 0) {
        this.$('.no-results').show();
      } else {
        this.$('.no-results').hide();
      }
    },

    manualSearch: function() {
      this.manualSearchQuery = this.$('input.manualSearch').val().trim();
      this.ajax('runTicketSearch', this.manualSearchQuery, this.aboutFieldContents);
    },

    displayError: function(data) {
      console.log("there was an error");
      console.log(data);
    },

    toggleAppContainer: function() {
      var $container = this.$('.app-container'),
        $icon = this.$('.toggle-app i');

      if ($container.is(':visible')) {
        $container.hide();
        $icon.prop('class', 'icon-plus');
      } else {
        $container.show();
        $icon.prop('class', 'icon-minus');
      }
    }


  };
}());