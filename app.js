(function() {

  var TFIDF = require('tfidf.js');
  var Stemmer = require('stemmer.js');
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

    analyzeTicket: function() {
      // Get words array from subject and description
      // Calculate the feature values for terms in both the subject and description
      var descriptionKeywords = TFIDF.analyzeDescription(3, this);
      var subjectKeywords = TFIDF.analyzeSubject(5, this);

      return _.union(descriptionKeywords, subjectKeywords).join(" ");
    },

    getKeywords: function() {
      var words = this.ticket().description().toLowerCase().replace(/[\.,-\/#!$?%\^&\*;:{}=\-_`~()]/g, "").replace(/[0-9]/g, "").replace(/\s{2,}/g, " ").split(' ');
      var title = this.ticket().subject().toLowerCase().replace(/[\.,-\/#!$?%\^&\*;:{}=\-_`~()]/g, "").replace(/[0-9]/g, "").replace(/\s{2,}/g, " ").split(' ');
      var exclusions = this.I18n.t('stopwords.exclusions').split(',');
      words = _.difference(words, exclusions);
      title = _.difference(title, exclusions);

      var priorityWords = this.countOccurrances(words);
      var titlePriorityWords = this.countOccurrances(title);
      var searchTerms = this.getSearchTerms(titlePriorityWords, priorityWords);

      //concates the search terms array into a properly formatted string for the search API
      var searchTermString = "";
      for (var x = 0; x < searchTerms.length; x++) {
        if (searchTermString != "") {
          searchTermString += "%20";
        }
        searchTermString += searchTerms[x];
      }

      return searchTermString;
    },

    /* 
     * param: words - array of strings where each string is a word in a set
     * returns: a sorted array of words from a set
     */
    countOccurrances: function(words) {
      var temp = [];
      var counts = [];
      var keys = [];
      for (var x = 0; x < words.length; x++) {
        var index = temp.indexOf(words[x]);
        if (index < 0) {
          keys.push({
            'word': words[x],
            'count': 1
          });
          temp.push(words[x]);
          counts.push(1);
        } else {
          keys[index].count += 1;
          counts[index] += 1;
        }
      }
      var keysAndCounts = {
        'keys': keys,
        'counts': counts
      };
      return this.sortByCount(keysAndCounts);
    },

    /* 
     * returns a sorted array of words by the number of times each word occurrs
     * Param: kAC => keys and counts object returned from countOccurrances()
     * Returns: a sorted array of words from a set
     */
    sortByCount: function(kAC) {
      var keys = kAC.keys;
      var counts = kAC.counts;
      var tempKeys = [];
      counts.sort();
      while (counts.length > 0) {
        var nextHighest = counts.pop();
        for (var j = 0; j < keys.length; j++) {
          if (keys[j].count == nextHighest) {
            tempKeys.push(keys.splice(j, 1)[0]);
            break;
          }
        }
      }
      return tempKeys;
    },

    /*
     * param: tPW => title Priority words array
     * param: pW  => priority words array
     * returns: array of words to be queried in search
     */
    getSearchTerms: function(tPW, pW) {
      var temp = [];
      for (var x = 0; x < tPW.length; x++) {
        if (x < 5) {
          temp.push(tPW[x].word);
        } else {
          break;
        }
      }
      var keysAdded = 0;
      for (var x = 0; x < pW.length; x++) {
        if (keysAdded < 5) {
          if (temp.indexOf(pW[x].word) < 0) {
            temp.push(pW[x].word);
            keysAdded++;
          }
        } else {
          break;
        }
      }
      return temp;
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