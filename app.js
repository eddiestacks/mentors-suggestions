(function() {

  var Lexer = require('lexer.js');
  var TFIDF = require('tfidf.js');
  return {
    defaultState: 'scaffolding',

    /* Events */
    events: {
      'app.activated': 'doSomething'
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
      requestDF: function(term) {
        return {
          url: helpers.fmt('/api/v2/search.json?per_page=%@&query=%@ type:topic', 1, term),
          type: 'GET'
        };
      }
    },

    /* Functions */
    doSomething: function() {
      var analyzePromises = this.analyzeTicket();
      var that = this;
      this.when(analyzePromises).then(function() {
        // console.log('extracted Subject terms: ', that.subjectTerms);
        // console.log('extracted Description terms: ', that.descriptionTerms);
        console.log("Search query V2::", that.subjectTerms.join(" ") + " " + that.descriptionTerms.join(" "));
      });

      var searchwords = this.getKeywords();
      console.log('Search query V1::', searchwords);
      this.ajax('fetchResults', searchwords).done(function(data) {
        for (var resInd = 0; resInd < 5; resInd++) {
          if (resInd < data.count) {
            this.$('.results').children(":eq(" + resInd + ")").find('a').text(data.results[resInd].subject);
            this.$('.results').children(":eq(" + resInd + ")").find('a').attr('href', '/agent/#/tickets/' + data.results[resInd].id);
          } else {
            this.$('.results').children(":eq(" + resInd + ")").remove();
          }
        }
      });
    },

    analyzeTicket: function() {
      // Get words array from subject and description
      var subjectPseudophrases = Lexer.pseudoPhrase(this.ticket().subject(), this);
      var descriptionPseudophrases = Lexer.pseudoPhrase(this.ticket().description(), this);
      // Calculate the feature values for terms in both the subject and description
      var descriptionPromise = TFIDF.analyzeDescription(descriptionPseudophrases, 5, this);
      var subjectPromise = TFIDF.analyzeSubject(subjectPseudophrases, 5, this);

      // todo: (4) Implement checking for an intersection and weight higher
      return this.when(descriptionPromise, subjectPromise);
    },

    getKeywords: function() {
      var words = this.ticket().description().toLowerCase().replace(/[\.,-\/#!$?%\^&\*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ").split(' ');
      var title = this.ticket().subject().toLowerCase().replace(/[\.,-\/#!$?%\^&\*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ").split(' ');
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
    }

  };

}());
