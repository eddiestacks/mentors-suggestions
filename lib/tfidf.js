module.exports = {
  calcTF: function(termFrequencyHash, currentTerm, index, array) {
    if (!(currentTerm in termFrequencyHash)) {
      termFrequencyHash[currentTerm] = {};
      termFrequencyHash[currentTerm]["Term Frequency"] = 1;
      // termFrequencyHash[currentTerm]["Term Frequency"] = 1 / array.length;
    } else {
      termFrequencyHash[currentTerm]["Term Frequency"] += 1;
      // termFrequencyHash[currentTerm]["Term Frequency"] += 1 / array.length;
    }
    return termFrequencyHash;
  },
  tf: function(words) {
    return words.reduce(this.calcTF, {});
  },
  tfidf: function(results, context) {
    // Generate promises for all keywords and store them in dfPromises
    var that = this;
    var dfPromises = [];
    _.each(results, function(result, term, results) {
      dfPromises.push(
        context.ajax("requestDF", term).done(function(data) {
          // on completion store received data in the result object for the term
          results[term]["Document Frequency"] = data.count;
          if (data.count > 25) {
            results[term]["Inverted Document Frequency"] = that.idf(data.count);
            results[term]["TFIDF"] = results[term]["Term Frequency"] * results[term]["Inverted Document Frequency"];
          } else {
            // todo: (7) Delete from results array?
          }
        }));
    });
    // Return a master promise that resolves when all dfPromises resolve
    return context.when.apply(context, dfPromises);
  },

  // documentFrequency is the number of articles the term is found in
  idf: function(documentFrequency) {
    // totalArticleCount is the number of unique documents in KB
    // todo: (3) Remove hardcoded articleCount and pull on app load
    // Hardcoded based on api results: 17,018 as of 8/26/2014
    var totalArticleCount = 17018;
    return Math.log(totalArticleCount / documentFrequency) / Math.log(10);
    // the below algorithm handles infinite idf errors from dF being 0
    // return Math.log(totalArticleCount / (1 + documentFrequency)) / Math.log(10);
  },
  analyzeSubject: function(termLimit, context) {
    var Lexer = require('lexer.js');
    var subjectPseudophrases = Lexer.pseudoPhrase(context.ticket().subject(), context);
    var results = this.tf(subjectPseudophrases);
    // Sort the results by TFIDF
    var sorted = this.sortResults(results);
    // Get the top termLimit terms after sorting;
    console.log("Term feature values::", sorted);
    return _.first(sorted, termLimit);
  },
  analyzeDescription: function(termLimit, context) {
    var Lexer = require('lexer.js');
    var descriptionPseudophrases = Lexer.pseudoPhrase(context.ticket().description(), context);
    var results = this.tf(descriptionPseudophrases);
    // Sort the results by TFIDF
    var sorted = this.sortResults(results);
    // Get the top termLimit terms after sorting;
    console.log("Term feature values::", sorted);
    return _.first(sorted, termLimit);
  },
  sortResults: function(results) {
    //todo: return sorted results in a JSON object instead of an array
    var sortedTerms = _.keys(results).sort(function(a, b) {
      return results[b]["Term Frequency"] - results[a]["Term Frequency"]
    });
    return sortedTerms;
  },
  analyzeTicket: function(termLimit, context) {
    var Lexer = require('lexer.js');
    var subjectPseudophrases = Lexer.pseudoPhrase(context.ticket().subject(), context);
    var descriptionPseudophrases = Lexer.pseudoPhrase(context.ticket().description(), context);
    // Weight subject terms twice as much as the description terms
    var weightedPseudophrases = subjectPseudophrases.concat(subjectPseudophrases,descriptionPseudophrases);
    var results = this.tf(weightedPseudophrases);
    // Sort the results by TFIDF
    console.log("Term frequency::", results);
    var sorted = this.sortResults(results);
    // Get the top termLimit terms after sorting;
    return _.first(sorted, termLimit);
  }
};
