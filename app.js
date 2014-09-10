(function() {

  var TFIDF = require('tfidf.js');
  var resultList = [];
  var about = "";
  var algoVersion = 1;

  return {
    defaultState: 'loading',

    /* Events */
    events: {
      'app.activated': 'init',
      'ticket.custom_field_{{About field ID}}.changed': 'doSomething',
      'fetchResults.done': 'doneFetching',
      'fetchResultsAgain.done': 'doneFetchingAgain',
      'click .btn-v1': 'switchToV1', 
      'click .btn-v2': 'switchToV2'
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
      fetchResultsAgain: function(searchQuery){
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

    switchToV1: function() {
      this.algoVersion = 1;
      if(this.$('.btn-v2').hasClass('active')){
        this.$('.btn-v2').toggleClass('active');
        this.$('.btn-v1').toggleClass('active');
        this.switchTo('loading');
        this.doSomething();
      }
    },

    switchToV2: function() {
      this.algoVersion = 2;
      if(this.$('.btn-v1').hasClass('active')){
        this.$('.btn-v1').toggleClass('active');
        this.$('.btn-v2').toggleClass('active');
        this.switchTo('loading');
        this.doSomething();
      }
    },

    init: function() {
      this.$('.btn-v1').addClass('active');
      this.doSomething();
    },

    /* Functions */
    doSomething: function() {
      var that = this;
      var analyzePromises = this.analyzeTicket();
      var searchQuery = '';
      var aboutID = 'custom_field_' + this.setting('About field ID');
      this.about = this.ticket().customField(aboutID);
      if(this.algoVersion == 2){
      this.when(analyzePromises).then(function() {
        // console.log('extracted Subject terms: ', that.subjectTerms);
        // console.log('extracted Description terms: ', that.descriptionTerms);
        searchQuery = that.subjectTerms.join("%20") + "%20" + that.descriptionTerms.join("%20");
        console.log("Search query V2::", searchQuery);
      });
      } else {
        searchQuery = this.getKeywords();
        console.log('Search query V1::', searchQuery);
      }

      searchQuery += "%20type:ticket%20fieldvalue:" + this.about;
      searchQuery = searchQuery.replace(/%20fieldvalue:null/g, "");
      
      if(this.about == null){
            this.about = 'None selected';
      }
      this.ajax('fetchResults', searchQuery);
    },

    doneFetching: function(data) {
        this.resultList = [];
        var resCount = 0;
        for (var resInd = 0; resCount<5 && resInd<data.count; resInd++) {
            if (this.ticket().id() != data.results[resInd].id) {
                var tempLink = '/agent/#/tickets/' + data.results[resInd].id;
                var temp = {'title': data.results[resInd].subject, 'link': tempLink};
                this.resultList.push(temp);
                resCount++;
            }
        }
        if (this.resultList.length == 0){
            var query = this.getKeywords() + "%20type:ticket";
            this.about += ': no results with this filter';
            this.resultList = this.ajax('fetchResultsAgain', query);
        } else {
            this.switchTo('scaffolding', {resultList:this.resultList, aboutFilter:this.about});
        }
    },

    doneFetchingAgain: function(data) {
        this.resultList = [];
        var resCount = 0;
        for (var resInd = 0; resCount<5 && resInd<data.count; resInd++) {
            if (this.ticket().id() != data.results[resInd].id) {
                var tempLink = '/agent/#/tickets/' + data.results[resInd].id;
                var temp = {'title': data.results[resInd].subject, 'link': tempLink};
                this.resultList.push(temp);
                resCount++;
            }
        }
        if (this.resultList.length == 0){
            this.resultList.push({'title':'No relevant tickets found', 'link': '/agent/#/tickets/' + this.ticket().id()});
        }
        this.switchTo('scaffolding', {resultList:this.resultList, aboutFilter:this.about});
        return this.resultList;
    },

    analyzeTicket: function() {
      // Get words array from subject and description
      // Calculate the feature values for terms in both the subject and description
      var descriptionPromise = TFIDF.analyzeDescription(3, this);
      var subjectPromise = TFIDF.analyzeSubject(5, this);

      // todo: (4) Implement checking for intersection of terms and weight higher
      return this.when(descriptionPromise, subjectPromise);
    },

    getKeywords: function() {
      var words = this.ticket().description().toLowerCase().replace(/[\.,-\/#!$?%\^&\*;:{}=\-_`~()]/g, "").replace(/[0-9]/g,"").replace(/\s{2,}/g, " ").split(' ');
      var title = this.ticket().subject().toLowerCase().replace(/[\.,-\/#!$?%\^&\*;:{}=\-_`~()]/g, "").replace(/[0-9]/g,"").replace(/\s{2,}/g, " ").split(' ');
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
